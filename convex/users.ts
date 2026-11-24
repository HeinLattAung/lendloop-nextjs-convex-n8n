import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getCurrentUser } from "./lib/auth";

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Upserts the signed-in user from their verified Clerk token. The role is
 * decided server-side from the ADMIN_EMAILS env var, never by the client.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not signed in.");
    const email = (identity.email ?? "").toLowerCase();
    // The "convex" JWT template must include name and email claims (see README).
    const name = identity.name || identity.givenName || email.split("@")[0] || "Neighbor";
    const role = email && adminEmails().has(email) ? "admin" : "user";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) {
      if (existing.name !== name || existing.email !== email || existing.role !== role) {
        await ctx.db.patch(existing._id, { name, email, role });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role,
      trustedLender: false,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return { _id: user._id, name: user.name, role: user.role, trustedLender: user.trustedLender };
  },
});
