# SplitSnap 🧾

Snap a photo of a receipt and split the bill fairly. SplitSnap uses Claude Vision
to read the receipt, lets you assign each item to one or more people, and works
out exactly what everyone owes — including each person's proportional share of
tax, tip, and surcharges.

## Features

- **📷 Snap or upload** a receipt (camera capture on mobile, drag-and-drop on desktop). Large images are downscaled client-side before upload.
- **🤖 AI parsing** via Claude (`claude-sonnet-4-20250514`) extracts line items, subtotal, tax, tip, and surcharges as structured JSON. Handles percentage vs. flat tips, multiple surcharges, modifier line items, $0 comped items, and detects already-included auto-gratuity so it isn't double-counted.
- **👥 Add people** with auto-assigned, distinct colored avatars.
- **👆 Tap-to-assign** each item to one or more people; split shares show inline on each chip, with a "Select All" shortcut and warnings for unassigned items.
- **✏️ Inline editing** of item names/prices and the tax/tip/surcharge values, plus full manual entry when there's no photo or the AI misses something.
- **🧮 Cent-exact splitting** — per-item shares and proportional tax/tip/fees always sum back to the receipt total (no missing pennies).
- **💸 Summary** with a per-person breakdown and prefilled Venmo / Cash App deep links, plus a copyable text summary.
- **📱 Mobile-first** UI with smooth transitions and **sessionStorage** persistence so a refresh never loses progress.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Anthropic `@anthropic-ai/sdk` (vision) via a Next.js API route

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then add your key
npm run dev
```

Set your Anthropic API key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add `ANTHROPIC_API_KEY` as an Environment Variable.
3. Deploy — no database or other services required.

## How splitting works

The grand total split is the assigned items' subtotal plus tax, tip, and
surcharges. Each item is divided cent-exactly among the people assigned to it,
and tax/tip/surcharges are allocated in proportion to each person's subtotal —
with the final penny of rounding handed to the last person so every per-person
total sums back to the receipt total exactly. See `lib/calc.ts`.

## Project structure

```
app/
  layout.tsx                 root layout + metadata
  page.tsx                   screen orchestrator + sessionStorage state
  globals.css                Tailwind + small custom styles
  api/parse-receipt/route.ts Claude Vision parsing endpoint
components/
  UploadScreen.tsx           screen 1 — upload/camera + parse
  PeopleScreen.tsx           screen 2 — add people
  AssignScreen.tsx           screen 3 — assign items (core UI)
  SummaryScreen.tsx          screen 4 — who owes what
  Avatar.tsx                 colored initials avatar
lib/
  types.ts                   shared types
  calc.ts                    splitting math
  colors.ts                  person color palette
```
