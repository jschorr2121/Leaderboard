"use client";

import { useState } from "react";
import { Person, Receipt } from "@/lib/types";
import { colorForIndex } from "@/lib/colors";
import { money } from "@/lib/calc";
import { Avatar } from "./Avatar";

interface Props {
  receipt: Receipt;
  people: Person[];
  onChange: (people: Person[]) => void;
  onBack: () => void;
  onNext: () => void;
}

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `p-${Date.now().toString(36)}-${idCounter}`;
}

export default function PeopleScreen({
  receipt,
  people,
  onChange,
  onBack,
  onNext,
}: Props) {
  const [name, setName] = useState("");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const color = colorForIndex(people.length).solid;
    onChange([...people, { id: newId(), name: trimmed, color }]);
    setName("");
  };

  const remove = (id: string) => {
    onChange(people.filter((p) => p.id !== id));
  };

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <button
        onClick={onBack}
        className="self-start text-sm font-medium text-slate-400 hover:text-slate-600"
      >
        ← Back
      </button>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
          Receipt
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-800">
          {receipt.restaurant || "Your receipt"}
        </h2>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm text-slate-400">
            {receipt.items.length} item{receipt.items.length === 1 ? "" : "s"}
            {receipt.date ? ` · ${receipt.date}` : ""}
          </span>
          <span className="text-2xl font-black text-slate-900">
            {money(receipt.total || receipt.subtotal)}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-lg font-bold text-slate-800">Who&apos;s splitting?</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="Add a name"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={add}
            disabled={!name.trim()}
            className="rounded-2xl bg-emerald-500 px-5 font-bold text-white shadow-sm disabled:opacity-40 active:scale-95"
          >
            Add
          </button>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-400">
          Add at least 2 people to start splitting.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 pr-3 shadow-sm animate-fade-in"
            >
              <Avatar person={p} />
              <span className="flex-1 font-semibold text-slate-700">{p.name}</span>
              <button
                onClick={() => remove(p.id)}
                aria-label={`Remove ${p.name}`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={onNext}
        disabled={people.length < 2}
        className="rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
      >
        {people.length < 2
          ? `Add ${2 - people.length} more`
          : "Start Splitting →"}
      </button>
    </div>
  );
}
