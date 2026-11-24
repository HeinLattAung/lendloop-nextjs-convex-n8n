"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS, type Category, type Condition, errorMessage } from "@/lib/ui";
import { CATEGORY_META } from "@/components/ui";

export type ToolInput = {
  name: string;
  category: Category;
  condition: Condition;
  description: string;
};

export default function ToolForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ToolInput;
  submitLabel: string;
  onSubmit: (input: ToolInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ToolInput>(
    initial ?? { name: "", category: "power tools", condition: "good", description: "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(form);
      if (!initial) setForm({ ...form, name: "", description: "" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="label">Name</span>
        <input
          className="input"
          required
          minLength={2}
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Cordless drill"
        />
      </label>

      <div>
        <span className="label">Category</span>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => {
            const { icon: Icon, tile } = CATEGORY_META[c];
            const active = form.category === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, category: c })}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm capitalize transition ${
                  active
                    ? "border-brand-500 bg-brand-50 font-semibold text-brand-700 ring-2 ring-brand-100"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className={`flex size-6 items-center justify-center rounded-md ${tile}`}>
                  <Icon className="size-3.5" />
                </span>
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="label">Condition</span>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {CONDITIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setForm({ ...form, condition: c })}
              className={`rounded-lg py-1.5 text-sm capitalize transition ${
                form.condition === c ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label">Short description</span>
        <textarea
          className="input"
          rows={3}
          maxLength={500}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="18V, two batteries, bits included"
        />
      </label>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
