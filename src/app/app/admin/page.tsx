"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Boxes, Handshake, ShieldCheck, Trash2, Users } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import LoanList from "@/components/LoanList";
import { Avatar, CategoryTile, EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/ui";

export default function AdminPage() {
  const me = useQuery(api.users.me);
  const isAdmin = me?.role === "admin";
  // Queries are skipped for non-admins; the server would reject them anyway.
  const users = useQuery(api.admin.users, isAdmin ? {} : "skip");
  const listings = useQuery(api.admin.listings, isAdmin ? {} : "skip");
  const loans = useQuery(api.loans.all, isAdmin ? {} : "skip");
  const setTrusted = useMutation(api.admin.setTrusted);
  const remove = useMutation(api.tools.remove);
  const [tab, setTab] = useState<"members" | "listings" | "loans">("members");
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    fn().catch((err) => setError(errorMessage(err)));
  };

  if (me === undefined) return null;
  if (!isAdmin) return <EmptyState icon={ShieldCheck} title="Admins only" body="You don't have access to this page." />;

  const stats = [
    { label: "Members", value: users?.length, icon: Users, tone: "bg-brand-50 text-brand-600" },
    { label: "Listings", value: listings?.length, icon: Boxes, tone: "bg-amber-50 text-amber-600" },
    {
      label: "Active loans",
      value: loans?.filter((l) => l.status === "approved").length,
      icon: Handshake,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Overdue",
      value: loans?.filter((l) => l.overdue).length,
      icon: AlertTriangle,
      tone: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div>
      <PageHeader title="Admin" subtitle="Moderate listings, review loans and recognise trusted lenders." />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <span className={`flex size-11 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">{s.value ?? "–"}</p>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 inline-flex gap-1 rounded-2xl bg-slate-100/80 p-1">
        {(["members", "listings", "loans"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-1.5 text-sm capitalize transition ${
              tab === t ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {tab === "members" && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3 text-right">Trusted Lender</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} className="size-9 text-xs" />
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`chip ${
                        u.role === "admin" ? "bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      role="switch"
                      aria-checked={u.trustedLender}
                      aria-label={`Trusted Lender: ${u.name}`}
                      onClick={() => run(() => setTrusted({ userId: u._id, trusted: !u.trustedLender }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        u.trustedLender ? "bg-brand-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block size-5 rounded-full bg-white shadow transition ${
                          u.trustedLender ? "translate-x-5.5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "listings" &&
        (listings && listings.length === 0 ? (
          <EmptyState icon={Boxes} title="No listings yet" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {listings?.map((t) => (
              <li key={t._id} className="card flex items-center gap-3 py-4">
                <CategoryTile category={t.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {t.category} · by {t.ownerName}
                    {t.onLoan && " · on loan"}
                  </p>
                </div>
                <button
                  className="btn-danger px-2.5"
                  onClick={() => {
                    if (confirm(`Remove "${t.name}" from the board?`)) run(() => remove({ toolId: t._id }));
                  }}
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              </li>
            ))}
          </ul>
        ))}

      {tab === "loans" && (
        <LoanList loans={loans} perspective="admin" empty={<EmptyState icon={Handshake} title="No loans yet" />} />
      )}
    </div>
  );
}
