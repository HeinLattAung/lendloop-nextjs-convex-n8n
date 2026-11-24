import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { isAdmin, requireAdmin, requireUser } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function validDate(s: string) {
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

const overlaps = (a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }) =>
  a.startDate <= b.endDate && b.startDate <= a.endDate;

async function activeLoans(ctx: QueryCtx | MutationCtx, toolId: Id<"tools">) {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_tool", (q) => q.eq("toolId", toolId))
    .collect();
  return loans.filter((l) => l.status === "approved");
}

async function refreshOnLoan(ctx: MutationCtx, toolId: Id<"tools">) {
  const tool = await ctx.db.get(toolId);
  if (!tool) return;
  const onLoan = (await activeLoans(ctx, toolId)).length > 0;
  if (tool.onLoan !== onLoan) await ctx.db.patch(toolId, { onLoan });
}

/** Queue an n8n notification. Runs after the transaction commits. */
async function notify(ctx: MutationCtx, loanId: Id<"loans">, event: string) {
  await ctx.scheduler.runAfter(0, internal.automation.sendLoanEvent, {
    loanId,
    event,
    attempt: 1,
  });
}

export const request = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");
    if (tool.ownerId === me._id) throw new ConvexError("You can't borrow your own tool.");
    if (!validDate(args.startDate) || !validDate(args.endDate)) {
      throw new ConvexError("Dates must be valid YYYY-MM-DD values.");
    }
    if (args.startDate < todayUtc()) throw new ConvexError("Start date can't be in the past.");
    if (args.endDate < args.startDate) throw new ConvexError("End date must be on or after the start date.");
    const message = args.message?.trim().slice(0, 300) || undefined;

    const existing = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", me._id))
      .collect();
    if (existing.some((l) => l.toolId === tool._id && l.status === "pending")) {
      throw new ConvexError("You already have a pending request for this tool.");
    }
    if ((await activeLoans(ctx, tool._id)).some((l) => overlaps(l, args))) {
      throw new ConvexError("The tool is already booked for some of those dates.");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId: tool._id,
      lenderId: tool.ownerId,
      borrowerId: me._id,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      message,
    });
    await notify(ctx, loanId, "request_created");
    return loanId;
  },
});

/** Lender approves or declines a pending request on their own tool. */
export const respond = mutation({
  args: { loanId: v.id("loans"), decision: v.union(v.literal("approved"), v.literal("declined")) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Request not found.");
    if (loan.lenderId !== me._id) throw new ConvexError("Only the tool's owner can respond.");
    if (loan.status !== "pending") throw new ConvexError(`This request is already ${loan.status}.`);
    if (args.decision === "approved") {
      const clash = (await activeLoans(ctx, loan.toolId)).some((l) => overlaps(l, loan));
      if (clash) throw new ConvexError("Those dates now overlap another approved loan.");
    }
    await ctx.db.patch(loan._id, { status: args.decision, decidedAt: Date.now() });
    await refreshOnLoan(ctx, loan.toolId);
    await notify(ctx, loan._id, `request_${args.decision}`);
  },
});

/** Borrower withdraws their own pending request. */
export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Request not found.");
    if (loan.borrowerId !== me._id) throw new ConvexError("You can only cancel your own requests.");
    if (loan.status !== "pending") throw new ConvexError("Only pending requests can be cancelled.");
    await ctx.db.patch(loan._id, { status: "cancelled", decidedAt: Date.now() });
    await notify(ctx, loan._id, "request_cancelled");
  },
});

/** The lender confirms the tool came back (they are the one who can verify it). */
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError("Loan not found.");
    if (loan.lenderId !== me._id) throw new ConvexError("Only the tool's owner can mark it returned.");
    if (loan.status !== "approved") throw new ConvexError("Only approved loans can be returned.");
    await ctx.db.patch(loan._id, { status: "returned", returnedAt: Date.now() });
    await refreshOnLoan(ctx, loan.toolId);
    await notify(ctx, loan._id, "loan_returned");
  },
});

async function withDetails(ctx: QueryCtx, loans: Doc<"loans">[], viewer: Doc<"users">) {
  const today = todayUtc();
  return Promise.all(
    loans.map(async (l) => {
      const [tool, lender, borrower, events] = await Promise.all([
        ctx.db.get(l.toolId),
        ctx.db.get(l.lenderId),
        ctx.db.get(l.borrowerId),
        ctx.db
          .query("automationEvents")
          .withIndex("by_loan", (q) => q.eq("loanId", l._id))
          .order("desc")
          .take(5),
      ]);
      const admin = isAdmin(viewer);
      return {
        _id: l._id,
        _creationTime: l._creationTime,
        toolName: tool?.name ?? "Deleted tool",
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        message: l.message,
        overdue: l.status === "approved" && l.endDate < today,
        lenderName: lender?.name ?? "Unknown",
        borrowerName: borrower?.name ?? "Unknown",
        // Only admins see email addresses; participants see names.
        lenderEmail: admin ? lender?.email : undefined,
        borrowerEmail: admin ? borrower?.email : undefined,
        automation: events.map((e) => ({
          kind: e.kind,
          status: e.status,
          detail: e.detail,
          updatedAt: e.updatedAt,
        })),
      };
    }),
  );
}

export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", me._id))
      .order("desc")
      .take(100);
    return withDetails(ctx, loans, me);
  },
});

export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", me._id))
      .order("desc")
      .take(100);
    return withDetails(ctx, loans, me);
  },
});

export const all = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").order("desc").take(300);
    return withDetails(ctx, loans, me);
  },
});
