"use client";

import { useState } from "react";
import { Assignments, Person, Receipt, ReceiptItem } from "@/lib/types";
import {
  assignedSubtotal,
  isFullyAssigned,
  money,
  roundCents,
  unassignedItems,
} from "@/lib/calc";
import { colorFromSolid, initials } from "@/lib/colors";

interface Props {
  receipt: Receipt;
  people: Person[];
  assignments: Assignments;
  onChangeReceipt: (receipt: Receipt) => void;
  onChangeAssignments: (assignments: Assignments) => void;
  onBack: () => void;
  onNext: () => void;
}

let itemCounter = 0;
function newItemId() {
  itemCounter += 1;
  return `m-${Date.now().toString(36)}-${itemCounter}`;
}

export default function AssignScreen({
  receipt,
  people,
  assignments,
  onChangeReceipt,
  onChangeAssignments,
  onBack,
  onNext,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCharges, setShowCharges] = useState(false);

  const toggle = (itemId: string, personId: string) => {
    const current = assignments[itemId] ?? [];
    const next = current.includes(personId)
      ? current.filter((p) => p !== personId)
      : [...current, personId];
    onChangeAssignments({ ...assignments, [itemId]: next });
  };

  const selectAll = (itemId: string) => {
    const current = assignments[itemId] ?? [];
    const all = people.map((p) => p.id);
    const next = current.length === people.length ? [] : all;
    onChangeAssignments({ ...assignments, [itemId]: next });
  };

  const updateItem = (id: string, patch: Partial<ReceiptItem>) => {
    onChangeReceipt({
      ...receipt,
      items: receipt.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };

  const removeItem = (id: string) => {
    const { [id]: _removed, ...restAssign } = assignments;
    onChangeAssignments(restAssign);
    onChangeReceipt({ ...receipt, items: receipt.items.filter((it) => it.id !== id) });
  };

  const addItem = () => {
    const id = newItemId();
    onChangeReceipt({
      ...receipt,
      items: [...receipt.items, { id, name: "New item", price: 0 }],
    });
    setEditingId(id);
  };

  const base = assignedSubtotal(receipt.items, assignments);
  const fullSubtotal = receipt.items.reduce((s, it) => s + it.price, 0);
  const fully = isFullyAssigned(receipt.items, assignments);
  const unassignedCount = unassignedItems(receipt.items, assignments).length;

  return (
    <div className="flex flex-col gap-4 pb-32 animate-slide-up">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-medium text-slate-400 hover:text-slate-600"
        >
          ← People
        </button>
        <h2 className="text-lg font-bold text-slate-800">Assign items</h2>
        <div className="w-12" />
      </div>

      <p className="text-center text-sm text-slate-400">
        Tap a person to add them to an item. Tap again to remove.
      </p>

      <ul className="flex flex-col gap-3">
        {receipt.items.map((item) => {
          const assigned = assignments[item.id] ?? [];
          const splitCount = assigned.length;
          const isUnassigned = splitCount === 0;
          const share = splitCount > 0 ? roundCents(item.price / splitCount) : 0;
          const isEditing = editingId === item.id;

          return (
            <li
              key={item.id}
              className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
                isUnassigned ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      autoFocus
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center rounded-lg border border-slate-300 px-2">
                      <span className="text-sm text-slate-400">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={Number.isFinite(item.price) ? item.price : 0}
                        onChange={(e) =>
                          updateItem(item.id, {
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 py-1 text-right text-sm outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingId(item.id)}
                    className="flex flex-1 items-start justify-between gap-2 text-left"
                  >
                    <span className="font-semibold text-slate-800">
                      {item.name}
                      {isUnassigned && (
                        <span className="ml-2 align-middle text-xs font-bold text-amber-500">
                          ⚠ unassigned
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap font-bold text-slate-700">
                      {money(item.price)}
                    </span>
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-bold text-white"
                  >
                    Done
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {people.map((person) => {
                  const on = assigned.includes(person.id);
                  const color = colorFromSolid(person.color);
                  return (
                    <button
                      key={person.id}
                      onClick={() => toggle(item.id, person.id)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                        on
                          ? "text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      style={on ? { backgroundColor: color.solid } : undefined}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                          on ? "bg-white/25 text-white" : "bg-white text-slate-500"
                        }`}
                      >
                        {initials(person.name)}
                      </span>
                      {person.name}
                      {on && splitCount > 1 && (
                        <span className="rounded bg-white/25 px-1 tabular-nums">
                          {money(share)}
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => selectAll(item.id)}
                  className="ml-auto rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                >
                  {splitCount === people.length ? "Clear" : "All"}
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  className="rounded-full px-2 py-1 text-xs text-slate-300 hover:text-rose-500"
                >
                  🗑
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        onClick={addItem}
        className="rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
      >
        + Add item
      </button>

      {/* Editable extras */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          onClick={() => setShowCharges((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600"
        >
          <span>Tax, tip &amp; surcharges</span>
          <span className="text-slate-400">{showCharges ? "▲" : "▼"}</span>
        </button>
        {showCharges && (
          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
            {receipt.gratuityIncluded && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                ✓ Gratuity was already included on this receipt — we won&apos;t add
                another tip.
              </p>
            )}
            <ChargeRow
              label="Tax"
              value={receipt.tax}
              onChange={(v) => onChangeReceipt({ ...receipt, tax: v })}
            />
            <ChargeRow
              label={receipt.gratuityIncluded ? "Tip (included)" : "Tip"}
              value={receipt.tip}
              onChange={(v) => onChangeReceipt({ ...receipt, tip: v })}
            />
            {receipt.surcharges.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={s.label}
                  onChange={(e) => {
                    const surcharges = [...receipt.surcharges];
                    surcharges[i] = { ...surcharges[i], label: e.target.value };
                    onChangeReceipt({ ...receipt, surcharges });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
                />
                <div className="flex items-center rounded-lg border border-slate-200 px-2">
                  <span className="text-sm text-slate-400">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={s.amount}
                    onChange={(e) => {
                      const surcharges = [...receipt.surcharges];
                      surcharges[i] = {
                        ...surcharges[i],
                        amount: parseFloat(e.target.value) || 0,
                      };
                      onChangeReceipt({ ...receipt, surcharges });
                    }}
                    className="w-16 py-1.5 text-right text-sm outline-none"
                  />
                </div>
                <button
                  onClick={() =>
                    onChangeReceipt({
                      ...receipt,
                      surcharges: receipt.surcharges.filter((_, j) => j !== i),
                    })
                  }
                  className="text-slate-300 hover:text-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                onChangeReceipt({
                  ...receipt,
                  surcharges: [
                    ...receipt.surcharges,
                    { label: "Surcharge", amount: 0 },
                  ],
                })
              }
              className="text-xs font-semibold text-emerald-600"
            >
              + Add surcharge
            </button>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {fully ? (
                  <span className="font-semibold text-emerald-600">
                    All items assigned
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600">
                    {unassignedCount} item{unassignedCount === 1 ? "" : "s"} left
                  </span>
                )}
              </span>
              <span className="tabular-nums">
                {money(base)} / {money(fullSubtotal)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  fully ? "bg-emerald-500" : "bg-amber-400"
                }`}
                style={{
                  width: `${fullSubtotal > 0 ? Math.min(100, (base / fullSubtotal) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <button
            onClick={onNext}
            disabled={!fully}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
          >
            See Summary
          </button>
        </div>
      </div>
    </div>
  );
}

function ChargeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center rounded-lg border border-slate-200 px-2">
        <span className="text-sm text-slate-400">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 py-1.5 text-right text-sm outline-none"
        />
      </div>
    </div>
  );
}
