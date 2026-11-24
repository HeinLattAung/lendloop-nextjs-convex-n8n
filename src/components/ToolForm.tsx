"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS, type Category, type Condition, errorMessage } from "@/lib/ui";

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
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-1">
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
        <label>
          <span className="label">Category</span>
          <select
            className="input capitalize"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Condition</span>
          <select
            className="input capitalize"
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value as Condition })}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">Short description</span>
        <textarea
          className="input"
          rows={2}
          maxLength={500}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="18V, two batteries, bits included"
        />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>
          {submitLabel}
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
