import { ConvexError } from "convex/values";

export const CATEGORIES = [
  "power tools",
  "hand tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = ["new", "good", "fair", "worn"] as const;
export type Condition = (typeof CONDITIONS)[number];

export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) return String(err.data);
  if (err instanceof Error) return err.message.replace(/^[\s\S]*Uncaught Error:\s*/, "");
  return "Something went wrong.";
}

export function timeAgo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function todayLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  declined: "bg-stone-200 text-stone-700",
  cancelled: "bg-stone-200 text-stone-700",
  returned: "bg-sky-100 text-sky-800",
};
