"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
  const tools = useQuery(api.tools.listPublic);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10 flex items-center justify-between">
        <span className="text-lg font-bold text-emerald-800">LendLoop</span>
        <Show when="signed-in">
          <div className="flex items-center gap-3">
            <Link href="/app" className="btn-primary">
              Open app
            </Link>
            <UserButton />
          </div>
        </Show>
      </header>

      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Borrow what you need. Lend what you don&apos;t.</h1>
        <p className="mx-auto mt-3 max-w-xl text-stone-600">
          A neighborhood board for sharing drills, ladders, tents and everything in between.
        </p>
        <div className="mt-6">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/app">
              <button className="btn-primary px-5 py-2.5 text-base">Sign in to lend or borrow</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link href="/app" className="btn-primary px-5 py-2.5 text-base">
              Go to your board
            </Link>
          </Show>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">Available now</h2>
        {tools === undefined ? (
          <p className="text-stone-500">Loading…</p>
        ) : tools.length === 0 ? (
          <p className="card text-stone-500">No tools listed yet. Be the first to lend one.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <li key={t._id} className="card">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-stone-500 capitalize">{t.category}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
