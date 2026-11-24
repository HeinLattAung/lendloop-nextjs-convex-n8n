"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import LoanList from "@/components/LoanList";
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
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    fn().catch((err) => setError(errorMessage(err)));
  };

  if (me === undefined) return <p className="text-stone-500">Loading…</p>;
  if (!isAdmin) return <p className="card text-stone-500">This page is for admins only.</p>;

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">Members</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Trusted Lender</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u._id} className="border-t border-stone-100">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-stone-500">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={u.trustedLender}
                        onChange={(e) => run(() => setTrusted({ userId: u._id, trusted: e.target.checked }))}
                      />
                      {u.trustedLender ? "Trusted" : "—"}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">All listings</h2>
        <ul className="space-y-2">
          {listings?.map((t) => (
            <li key={t._id} className="card flex items-center justify-between gap-3 py-3">
              <span>
                <span className="font-medium">{t.name}</span>{" "}
                <span className="text-sm text-stone-500 capitalize">
                  · {t.category} · by {t.ownerName}
                  {t.onLoan && " · on loan"}
                </span>
              </span>
              <button
                className="btn-danger"
                onClick={() => {
                  if (confirm(`Remove "${t.name}" from the board?`)) run(() => remove({ toolId: t._id }));
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">All loans</h2>
        <LoanList loans={loans} perspective="admin" empty="No loans yet." />
      </section>
    </div>
  );
}
