import { internalAction, internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { v, type Infer } from "convex/values";
import { internal } from "./_generated/api";
import { signBody, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "./lib/signing";
import { firstName } from "./lib/auth";
import { todayUtc } from "./loans";

const MAX_ATTEMPTS = 5;

// Who gets told about each event. Only that person's first name + email leave Convex.
const RECIPIENT: Record<string, "lender" | "borrower"> = {
  request_created: "lender",
  request_cancelled: "lender",
  request_approved: "borrower",
  request_declined: "borrower",
  loan_returned: "borrower",
};

export const buildLoanEvent = internalQuery({
  args: { loanId: v.id("loans"), event: v.string() },
  handler: async (ctx, { loanId, event }) => {
    const loan = await ctx.db.get(loanId);
    const who = RECIPIENT[event];
    if (!loan || !who) return null;
    const tool = await ctx.db.get(loan.toolId);
    const recipient = await ctx.db.get(who === "lender" ? loan.lenderId : loan.borrowerId);
    if (!recipient) return null;
    return {
      eventId: `notify:${loanId}:${event}`,
      event,
      loanId,
      toolName: tool?.name ?? "a tool",
      startDate: loan.startDate,
      endDate: loan.endDate,
      recipient: { role: who, firstName: firstName(recipient), email: recipient.email },
    };
  },
});

const eventArgs = {
  loanId: v.id("loans"),
  kind: v.union(v.literal("notification"), v.literal("overdue_reminder")),
  idempotencyKey: v.string(),
  status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
  detail: v.optional(v.string()),
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used for its inferred type
const eventValidator = v.object(eventArgs);

async function upsert(ctx: MutationCtx, args: Infer<typeof eventValidator>) {
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) {
      // Once delivered, a retry can never downgrade or duplicate the record.
      if (existing.status === "sent") return { duplicate: true, status: existing.status };
      await ctx.db.patch(existing._id, {
        status: args.status,
        detail: args.detail,
        attempts: existing.attempts + 1,
        updatedAt: Date.now(),
      });
      return { duplicate: false, status: args.status };
    }
  await ctx.db.insert("automationEvents", { ...args, attempts: 1, updatedAt: Date.now() });
  return { duplicate: false, status: args.status };
}

export const upsertEvent = internalMutation({ args: eventArgs, handler: upsert });

/** POST a signed loan event to the n8n webhook, retrying with backoff on failure. */
export const sendLoanEvent = internalAction({
  args: { loanId: v.id("loans"), event: v.string(), attempt: v.number() },
  handler: async (ctx, { loanId, event, attempt }) => {
    const payload = await ctx.runQuery(internal.automation.buildLoanEvent, { loanId, event });
    if (!payload) return;
    const record = (status: "pending" | "sent" | "failed", detail: string) =>
      ctx.runMutation(internal.automation.upsertEvent, {
        loanId,
        kind: "notification",
        idempotencyKey: payload.eventId,
        status,
        detail,
      });

    const url = process.env.N8N_LOAN_WEBHOOK_URL;
    if (!url) {
      await record("failed", `${event}: N8N_LOAN_WEBHOOK_URL is not set`);
      return;
    }

    const body = JSON.stringify(payload);
    let problem: string;
    try {
      const { timestamp, signature } = await signBody(body);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [TIMESTAMP_HEADER]: timestamp,
          [SIGNATURE_HEADER]: signature,
          "x-lendloop-event-id": payload.eventId,
        },
        body,
      });
      if (res.ok) {
        await record("sent", `${event}: ${payload.recipient.role} notified`);
        return;
      }
      problem = `HTTP ${res.status}`;
    } catch (err) {
      problem = err instanceof Error ? err.message : String(err);
    }

    if (attempt < MAX_ATTEMPTS) {
      const delayMs = 30_000 * 2 ** (attempt - 1); // 30s, 1m, 2m, 4m
      await record("pending", `${event}: attempt ${attempt} failed (${problem}), retrying`);
      await ctx.scheduler.runAfter(delayMs, internal.automation.sendLoanEvent, {
        loanId,
        event,
        attempt: attempt + 1,
      });
    } else {
      await record("failed", `${event}: gave up after ${attempt} attempts (${problem})`);
    }
  },
});

/** Approved, unreturned loans past their end date that haven't had today's reminder. */
export const overdueLoans = internalQuery({
  args: {},
  handler: async (ctx) => {
    const today = todayUtc();
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_end", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(500);
    const out = [];
    for (const loan of loans) {
      const reminderKey = `overdue:${loan._id}:${today}`;
      const done = await ctx.db
        .query("automationEvents")
        .withIndex("by_key", (q) => q.eq("idempotencyKey", reminderKey))
        .unique();
      if (done?.status === "sent") continue;
      const [tool, borrower] = await Promise.all([ctx.db.get(loan.toolId), ctx.db.get(loan.borrowerId)]);
      if (!borrower) continue;
      out.push({
        loanId: loan._id,
        reminderKey,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        borrower: { firstName: firstName(borrower), email: borrower.email },
      });
    }
    return out;
  },
});

/** Write-back from the n8n overdue workflow. Idempotent on reminderKey. */
export const recordReminder = internalMutation({
  args: {
    loanId: v.id("loans"),
    reminderKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> => {
    const loan = await ctx.db.get(args.loanId);
    if (!loan) return { ok: false, error: "unknown loan" };
    if (!new RegExp(`^overdue:${args.loanId}:\\d{4}-\\d{2}-\\d{2}$`).test(args.reminderKey)) {
      return { ok: false, error: "reminderKey does not match loan" };
    }
    const result = await upsert(ctx, {
      loanId: args.loanId,
      kind: "overdue_reminder",
      idempotencyKey: args.reminderKey,
      status: args.status,
      detail: (args.detail ?? (args.status === "sent" ? "Overdue reminder sent" : "Reminder failed")).slice(0, 200),
    });
    return { ok: true, duplicate: result.duplicate };
  },
});
