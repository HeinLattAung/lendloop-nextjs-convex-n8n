"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";

const NAV = [
  { href: "/app", label: "Browse" },
  { href: "/app/listings", label: "My listings" },
  { href: "/app/requests", label: "My requests" },
  { href: "/app/incoming", label: "Incoming requests" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [stored, setStored] = useState(false);
  const me = useQuery(api.users.me, stored ? {} : "skip");
  const pathname = usePathname();

  // Create/refresh the user row from the verified Clerk token once per session.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    store().then(() => !cancelled && setStored(true));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, store]);

  const nav = me?.role === "admin" ? [...NAV, { href: "/app/admin", label: "Admin" }] : NAV;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-lg font-bold text-emerald-800">
          LendLoop
        </Link>
        <div className="flex items-center gap-3 text-sm text-stone-600">
          {me && (
            <span>
              {me.name}
              {me.role === "admin" && <span className="badge ml-2 bg-violet-100 text-violet-800">admin</span>}
              {me.trustedLender && <span className="badge ml-2 bg-emerald-100 text-emerald-800">Trusted Lender</span>}
            </span>
          )}
          <UserButton />
        </div>
      </header>
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-stone-200">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              pathname === n.href
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {isLoading || !stored ? <p className="text-stone-500">Loading…</p> : children}
    </div>
  );
}
