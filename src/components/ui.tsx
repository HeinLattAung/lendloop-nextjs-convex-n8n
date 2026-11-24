import {
  CookingPot,
  Hammer,
  Package,
  Repeat,
  SprayCan,
  Sprout,
  Tent,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { Category } from "@/lib/ui";

export const CATEGORY_META: Record<Category, { icon: LucideIcon; tile: string }> = {
  "power tools": { icon: Wrench, tile: "bg-amber-100 text-amber-700" },
  "hand tools": { icon: Hammer, tile: "bg-orange-100 text-orange-700" },
  garden: { icon: Sprout, tile: "bg-emerald-100 text-emerald-700" },
  kitchen: { icon: CookingPot, tile: "bg-rose-100 text-rose-700" },
  camping: { icon: Tent, tile: "bg-sky-100 text-sky-700" },
  cleaning: { icon: SprayCan, tile: "bg-violet-100 text-violet-700" },
  other: { icon: Package, tile: "bg-slate-100 text-slate-700" },
};

export function CategoryTile({ category, size = "md" }: { category: Category; size?: "sm" | "md" | "lg" }) {
  const { icon: Icon, tile } = CATEGORY_META[category];
  const box = size === "lg" ? "size-14 rounded-2xl" : size === "sm" ? "size-8 rounded-lg" : "size-11 rounded-xl";
  const ic = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box} ${tile}`}>
      <Icon className={ic} strokeWidth={2} />
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-lift">
        <Repeat className="size-4" strokeWidth={2.5} />
      </span>
      <span className="text-lg font-bold tracking-tight">
        Lend<span className="bg-gradient-to-r from-brand-600 to-fuchsia-500 bg-clip-text text-transparent">Loop</span>
      </span>
    </Link>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hash} 70% 55%), hsl(${(hash + 40) % 360} 70% 48%))` }}
    >
      {initials || "?"}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-6" />
      </span>
      <p className="font-semibold text-slate-900">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card h-40 animate-pulse bg-slate-100/60" />
      ))}
    </div>
  );
}
