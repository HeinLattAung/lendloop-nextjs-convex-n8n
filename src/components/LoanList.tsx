"use client";

import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, ArrowRight, Bell, CalendarRange, MessageSquareText } from "lucide-react";
import type { api } from "../../convex/_generated/api";
import { STATUS_STYLE, errorMessage, formatRange, timeAgo, daysBetween } from "@/lib/ui";
import { Avatar } from "@/components/ui";

export type Loan = FunctionReturnType<typeof api.loans.myRequests>[number];

const FILTERS = ["all", "pending", "approved", "returned", "declined", "cancelled"] as const;

export default function LoanList({
  loans,
  perspective,
  actions,
  empty,
}: {
  loans: Loan[] | undefined;
  perspective: "borrower" | "lender" | "admin";
  actions?: (loan: Loan, run: (fn: () => Promise<unknown>) => void) => React.ReactNode;
  empty: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    fn().catch((err) => setError(errorMessage(err)));
  };

  if (loans === undefined) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse bg-slate-100/60" />
        ))}
      </div>
    );
  }
  if (loans.length === 0) return <>{empty}</>;

  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === "all" ? loans.length : loans.filter((l) => l.status === f).length]));
  const shown = filter === "all" ? loans : loans.filter((l) => l.status === filter);

  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1">
        {FILTERS.filter((f) => f === "all" || counts[f] > 0).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-sm capitalize transition ${
              filter === f ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {f} <span className="text-xs text-slate-400">{counts[f]}</span>
          </button>
        ))}
      </div>
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <ul className="space-y-3">
        {shown.map((l) => {
          const counterpart = perspective === "borrower" ? l.lenderName : l.borrowerName;
          return (
            <li key={l._id} className="card">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">{l.toolName}</p>
                    <span className={`chip capitalize ${STATUS_STYLE[l.status]}`}>{l.status}</span>
                    {l.overdue && (
                      <span className="chip bg-rose-50 text-rose-700 ring-1 ring-rose-200">
                        <AlertTriangle className="size-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarRange className="size-4" />
                      {formatRange(l.startDate, l.endDate)}
                      <span className="text-slate-400">· {daysBetween(l.startDate, l.endDate)}d</span>
                    </span>
                    {perspective === "admin" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={l.lenderName} className="size-5 text-[9px]" /> {l.lenderName}
                        <ArrowRight className="size-3.5" />
                        <Avatar name={l.borrowerName} className="size-5 text-[9px]" /> {l.borrowerName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={counterpart} className="size-5 text-[9px]" />
                        {perspective === "borrower" ? "Lent by " : "Requested by "}
                        {counterpart}
                      </span>
                    )}
                  </div>
                  {l.message && (
                    <p className="mt-3 flex gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <MessageSquareText className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      {l.message}
                    </p>
                  )}
                </div>
                {actions && <div className="flex shrink-0 gap-2">{actions(l, run)}</div>}
              </div>
              {l.automation.length > 0 && (
                <details className="group mt-4 border-t border-slate-100 pt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800">
                    <Bell className="size-3.5" />
                    Automation activity
                    <span className="text-slate-400">
                      · last: {l.automation[0].kind === "overdue_reminder" ? "reminder" : "notification"}{" "}
                      {l.automation[0].status} {timeAgo(l.automation[0].updatedAt)}
                    </span>
                  </summary>
                  <ol className="mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
                    {l.automation.map((a, i) => (
                      <li key={i} className="relative text-xs text-slate-600">
                        <span
                          className={`absolute top-1 -left-[21px] size-2.5 rounded-full ring-4 ring-white ${
                            a.status === "sent" ? "bg-emerald-500" : a.status === "failed" ? "bg-rose-500" : "bg-amber-400"
                          }`}
                        />
                        <span className="font-semibold capitalize">
                          {a.kind === "overdue_reminder" ? "Reminder" : "Notification"} {a.status}
                        </span>{" "}
                        <span className="text-slate-400">{timeAgo(a.updatedAt)}</span>
                        {a.detail && <p className="text-slate-500">{a.detail}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
