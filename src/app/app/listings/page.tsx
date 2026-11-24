"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import ToolForm from "@/components/ToolForm";
import { CategoryTile, EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/ui";

export default function ListingsPage() {
  const tools = useQuery(api.tools.mine);
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const [editing, setEditing] = useState<Id<"tools"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onLoan = tools?.filter((t) => t.onLoan).length ?? 0;

  return (
    <div>
      <PageHeader
        title="My listings"
        subtitle={
          tools ? `${tools.length} listed · ${onLoan} on loan right now` : "Tools you're sharing with the neighborhood."
        }
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="card h-fit lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Plus className="size-4" />
            </span>
            <h2 className="font-semibold">List a new tool</h2>
          </div>
          <ToolForm submitLabel="Add listing" onSubmit={(input) => create(input)} />
        </section>

        <section>
          {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {tools === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card h-24 animate-pulse bg-slate-100/60" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="Nothing listed yet"
              body="Add your first tool with the form. It shows up on the board right away."
            />
          ) : (
            <ul className="space-y-3">
              {tools.map((t) => (
                <li key={t._id} className="card">
                  {editing === t._id ? (
                    <ToolForm
                      initial={{ name: t.name, category: t.category, condition: t.condition, description: t.description }}
                      submitLabel="Save changes"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (input) => {
                        await update({ toolId: t._id, ...input });
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <div className="flex items-start gap-4">
                      <CategoryTile category={t.category} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{t.name}</p>
                          <span
                            className={`chip ${
                              t.onLoan
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            }`}
                          >
                            {t.onLoan ? "On loan" : "Available"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 capitalize">
                          {t.category} · {t.condition} condition
                        </p>
                        {t.description && <p className="mt-2 text-sm text-slate-600">{t.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button className="btn-ghost p-2" title="Edit" onClick={() => setEditing(t._id)}>
                          <Pencil className="size-4" />
                        </button>
                        <button
                          className="btn-ghost p-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          title="Delete"
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
                          <Trash2 className="size-4" />
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
    </div>
  );
}
