"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, CalendarRange, CheckCircle2, PackageSearch, Search, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { CATEGORIES, type Category, daysBetween, errorMessage, todayLocal } from "@/lib/ui";
import { Avatar, CATEGORY_META, CategoryTile, EmptyState, PageHeader, Skeleton } from "@/components/ui";

type Tool = FunctionReturnType<typeof api.tools.list>[number];

export default function BrowsePage() {
  const [category, setCategory] = useState<Category | "">("");
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const tools = useQuery(api.tools.list, category ? { category } : {});
  const [borrowing, setBorrowing] = useState<Tool | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tools ?? []).filter(
      (t) =>
        (!onlyAvailable || t.available) &&
        (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  }, [tools, search, onlyAvailable]);

  return (
    <div>
      <PageHeader title="Browse the board" subtitle="Everything your neighbors are happy to lend." />

      {sent && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" /> Request for <b>{sent}</b> sent. You&apos;ll be notified when the owner replies.
          </span>
          <Link href="/app/requests" className="font-semibold underline-offset-2 hover:underline">
            View my requests
          </Link>
        </div>
      )}

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Search drills, ladders, tents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm">
            <input
              type="checkbox"
              className="size-4 accent-brand-600"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            Available only
          </label>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            className={`chip shrink-0 px-3.5 py-1.5 text-sm transition ${
              category === "" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
            }`}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_META[c].icon;
            return (
              <button
                key={c}
                className={`chip shrink-0 px-3.5 py-1.5 text-sm capitalize transition ${
                  category === c ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"
                }`}
                onClick={() => setCategory(c)}
              >
                <Icon className="size-3.5" /> {c}
              </button>
            );
          })}
        </div>
      </div>

      {tools === undefined ? (
        <Skeleton rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No tools match"
          body="Try another category or search term, or list one of your own."
          action={
            <Link href="/app/listings" className="btn-primary">
              List a tool
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <li
              key={t._id}
              className="card flex flex-col transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-start gap-3">
                <CategoryTile category={t.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {t.category} · {t.condition}
                  </p>
                </div>
                <span
                  className={`chip ${
                    t.available
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${t.available ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {t.available ? "Available" : "On loan"}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-600">
                {t.description || <span className="text-slate-400">No description</span>}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                  <Avatar name={t.ownerFirstName} />
                  <span className="truncate">{t.isMine ? "You" : t.ownerFirstName}</span>
                  {t.ownerTrusted && (
                    <span title="Trusted Lender" className="text-brand-600">
                      <BadgeCheck className="size-4" />
                    </span>
                  )}
                </span>
                {t.isMine ? (
                  <Link href="/app/listings" className="btn-ghost px-2.5 py-1.5">
                    Manage
                  </Link>
                ) : (
                  <button className="btn-primary px-3 py-1.5" onClick={() => setBorrowing(t)}>
                    Borrow
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {borrowing && (
        <BorrowDialog
          tool={borrowing}
          onClose={() => setBorrowing(null)}
          onSent={() => {
            setSent(borrowing.name);
            setBorrowing(null);
          }}
        />
      )}
    </div>
  );
}

function BorrowDialog({ tool, onClose, onSent }: { tool: Tool; onClose: () => void; onSent: () => void }) {
  const request = useMutation(api.loans.request);
  const today = todayLocal();
  const [startDate, setStart] = useState(today);
  const [endDate, setEnd] = useState(today);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const days = startDate && endDate && endDate >= startDate ? daysBetween(startDate, endDate) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request({ toolId: tool._id, startDate, endDate, message: message || undefined });
      onSent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start gap-3">
          <CategoryTile category={tool.category} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Borrow request</p>
            <h2 className="truncate text-lg font-bold">{tool.name}</h2>
            <p className="text-sm text-slate-500">from {tool.ownerFirstName}</p>
          </div>
          <button type="button" className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">From</span>
            <input type="date" className="input" min={today} value={startDate} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label>
            <span className="label">Until</span>
            <input type="date" className="input" min={startDate} value={endDate} onChange={(e) => setEnd(e.target.value)} required />
          </label>
        </div>
        {days > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarRange className="size-3.5" /> {days} day{days === 1 ? "" : "s"}
          </p>
        )}
        <label className="mt-4 block">
          <span className="label">Note to {tool.ownerFirstName} (optional)</span>
          <textarea
            className="input"
            rows={3}
            maxLength={300}
            placeholder="What's it for? When can you pick it up?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
