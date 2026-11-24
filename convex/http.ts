import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { verifyRequest } from "./lib/signing";

// Endpoints called by n8n. Every request must carry a fresh HMAC signature
// (see lib/signing.ts); there is no other way in, and they only expose the
// minimum fields the workflows need.

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const http = httpRouter();

// GET: n8n signs `${timestamp}.` (empty body).
http.route({
  path: "/n8n/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const check = await verifyRequest(req.headers, "");
    if (!check.ok) return json(401, { error: check.reason });
    const loans = await ctx.runQuery(internal.automation.overdueLoans, {});
    return json(200, { loans });
  }),
});

http.route({
  path: "/n8n/reminder-status",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.text();
    if (body.length > 10_000) return json(413, { error: "body too large" });
    const check = await verifyRequest(req.headers, body);
    if (!check.ok) return json(401, { error: check.reason });

    let data: { loanId?: unknown; reminderKey?: unknown; status?: unknown; detail?: unknown };
    try {
      data = JSON.parse(body);
    } catch {
      return json(400, { error: "invalid JSON" });
    }
    if (
      typeof data.loanId !== "string" ||
      typeof data.reminderKey !== "string" ||
      (data.status !== "sent" && data.status !== "failed")
    ) {
      return json(400, { error: "loanId, reminderKey and status (sent|failed) are required" });
    }
    try {
      const result = await ctx.runMutation(internal.automation.recordReminder, {
        loanId: data.loanId as Id<"loans">,
        reminderKey: data.reminderKey,
        status: data.status,
        detail: typeof data.detail === "string" ? data.detail : undefined,
      });
      return json(result.ok ? 200 : 400, result);
    } catch {
      // e.g. a malformed id fails validation
      return json(400, { error: "invalid loanId" });
    }
  }),
});

export default http;
