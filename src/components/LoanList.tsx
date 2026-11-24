"use client";

import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { STATUS_STYLE, errorMessage, timeAgo } from "@/lib/ui";

export type Loan = FunctionReturnType<typeof api.loans.myRequests>[number];

export default function LoanList({
  loans,
  perspective,
  actions,
  empty,
}: {
  loans: Loan[] | undefined;
  perspective: "borrower" | "lender" | "admin";
  actions?: (loan: Loan, run: (fn: () => Promise<unknown>) => void) => React.ReactNode;
  empty: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    fn().catch((err) => setError(errorMessage(err)));
  };

  if (loans === undefined) return <p className="text-stone-500">Loading…</p>;
  if (loans.length === 0) return <p className="card text-stone-500">{empty}</p>;

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <ul className="space-y-3">
        {loans.map((l) => (
          <li key={l._id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {l.toolName}
                  <span className={`badge ml-2 capitalize ${STATUS_STYLE[l.status]}`}>{l.status}</span>
                  {l.overdue && <span className="badge ml-2 bg-red-100 text-red-800">Overdue</span>}
                </p>
                <p className="text-sm text-stone-500">
                  {l.startDate} → {l.endDate}
                  {perspective !== "borrower" && <> · borrower: {l.borrowerName}{l.borrowerEmail && ` (${l.borrowerEmail})`}</>}
                  {perspective !== "lender" && <> · lender: {l.lenderName}{l.lenderEmail && ` (${l.lenderEmail})`}</>}
                </p>
                {l.message && <p className="mt-1 text-sm text-stone-700">&ldquo;{l.message}&rdquo;</p>}
              </div>
              {actions && <div className="flex gap-2">{actions(l, run)}</div>}
            </div>
            {l.automation.length > 0 && (
              <ul className="mt-3 space-y-0.5 border-t border-stone-100 pt-2 text-xs text-stone-500">
                {l.automation.map((a, i) => (
                  <li key={i}>
                    <span
                      className={
                        a.status === "sent" ? "text-emerald-700" : a.status === "failed" ? "text-red-700" : "text-amber-700"
                      }
                    >
                      ●
                    </span>{" "}
                    {a.kind === "overdue_reminder" ? "Reminder" : "Notification"} {a.status} {timeAgo(a.updatedAt)}
                    {a.detail && <> · {a.detail}</>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
