"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import ToolForm from "@/components/ToolForm";
import { errorMessage } from "@/lib/ui";

export default function ListingsPage() {
  const tools = useQuery(api.tools.mine);
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const [editing, setEditing] = useState<Id<"tools"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <section className="card">
        <h2 className="mb-3 font-semibold">List a tool</h2>
        <ToolForm submitLabel="Add listing" onSubmit={(input) => create(input)} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">Your listings</h2>
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        {tools === undefined ? (
          <p className="text-stone-500">Loading…</p>
        ) : tools.length === 0 ? (
          <p className="card text-stone-500">You haven&apos;t listed anything yet.</p>
        ) : (
          <ul className="space-y-3">
            {tools.map((t) => (
              <li key={t._id} className="card">
                {editing === t._id ? (
                  <ToolForm
                    initial={{ name: t.name, category: t.category, condition: t.condition, description: t.description }}
                    submitLabel="Save"
                    onCancel={() => setEditing(null)}
                    onSubmit={async (input) => {
                      await update({ toolId: t._id, ...input });
                      setEditing(null);
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {t.name}
                        <span
                          className={`badge ml-2 ${t.onLoan ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                        >
                          {t.onLoan ? "On loan" : "Available"}
                        </span>
                      </p>
                      <p className="text-sm text-stone-500 capitalize">
                        {t.category} · {t.condition}
                      </p>
                      {t.description && <p className="mt-1 text-sm text-stone-700">{t.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => setEditing(t._id)}>
                        Edit
                      </button>
                      <button
                        className="btn-danger"
                        onClick={async () => {
                          if (!confirm(`Delete "${t.name}"? Pending requests will be cancelled.`)) return;
                          setError(null);
                          try {
                            await remove({ toolId: t._id });
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
