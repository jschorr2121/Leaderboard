"use client";

import { useMemo, useState } from "react";
import { Assignments, Person, Receipt } from "@/lib/types";
import { computeTotals, effectiveTotal, money } from "@/lib/calc";
import { colorFromSolid } from "@/lib/colors";
import { Avatar } from "./Avatar";

interface Props {
  receipt: Receipt;
  people: Person[];
  assignments: Assignments;
  onBack: () => void;
  onStartOver: () => void;
}

function venmoLink(note: string, amount: number) {
  const params = new URLSearchParams({
    txn: "pay",
    note,
    amount: amount.toFixed(2),
  });
  return `https://venmo.com/?${params.toString()}`;
}

function cashAppLink(amount: number) {
  // Cash App web fallback — opens the app's amount entry where available.
  return `https://cash.app/launch/payment?amount=${amount.toFixed(2)}`;
}

export default function SummaryScreen({
  receipt,
  people,
  assignments,
  onBack,
  onStartOver,
}: Props) {
  const totals = useMemo(
    () => computeTotals(receipt, people, assignments),
    [receipt, people, assignments]
  );
  const grand = effectiveTotal(receipt, assignments);
  const [copied, setCopied] = useState(false);

  const summaryText = useMemo(() => {
    const lines = totals.map((t) => `${t.person.name}: ${money(t.total)}`);
    return `${receipt.restaurant || "Receipt"} — ${money(grand)}\n${lines.join("\n")}\n\nSplit with SplitSnap`;
  }, [totals, receipt.restaurant, grand]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-10 animate-slide-up">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-400 hover:text-slate-600"
        >
          ← Edit
        </button>
        <h2 className="text-lg font-bold text-slate-800">The damage</h2>
        <div className="w-10" />
      </div>

      <div className="rounded-3xl bg-slate-900 p-5 text-center text-white shadow-lg">
        <p className="text-sm text-slate-300">
          {receipt.restaurant || "Total bill"}
        </p>
        <p className="mt-1 text-4xl font-black tabular-nums">{money(grand)}</p>
        <p className="mt-1 text-xs text-slate-400">
          split between {people.length} people
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {totals.map((t) => {
          const color = colorFromSolid(t.person.color);
          return (
            <div
              key={t.person.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ backgroundColor: `${color.solid}14` }}
              >
                <Avatar person={t.person} size="lg" />
                <span className="flex-1 text-lg font-bold text-slate-800">
                  {t.person.name}
                </span>
                <span
                  className="text-2xl font-black tabular-nums"
                  style={{ color: color.solid }}
                >
                  {money(t.total)}
                </span>
              </div>

              <div className="px-4 py-3">
                <ul className="space-y-1.5 text-sm">
                  {t.items.length === 0 && (
                    <li className="text-slate-400">No items assigned</li>
                  )}
                  {t.items.map((it) => (
                    <li
                      key={it.itemId}
                      className="flex items-center justify-between text-slate-600"
                    >
                      <span className="truncate pr-2">
                        {it.name}
                        {it.splitCount > 1 && (
                          <span className="ml-1 text-xs text-slate-400">
                            (÷{it.splitCount})
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums">{money(it.share)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-sm text-slate-500">
                  <Row label="Subtotal" value={money(t.subtotal)} />
                  {t.tax > 0 && <Row label="Tax share" value={money(t.tax)} />}
                  {t.tip > 0 && (
                    <Row
                      label={receipt.gratuityIncluded ? "Gratuity share" : "Tip share"}
                      value={money(t.tip)}
                    />
                  )}
                  {t.surcharges > 0 && (
                    <Row label="Fees share" value={money(t.surcharges)} />
                  )}
                  <div className="flex items-center justify-between pt-1 text-base font-bold text-slate-900">
                    <span>Owes</span>
                    <span className="tabular-nums">{money(t.total)}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <a
                    href={venmoLink(receipt.restaurant || "SplitSnap", t.total)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#3D95CE] py-2 text-center text-sm font-bold text-white active:scale-95"
                  >
                    Venmo
                  </a>
                  <a
                    href={cashAppLink(t.total)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[#00D632] py-2 text-center text-sm font-bold text-white active:scale-95"
                  >
                    Cash App
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={copy}
        className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 shadow-sm active:scale-[0.98]"
      >
        {copied ? "✓ Copied!" : "📋 Copy summary"}
      </button>

      <button
        onClick={onStartOver}
        className="rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
      >
        Start Over
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
