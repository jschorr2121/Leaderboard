// Distinct, high-contrast palette for person chips/avatars.
// Each entry pairs a solid background with text/ring colors for consistency.
export interface PersonColor {
  bg: string;
  text: string;
  ring: string;
  solid: string; // raw hex for inline styles where needed
}

export const PERSON_COLORS: PersonColor[] = [
  { bg: "bg-rose-500", text: "text-white", ring: "ring-rose-300", solid: "#f43f5e" },
  { bg: "bg-sky-500", text: "text-white", ring: "ring-sky-300", solid: "#0ea5e9" },
  { bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-300", solid: "#10b981" },
  { bg: "bg-amber-500", text: "text-white", ring: "ring-amber-300", solid: "#f59e0b" },
  { bg: "bg-violet-500", text: "text-white", ring: "ring-violet-300", solid: "#8b5cf6" },
  { bg: "bg-pink-500", text: "text-white", ring: "ring-pink-300", solid: "#ec4899" },
  { bg: "bg-teal-500", text: "text-white", ring: "ring-teal-300", solid: "#14b8a6" },
  { bg: "bg-orange-500", text: "text-white", ring: "ring-orange-300", solid: "#f97316" },
  { bg: "bg-indigo-500", text: "text-white", ring: "ring-indigo-300", solid: "#6366f1" },
  { bg: "bg-lime-600", text: "text-white", ring: "ring-lime-300", solid: "#65a30d" },
  { bg: "bg-fuchsia-500", text: "text-white", ring: "ring-fuchsia-300", solid: "#d946ef" },
  { bg: "bg-cyan-600", text: "text-white", ring: "ring-cyan-300", solid: "#0891b2" },
];

export function colorForIndex(index: number): PersonColor {
  return PERSON_COLORS[index % PERSON_COLORS.length];
}

const COLOR_MAP = new Map(PERSON_COLORS.map((c) => [c.solid, c]));

export function colorFromSolid(solid: string): PersonColor {
  return COLOR_MAP.get(solid) ?? PERSON_COLORS[0];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
