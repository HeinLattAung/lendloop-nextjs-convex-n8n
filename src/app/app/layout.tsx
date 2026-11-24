"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { BadgeCheck, Inbox, LayoutGrid, Send, ShieldCheck, Boxes } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "@/components/ui";

const NAV = [
  { href: "/app", label: "Browse", icon: LayoutGrid },
  { href: "/app/listings", label: "My listings", icon: Boxes },
  { href: "/app/requests", label: "My requests", icon: Send },
  { href: "/app/incoming", label: "Incoming", icon: Inbox },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [stored, setStored] = useState(false);
  const me = useQuery(api.users.me, stored ? {} : "skip");
  const pending = useQuery(api.loans.incoming, stored ? {} : "skip");
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

  const nav = me?.role === "admin" ? [...NAV, { href: "/app/admin", label: "Admin", icon: ShieldCheck }] : NAV;
  const pendingCount = pending?.filter((l) => l.status === "pending").length ?? 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo href="/app" />
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100/80 p-1 md:flex">
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <n.icon className="size-4" />
                  {n.label}
                  {n.href === "/app/incoming" && pendingCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            {me && (
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold">{me.name}</p>
                <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                  {me.role === "admin" ? "Admin" : "Neighbor"}
                  {me.trustedLender && <BadgeCheck className="size-3.5 text-brand-600" />}
                </p>
              </div>
            )}
            <UserButton />
          </div>
        </div>
        {/* Mobile tab bar */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ${
                pathname === n.href ? "bg-slate-900 text-white" : "text-slate-500"
              }`}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading || !stored ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-40 animate-pulse bg-slate-100/60" />
            ))}
          </div>
        ) : (
          <div className="animate-fade-up">{children}</div>
        )}
      </main>
    </div>
  );
}
