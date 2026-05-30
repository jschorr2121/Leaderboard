export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
}

export interface Surcharge {
  label: string;
  amount: number;
}

export interface Receipt {
  restaurant: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  surcharges: Surcharge[];
  total: number;
  /** True when gratuity was already baked into the receipt (auto-gratuity / included service charge). */
  gratuityIncluded?: boolean;
}

export interface Person {
  id: string;
  name: string;
  color: string;
}

/** Map of item id -> set of person ids assigned to that item. */
export type Assignments = Record<string, string[]>;

export interface PersonBreakdownItem {
  itemId: string;
  name: string;
  /** This person's share of the item (price / number of people on it). */
  share: number;
  /** Full item price. */
  price: number;
  /** Number of people splitting this item. */
  splitCount: number;
}

export interface PersonTotal {
  person: Person;
  items: PersonBreakdownItem[];
  subtotal: number;
  tax: number;
  tip: number;
  surcharges: number;
  total: number;
}

export type Screen = "upload" | "people" | "assign" | "summary";

export interface AppState {
  screen: Screen;
  receipt: Receipt | null;
  imageDataUrl: string | null;
  people: Person[];
  assignments: Assignments;
}
