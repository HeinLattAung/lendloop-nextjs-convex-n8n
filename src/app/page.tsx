"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowRight, Bell, CalendarRange, Handshake, PackagePlus, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { CategoryTile, Logo } from "@/components/ui";

const STEPS = [
  { icon: PackagePlus, title: "List what you own", body: "Add the drill, ladder or tent sitting in your cupboard in seconds." },
  { icon: CalendarRange, title: "Request a date range", body: "Neighbors ask to borrow for specific days, so nothing double-books." },
  { icon: Bell, title: "Get nudged automatically", body: "Approvals, returns and overdue reminders are handled for you." },
];

export default function Home() {
  const tools = useQuery(api.tools.listPublic);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/app">
              <button className="btn-secondary">Sign in</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center gap-3">
              <Link href="/app" className="btn-primary">
                Open board <ArrowRight className="size-4" />
              </Link>
              <UserButton />
            </div>
          </Show>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="animate-fade-up py-20 text-center sm:py-28">
          <span className="chip mb-6 bg-white/80 px-3 py-1 text-brand-700 shadow-soft ring-1 ring-brand-100">
            <Sparkles className="size-3.5" /> The neighborhood tool library
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Borrow what you need.{" "}
            <span className="bg-gradient-to-r from-brand-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              Lend what you don&apos;t.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Share drills, ladders, tents and everything in between with the people on your street.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl="/app">
                <button className="btn-primary px-6 py-3 text-base">
                  Sign in to lend or borrow <ArrowRight className="size-4" />
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link href="/app" className="btn-primary px-6 py-3 text-base">
                Go to your board <ArrowRight className="size-4" />
              </Link>
            </Show>
            <a href="#available" className="btn-secondary px-6 py-3 text-base">
              See what&apos;s available
            </a>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <s.icon className="size-5" />
              </span>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-slate-500">{s.body}</p>
            </div>
          ))}
        </section>

        <section id="available" className="scroll-mt-24 pb-24">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Available now</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to see details and send a request.</p>
            </div>
            {tools && tools.length > 0 && (
              <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500" /> {tools.length} ready to lend
              </span>
            )}
          </div>
          {tools === undefined ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card h-24 animate-pulse bg-slate-100/60" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <div className="card flex flex-col items-center py-12 text-center">
              <Handshake className="mb-3 size-8 text-brand-500" />
              <p className="font-semibold">Nothing listed yet</p>
              <p className="mt-1 text-sm text-slate-500">Be the first neighbor to lend something.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((t) => (
                <li
                  key={t._id}
                  className="card flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <CategoryTile category={t.category} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="text-sm capitalize text-slate-500">{t.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200/70 py-8 text-center text-sm text-slate-400">
        LendLoop · built with Next.js, Convex, Clerk and n8n
      </footer>
    </div>
  );
}
