"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CATEGORIES, type Category, errorMessage, todayLocal } from "@/lib/ui";

export default function BrowsePage() {
  const [category, setCategory] = useState<Category | "">("");
  const tools = useQuery(api.tools.list, category ? { category } : {});
  const [borrowing, setBorrowing] = useState<Id<"tools"> | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={category === "" ? "btn-primary" : "btn-secondary"}
          onClick={() => setCategory("")}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`${category === c ? "btn-primary" : "btn-secondary"} capitalize`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {tools === undefined ? (
        <p className="text-stone-500">Loading…</p>
      ) : tools.length === 0 ? (
        <p className="card text-stone-500">No tools in this category yet.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {tools.map((t) => (
            <li key={t._id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-stone-500 capitalize">
                    {t.category} · {t.condition} condition
                  </p>
                </div>
                <span
                  className={`badge ${t.available ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                >
                  {t.available ? "Available" : "On loan"}
                </span>
              </div>
              {t.description && <p className="mt-2 text-sm text-stone-700">{t.description}</p>}
              <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
                <span>
                  {t.isMine ? "Your listing" : `Lent by ${t.ownerFirstName}`}
                  {t.ownerTrusted && (
                    <span className="badge ml-2 bg-emerald-50 text-emerald-700">Trusted Lender</span>
                  )}
                </span>
                {!t.isMine && borrowing !== t._id && (
                  <button className="btn-secondary" onClick={() => setBorrowing(t._id)}>
                    Request to borrow
                  </button>
                )}
              </div>
              {borrowing === t._id && <BorrowForm toolId={t._id} onDone={() => setBorrowing(null)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BorrowForm({ toolId, onDone }: { toolId: Id<"tools">; onDone: () => void }) {
  const request = useMutation(api.loans.request);
  const today = todayLocal();
  const [startDate, setStart] = useState(today);
  const [endDate, setEnd] = useState(today);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await request({ toolId, startDate, endDate, message: message || undefined });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 border-t border-stone-100 pt-3">
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
      <label className="block">
        <span className="label">Note to the lender (optional)</span>
        <input className="input" maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>
          Send request
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
