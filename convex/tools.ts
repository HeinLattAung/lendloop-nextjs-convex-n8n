import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { category, condition } from "./schema";
import { getCurrentUser, isAdmin, requireUser } from "./lib/auth";
import type { Doc } from "./_generated/dataModel";

const LIMITS = { name: 80, description: 500 };

function clean(input: { name: string; description: string }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > LIMITS.name) {
    throw new ConvexError(`Name must be 2-${LIMITS.name} characters.`);
  }
  if (description.length > LIMITS.description) {
    throw new ConvexError(`Description must be at most ${LIMITS.description} characters.`);
  }
  return { name, description };
}

/** Public, unauthenticated: name and category only, never owner details. */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").order("desc").take(200);
    return tools
      .filter((t) => !t.onLoan)
      .map((t) => ({ _id: t._id, name: t.name, category: t.category }));
  },
});

/** Signed-in browse view, optionally filtered by category. */
export const list = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const tools = args.category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .order("desc")
          .take(200)
      : await ctx.db.query("tools").order("desc").take(200);

    const owners = new Map<string, Doc<"users"> | null>();
    return Promise.all(
      tools.map(async (t) => {
        if (!owners.has(t.ownerId)) owners.set(t.ownerId, await ctx.db.get(t.ownerId));
        const owner = owners.get(t.ownerId);
        return {
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          description: t.description,
          available: !t.onLoan,
          isMine: t.ownerId === me._id,
          // Borrowers see a first name and trust badge, not an email address.
          ownerFirstName: owner ? owner.name.split(" ")[0] : "Unknown",
          ownerTrusted: owner?.trustedLender ?? false,
        };
      }),
    );
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [];
    return await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", me._id))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string(), category, condition, description: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const { name, description } = clean(args);
    return await ctx.db.insert("tools", {
      ownerId: me._id,
      name,
      category: args.category,
      condition: args.condition,
      description,
      onLoan: false,
    });
  },
});

/** Owners only. Admins moderate by removing, not by editing other people's listings. */
export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");
    if (tool.ownerId !== me._id) throw new ConvexError("You can only edit your own listings.");
    const { name, description } = clean(args);
    await ctx.db.patch(tool._id, {
      name,
      category: args.category,
      condition: args.condition,
      description,
    });
  },
});

/** Owner deletes their own listing; admin can remove any listing. */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new ConvexError("Tool not found.");
    if (tool.ownerId !== me._id && !isAdmin(me)) {
      throw new ConvexError("You can only delete your own listings.");
    }
    if (tool.onLoan && !isAdmin(me)) {
      throw new ConvexError("This tool is on loan. Mark it returned before deleting.");
    }
    // Close out open requests so nobody is left waiting on a deleted tool.
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", tool._id))
      .collect();
    for (const loan of loans) {
      if (loan.status === "pending") {
        await ctx.db.patch(loan._id, { status: "cancelled", decidedAt: Date.now() });
      }
    }
    await ctx.db.delete(tool._id);
  },
});
