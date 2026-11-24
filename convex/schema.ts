import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const CATEGORIES = [
  "power tools",
  "hand tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "other",
] as const;

export const category = v.union(...CATEGORIES.map((c) => v.literal(c)));
export const condition = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);
export const role = v.union(v.literal("admin"), v.literal("user"));
export const loanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

export default defineSchema({
  users: defineTable({
    // Clerk identity (subject + issuer). Never trust an id sent by the client.
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role,
    trustedLender: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
    // Denormalised so the public list and filters don't need to scan loans.
    onLoan: v.boolean(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  loans: defineTable({
    toolId: v.id("tools"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD, inclusive
    status: loanStatus,
    message: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status_end", ["status", "endDate"]),

  // Audit trail of every automation run touching a loan. The idempotency key
  // makes n8n retries safe: the same key can only ever create one row.
  automationEvents: defineTable({
    loanId: v.id("loans"),
    kind: v.union(v.literal("notification"), v.literal("overdue_reminder")),
    idempotencyKey: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    attempts: v.number(),
    detail: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_key", ["idempotencyKey"])
    .index("by_loan", ["loanId"]),
});
