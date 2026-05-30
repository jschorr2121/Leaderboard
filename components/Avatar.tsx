import { Person } from "@/lib/types";
import { colorFromSolid, initials } from "@/lib/colors";

export function Avatar({
  person,
  size = "md",
}: {
  person: Person;
  size?: "sm" | "md" | "lg";
}) {
  const color = colorFromSolid(person.color);
  const dim =
    size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${dim}`}
      style={{ backgroundColor: color.solid }}
      aria-hidden
    >
      {initials(person.name)}
    </span>
  );
}
