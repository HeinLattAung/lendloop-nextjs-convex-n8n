# LendLoop

> Borrow what you need. Lend what you don't.

A neighborhood tool-lending board. Neighbors list tools, request to borrow them for a date range, approve or decline requests on their own tools, and mark loans as returned. n8n handles notifications and daily overdue reminders.

**Stack:** Next.js 15 (App Router) · TypeScript · Clerk (auth) · Convex (data + backend logic) · n8n (self-hosted via Docker) · Tailwind CSS 4

---

## Features

| Area | What it does |
|---|---|
| Public page | Tagline, read-only list of **available** tools (name + category only, no owner data), "Sign in to lend or borrow" (Clerk). |
| Browse | All tools with availability status, filterable by category. Request to borrow for a date range with an optional note. |
| My listings | Create, edit and delete your own tools (name, category, condition, description). |
| My requests | Your borrow requests and their status; cancel while pending. |
| Incoming requests | Approve or decline requests for your tools; mark approved loans as returned. |
| Admin | Remove any listing, view all loans, toggle **Trusted Lender** on members. |
| Automation activity *(bonus)* | Every loan shows its automation history, e.g. "Reminder sent 2 days ago" or "Notification pending, attempt 1 failed, retrying". |

## Architecture

```
 Browser ──(Clerk session)──► Next.js (UI only)
    │
    └──(Clerk JWT, websocket)──► Convex queries/mutations ── RBAC enforced here
                                    │
                                    │ scheduler.runAfter(0)  (after the transaction commits)
                                    ▼
                         internal action sendLoanEvent ──HMAC-signed POST──► n8n "Loan notification"
                            (retries 30s/1m/2m/4m)                            verify sig → dedupe → notify → 200

 n8n "Overdue reminders" (daily 09:00)
    ── signed GET  ──► Convex HTTP /n8n/overdue-loans     (only loans not yet reminded today)
    ── notify each borrower
    ── signed POST ──► Convex HTTP /n8n/reminder-status   (idempotent write-back)

 Any workflow failure ──► n8n "Error handler" workflow (alert) + failed execution kept in n8n
```

### Data model (`convex/schema.ts`)

- `users`: Clerk `tokenIdentifier`, name, email, `role` (`admin` | `user`), `trustedLender`
- `tools`: owner, name, category, condition, description, `onLoan` (denormalized for fast public listing and filters)
- `loans`: tool, lender, borrower, `startDate`/`endDate` (`YYYY-MM-DD`), `status` (`pending` → `approved` | `declined` | `cancelled`; `approved` → `returned`)
- `automationEvents`: audit trail per loan, unique `idempotencyKey`, status `pending` | `sent` | `failed`, attempts

### Roles and access control

RBAC is enforced **in Convex functions**. The UI only hides buttons; it is not the security boundary.

- Identity always comes from the verified Clerk JWT (`ctx.auth.getUserIdentity()`). No function accepts a user id from the client.
- The `admin` role is assigned server-side from the `ADMIN_EMAILS` Convex env var each time the user record is refreshed. It can't be self-assigned.
- `tools.update`: owner only. `tools.remove`: owner, or admin (admins can remove any listing).
- `loans.respond` / `loans.markReturned`: lender (the tool's owner) only. `loans.cancel`: the borrower only.
- `loans.request`: signed-in, not your own tool, valid dates, no past start, no overlap with an approved loan, one pending request per tool.
- `loans.all`, `admin.*`: admin only.
- Participants see each other's **names**; only admins see email addresses.

All of these rules were exercised against a local deployment (see *Testing* below).

## Local setup

Prerequisites: Node 20+, Docker Desktop, a free [Clerk](https://clerk.com) application.

```bash
npm install
```

### 1. Clerk

1. Create an application in the Clerk dashboard and copy the API keys into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
2. Enable the **Convex** integration (Clerk dashboard → Integrations → Convex), or create a JWT template named `convex`. Copy the **Frontend API URL** (the issuer, e.g. `https://xxx.clerk.accounts.dev`).

### 2. Convex

```bash
npx convex dev            # pick a local deployment (or a cloud project); writes NEXT_PUBLIC_CONVEX_URL to .env.local
```

In a second terminal, set the deployment's environment variables:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://xxx.clerk.accounts.dev
npx convex env set ADMIN_EMAILS you@example.com
npx convex env set N8N_SHARED_SECRET <64-hex-chars>      # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx convex env set N8N_LOAN_WEBHOOK_URL http://localhost:5678/webhook/lendloop-loan-event
```

> **Networking note:** Convex must be able to reach the n8n webhook, and n8n must be able to reach Convex.
> With a **local** Convex deployment both run on your machine, so the URLs above work as-is.
> With a **cloud** deployment, expose n8n through a tunnel (e.g. `cloudflared tunnel --url http://localhost:5678`) or use n8n Cloud, and set `N8N_LOAN_WEBHOOK_URL` to that public URL.

### 3. n8n

```bash
cp .env.n8n.example .env.n8n     # set LENDLOOP_SHARED_SECRET (same value as N8N_SHARED_SECRET) and CONVEX_SITE_URL
docker compose up -d
# import the three workflows (on Git Bash for Windows, prefix with MSYS_NO_PATHCONV=1)
docker compose exec n8n n8n import:workflow --separate --input=/workflows
docker compose exec n8n n8n update:workflow --id=LendLoopNotify01 --active=true
docker compose exec n8n n8n update:workflow --id=LendLoopOverdue1 --active=true
docker compose restart n8n
```

Open http://localhost:5678 to see the workflows and their executions. The exported workflow JSON lives in [`n8n/workflows/`](n8n/workflows).

### 4. Run the app

```bash
npm run dev     # http://localhost:3000
```

Sign in with the email listed in `ADMIN_EMAILS` to get the **Admin** tab.

### Environment variables

| Where | Name | Purpose |
|---|---|---|
| `.env.local` | `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT` | Written by `npx convex dev` |
| `.env.local` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk keys |
| Convex env | `CLERK_JWT_ISSUER_DOMAIN` | Clerk issuer used to validate JWTs |
| Convex env | `ADMIN_EMAILS` | Comma-separated admin emails |
| Convex env | `N8N_SHARED_SECRET` | HMAC secret shared with n8n (≥ 32 chars) |
| Convex env | `N8N_LOAN_WEBHOOK_URL` | n8n "Loan notification" webhook URL |
| `.env.n8n` | `LENDLOOP_SHARED_SECRET` | Same HMAC secret, read by n8n Code nodes via `$env` |
| `.env.n8n` | `CONVEX_SITE_URL` | Convex HTTP actions URL as seen from the n8n container |

`.env.local` and `.env.n8n` are git-ignored. Only the `*.example` templates are committed.

## n8n workflows

### 1. Loan notification (`lendloop-loan-notification.json`)

`Webhook → Verify signature → valid? → Build message (dedupe) → Send notification (mock) → 200` (invalid → `401`)

- Triggered by Convex whenever a request is **created, approved, declined, cancelled** or a loan is **returned**. The recipient is the lender or the borrower, depending on the event.
- Convex sends only what the message needs: event, tool name, dates, and the **recipient's** first name and email. It never sends the other party's details.
- **Delivery** is mocked as a log line, which the brief allows. Swap the *Send notification (mock)* node for Send Email, Slack or Discord with an n8n credential to go live.

### 2. Overdue reminders (`lendloop-overdue-reminders.json`)

`Schedule (daily 09:00) → Sign → GET /n8n/overdue-loans → split → Send reminder (mock) → Sign → POST /n8n/reminder-status`

- Convex returns approved, unreturned loans past their `endDate` that have **not** already had today's reminder.
- Each reminder has a key `overdue:<loanId>:<YYYY-MM-DD>`. The write-back is idempotent on that key: a retried POST returns `{ duplicate: true }` and creates nothing.
- A delivery error for one borrower is written back as `failed` instead of aborting the whole run.
- Both HTTP nodes retry 3 times, 5 seconds apart.

### 3. Error handler (`lendloop-error-handler.json`)

Set as the `errorWorkflow` of both workflows above. It runs whenever a workflow fails after its retries and emits an alert (mocked as `console.error`, with the workflow name, failed node, error and execution link). Failed executions are also kept (`saveDataErrorExecution: all`), so nothing fails silently.

## Security and data-minimization decisions

- **Signed in both directions.** Every Convex → n8n and n8n → Convex request carries `x-lendloop-timestamp` and `x-lendloop-signature = hex(HMAC-SHA256(secret, "<timestamp>.<raw body>"))`.
  - Requests older than 5 minutes are rejected, which limits replay.
  - Signatures are compared in constant time (`timingSafeEqual` in n8n, a constant-time loop in Convex).
  - Unsigned, tampered or stale requests get `401`.
- **Secrets stay out of code and exports.** The HMAC secret lives in Convex env and `.env.n8n`, and n8n reads it via `$env`. No secret appears in the workflow JSON or the repository.
- **The n8n-facing HTTP endpoints are minimal.** They expose only the two operations the workflows need and only the fields required. The write-back validates the body shape, caps its size and checks the reminder key belongs to that loan.
- **Idempotency everywhere it matters.**
  - Notification events have a stable `eventId`, which n8n deduplicates in workflow static data.
  - Convex never downgrades an event that is already `sent`.
  - Reminder write-backs are keyed per loan per day.
- **Retries with backoff.** Convex retries webhook delivery at 30 seconds, 1, 2 and 4 minutes, then marks the event `failed`. Every state is visible on the loan in the UI.
- **Least exposure in the UI.** The public page shows tool name and category only. Members see first names and a Trusted Lender badge. Only admins see emails.
- **Server-side validation.** Lengths, dates (no past starts, end ≥ start), no self-borrowing, no overlapping approved loans, and one pending request per tool per borrower.

## Testing

Run against a local Convex deployment and the Dockerized n8n:

- **RBAC.** All of the following are rejected server-side:
  - an anonymous user creating a tool
  - editing or deleting someone else's tool
  - borrowing your own tool
  - a start date in the past
  - a borrower approving their own request
  - a non-admin calling admin queries
  - an overlapping booking
- **Notification flow.** Request → approve produced two `sent` notification events on the loan. A replayed webhook returned `duplicate`. Bad or stale signatures returned `401`.
- **Retry.** With n8n stopped, the event showed `pending … retrying`. After restarting n8n it became `sent`.
- **Overdue workflow.** A backdated loan got one reminder written back as `sent`. A second run sent nothing. A repeated write-back returned `duplicate: true`. A reminder key for another loan was rejected.

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## What I'd change for production

- **Real delivery:** replace the mock nodes with transactional email (e.g. SES or Postmark) and Slack, using n8n credentials. Add per-user notification preferences and an unsubscribe link.
- **Hosting:**
  - Convex cloud production deployment and Vercel for Next.js.
  - n8n behind HTTPS with queue mode (Redis plus workers), Postgres instead of SQLite, and external task runners.
  - Basic auth/SSO on the n8n editor, and webhook paths that are hard to guess.
- **Secrets:** a secret manager, plus rotation support for two active HMAC secrets so the key can be rotated without downtime.
- **Reliability:**
  - Move the n8n dedupe store from workflow static data to Redis or the database.
  - Add a dead-letter view in the admin UI for `failed` automation events, with a "retry now" button.
  - Alert on failure rates.
- **Abuse protection:** rate limits on request creation, plus moderation and audit logs for admin actions.
- **Time zones:** dates are stored as plain `YYYY-MM-DD` and compared in UTC. Production would store the neighborhood's time zone and compute "overdue" in it.
- **Tests:** a Convex unit test suite (`convex-test`), Playwright end-to-end tests for the main flows, and CI that also lints the exported workflow JSON for secrets.
- **Data retention:** purge returned loans and automation events after N months, and support account deletion that anonymizes loan history.
