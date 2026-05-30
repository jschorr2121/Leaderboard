"use client";

import { useEffect, useRef, useState } from "react";
import { AppState, Assignments, Person, Receipt, Screen } from "@/lib/types";
import UploadScreen from "@/components/UploadScreen";
import PeopleScreen from "@/components/PeopleScreen";
import AssignScreen from "@/components/AssignScreen";
import SummaryScreen from "@/components/SummaryScreen";

const STORAGE_KEY = "splitsnap-state-v1";

const EMPTY_RECEIPT: Receipt = {
  restaurant: "",
  date: "",
  items: [],
  subtotal: 0,
  tax: 0,
  tip: 0,
  surcharges: [],
  total: 0,
};

const INITIAL: AppState = {
  screen: "upload",
  receipt: null,
  imageDataUrl: null,
  people: [],
  assignments: {},
};

function loadState(): AppState {
  if (typeof window === "undefined") return INITIAL;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as AppState;
    return { ...INITIAL, ...parsed };
  } catch {
    return INITIAL;
  }
}

export default function Home() {
  const [state, setState] = useState<AppState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);
  const firstSave = useRef(true);

  // Hydrate from sessionStorage on mount (client only) to survive refreshes.
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on every change once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    if (firstSave.current) {
      firstSave.current = false;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be full or blocked — non-fatal */
    }
  }, [state, hydrated]);

  const set = (patch: Partial<AppState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const go = (screen: Screen) => set({ screen });

  const handleParsed = (receipt: Receipt, _raw: string) => {
    set({ receipt, screen: "people" });
  };

  const handleManual = () => {
    // Escape hatch: start with an empty (or already-parsed) receipt and let the
    // user add people, then add/edit items by hand on the assign screen.
    set({
      receipt: state.receipt ?? { ...EMPTY_RECEIPT },
      screen: "people",
    });
  };

  const startOver = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState({ ...INITIAL });
  };

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-500" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-5">
      {state.screen === "upload" && (
        <UploadScreen
          imageDataUrl={state.imageDataUrl}
          onImage={(dataUrl) =>
            set({ imageDataUrl: dataUrl ? dataUrl : null })
          }
          onParsed={handleParsed}
          onManual={handleManual}
        />
      )}

      {state.screen === "people" && state.receipt && (
        <PeopleScreen
          receipt={state.receipt}
          people={state.people}
          onChange={(people: Person[]) => set({ people })}
          onBack={() => go("upload")}
          onNext={() => go("assign")}
        />
      )}

      {state.screen === "assign" && state.receipt && (
        <AssignScreen
          receipt={state.receipt}
          people={state.people}
          assignments={state.assignments}
          onChangeReceipt={(receipt: Receipt) => set({ receipt })}
          onChangeAssignments={(assignments: Assignments) =>
            set({ assignments })
          }
          onBack={() =>
            go(state.people.length >= 2 ? "people" : "upload")
          }
          onNext={() => go("summary")}
        />
      )}

      {state.screen === "summary" && state.receipt && (
        <SummaryScreen
          receipt={state.receipt}
          people={state.people}
          assignments={state.assignments}
          onBack={() => go("assign")}
          onStartOver={startOver}
        />
      )}
    </main>
  );
}
