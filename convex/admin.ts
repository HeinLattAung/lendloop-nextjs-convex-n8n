import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib/auth";

export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(500);
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      trustedLender: u.trustedLender,
    }));
  },
});

export const listings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const tools = await ctx.db.query("tools").order("desc").take(500);
    return Promise.all(
      tools.map(async (t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
        onLoan: t.onLoan,
        ownerName: (await ctx.db.get(t.ownerId))?.name ?? "Unknown",
      })),
    );
  },
});

export const setTrusted = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found.");
    await ctx.db.patch(user._id, { trustedLender: args.trusted });
  },
});
