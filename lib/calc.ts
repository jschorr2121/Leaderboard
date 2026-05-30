import {
  Assignments,
  Person,
  PersonTotal,
  Receipt,
  ReceiptItem,
} from "./types";

export function money(n: number): string {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

/** Round to cents to avoid floating point drift in display/sums. */
export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function assignedPeople(
  assignments: Assignments,
  itemId: string
): string[] {
  return assignments[itemId] ?? [];
}

export function isFullyAssigned(
  items: ReceiptItem[],
  assignments: Assignments
): boolean {
  return items.every((it) => (assignments[it.id]?.length ?? 0) > 0);
}

export function unassignedItems(
  items: ReceiptItem[],
  assignments: Assignments
): ReceiptItem[] {
  return items.filter((it) => (assignments[it.id]?.length ?? 0) === 0);
}

/**
 * Sum of all item prices that have at least one person assigned. We proportion
 * tax/tip/surcharges against THIS value (not the receipt's printed subtotal) so
 * that the shares always add up to the full extra charges even when item prices
 * don't perfectly equal the printed subtotal. This was the splitting bug: using
 * the printed subtotal as the denominator left tax/tip unallocated or
 * over-allocated when sums differed.
 */
export function assignedSubtotal(
  items: ReceiptItem[],
  assignments: Assignments
): number {
  const cents = items.reduce((sum, it) => {
    const count = assignments[it.id]?.length ?? 0;
    return count > 0 ? sum + Math.round(it.price * 100) : sum;
  }, 0);
  return cents / 100;
}

/**
 * Split an amount (in dollars) into `n` cent-exact shares. The shares always sum
 * back to the original amount — leftover pennies are handed out one at a time to
 * the earliest recipients so nothing is lost or invented.
 */
function splitCents(amount: number, n: number): number[] {
  if (n <= 0) return [];
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / n);
  let remainder = totalCents - baseCents * n;
  return Array.from({ length: n }, (_, i) => {
    const cents = baseCents + (i < remainder ? 1 : 0);
    return cents / 100;
  });
}

/**
 * Compute every person's itemized share plus their proportional slice of tax,
 * tip, and surcharges.
 *
 * Two layers of cent-exact allocation guarantee the per-person totals sum to the
 * receipt total with no penny drift:
 *  1. Each item's price is split cent-exactly among the people on it, so the
 *     per-person subtotals always sum to the assigned subtotal.
 *  2. Tax/tip/surcharges are allocated proportionally with the remainder handed
 *     to the LAST person.
 */
export function computeTotals(
  receipt: Receipt,
  people: Person[],
  assignments: Assignments
): PersonTotal[] {
  // Pre-compute cent-exact per-item shares keyed by item id, in the order of the
  // assigned people array.
  const itemShares = new Map<string, Map<string, number>>();
  for (const it of receipt.items) {
    const assigned = assignments[it.id] ?? [];
    if (assigned.length === 0) continue;
    const shares = splitCents(it.price, assigned.length);
    const byPerson = new Map<string, number>();
    assigned.forEach((pid, i) => byPerson.set(pid, shares[i]));
    itemShares.set(it.id, byPerson);
  }

  const baseSubtotal = assignedSubtotal(receipt.items, assignments);
  const surchargeTotal = receipt.surcharges.reduce((s, c) => s + c.amount, 0);
  const tax = receipt.tax || 0;
  const tip = receipt.tip || 0;

  // First pass: per-person itemized subtotal from the cent-exact shares.
  const raw = people.map((person) => {
    const items = receipt.items
      .filter((it) => (assignments[it.id] ?? []).includes(person.id))
      .map((it) => {
        const splitCount = assignments[it.id].length;
        return {
          itemId: it.id,
          name: it.name,
          price: it.price,
          splitCount,
          share: itemShares.get(it.id)?.get(person.id) ?? 0,
        };
      });

    const subtotal = items.reduce((s, i) => s + i.share, 0);
    const fraction = baseSubtotal > 0 ? subtotal / baseSubtotal : 0;

    return {
      person,
      items,
      subtotal,
      fraction,
    };
  });

  // Allocate tax/tip/surcharge with remainder-to-last so totals reconcile.
  let allocatedTax = 0;
  let allocatedTip = 0;
  let allocatedSur = 0;

  const results: PersonTotal[] = raw.map((r, idx) => {
    const isLast = idx === raw.length - 1;

    let taxShare: number;
    let tipShare: number;
    let surShare: number;

    if (isLast) {
      taxShare = roundCents(tax - allocatedTax);
      tipShare = roundCents(tip - allocatedTip);
      surShare = roundCents(surchargeTotal - allocatedSur);
    } else {
      taxShare = roundCents(tax * r.fraction);
      tipShare = roundCents(tip * r.fraction);
      surShare = roundCents(surchargeTotal * r.fraction);
      allocatedTax += taxShare;
      allocatedTip += tipShare;
      allocatedSur += surShare;
    }

    const subtotal = roundCents(r.subtotal);
    const total = roundCents(subtotal + taxShare + tipShare + surShare);

    return {
      person: r.person,
      items: r.items,
      subtotal,
      tax: taxShare,
      tip: tipShare,
      surcharges: surShare,
      total,
    };
  });

  return results;
}

/** Grand total that should be split (subtotal of assigned items + extras). */
export function effectiveTotal(receipt: Receipt, assignments: Assignments): number {
  const base = assignedSubtotal(receipt.items, assignments);
  const sur = receipt.surcharges.reduce((s, c) => s + c.amount, 0);
  return roundCents(base + (receipt.tax || 0) + (receipt.tip || 0) + sur);
}
