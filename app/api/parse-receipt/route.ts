import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a precise receipt-parsing engine for a bill-splitting app. You receive a photo of a restaurant or store receipt and must extract its contents.

Return ONLY a single JSON object — no markdown, no code fences, no commentary — matching exactly this shape:

{
  "restaurant": "string",            // best guess at the venue name; "" if unknown
  "date": "string",                  // date printed on receipt as-is; "" if none
  "items": [
    { "id": "string", "name": "string", "price": number }
  ],
  "subtotal": number,                // pre-tax subtotal
  "tax": number,                     // total tax
  "tip": number,                     // tip/gratuity as a FLAT dollar amount
  "surcharges": [{ "label": "string", "amount": number }],
  "total": number,                   // grand total charged
  "gratuityIncluded": boolean        // true if an auto-gratuity/service charge was already added by the venue
}

Rules:
- Every line item gets a unique "id" (e.g. "item-1", "item-2", ...).
- Prices and all numeric fields are plain numbers in dollars (e.g. 12.5 not "$12.50"). Never include currency symbols.
- Modifiers / add-ons / extras printed as their own priced line (e.g. "+ Add bacon $2") are SEPARATE items.
- Comped or $0.00 items are still listed with price 0.
- If the receipt notes an item was already split, list it once at its full printed price.
- Tip handling: if tip is shown as a percentage only, compute the flat dollar amount and put it in "tip". If both a percentage and an amount are shown, use the amount.
- Auto-gratuity / mandatory service charge: put its dollar amount in "tip" AND set "gratuityIncluded": true so the app does not prompt to add another tip. Do not also list it under surcharges.
- Surcharges are venue fees that are NOT tax and NOT tip: e.g. "Service Fee", "Health Mandate", "Credit Card Fee", "Bag Fee", "Kitchen Appreciation". Each is its own entry.
- If a value is genuinely absent, use 0 (numbers), "" (strings), or [] (arrays).
- Do your best even on blurry receipts. If the image is clearly NOT a receipt, return: {"error": "not_a_receipt"}.`;

interface ParseRequestBody {
  image?: string; // base64 data URL or raw base64
  mediaType?: string;
}

const SUPPORTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function parseDataUrl(image: string): { mediaType: string; data: string } {
  const match = /^data:(.+?);base64,(.*)$/s.exec(image.trim());
  if (match) {
    return { mediaType: match[1], data: match[2] };
  }
  // Assume raw base64; caller should provide mediaType.
  return { mediaType: "", data: image.trim() };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  // Strip ```json ... ``` fences if the model added them despite instructions.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (fenced) return fenced[1].trim();
  // Otherwise grab the outermost JSON object.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "server_misconfigured", message: "ANTHROPIC_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: ParseRequestBody;
  try {
    body = (await req.json()) as ParseRequestBody;
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.image) {
    return NextResponse.json(
      { error: "bad_request", message: "Missing image." },
      { status: 400 }
    );
  }

  let { mediaType, data } = parseDataUrl(body.image);
  if (!mediaType) mediaType = body.mediaType || "image/jpeg";

  // HEIC isn't directly supported by the vision API; ask the client to convert.
  if (mediaType === "image/heic" || mediaType === "image/heif") {
    return NextResponse.json(
      {
        error: "unsupported_format",
        message:
          "HEIC images aren't supported directly. Please convert to JPEG/PNG and retry.",
      },
      { status: 415 }
    );
  }
  if (!SUPPORTED_MEDIA.has(mediaType)) {
    mediaType = "image/jpeg";
  }

  const anthropic = new Anthropic({ apiKey });

  let rawText: string;
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data,
              },
            },
            {
              type: "text",
              text: "Parse this receipt and return only the JSON object.",
            },
          ],
        },
      ],
    });

    rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status ?? 502
        : 502;
    return NextResponse.json(
      { error: "ai_error", message, raw: null },
      { status: status >= 400 && status < 600 ? status : 502 }
    );
  }

  const jsonText = extractJson(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Couldn't parse — hand the raw text back so the UI can ask the user to confirm/correct.
    return NextResponse.json(
      {
        error: "ambiguous",
        message: "Couldn't read the receipt cleanly.",
        raw: rawText,
      },
      { status: 422 }
    );
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "error" in parsed &&
    (parsed as { error?: string }).error === "not_a_receipt"
  ) {
    return NextResponse.json(
      {
        error: "not_a_receipt",
        message: "That doesn't look like a receipt. Try another photo.",
        raw: rawText,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ receipt: normalizeReceipt(parsed), raw: rawText });
}

// Coerce / sanitize the model output into our Receipt shape with safe defaults.
function normalizeReceipt(input: unknown) {
  const obj = (input ?? {}) as Record<string, unknown>;
  const num = (v: unknown): number => {
    const n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.\-]/g, "")) : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  const itemsInput = Array.isArray(obj.items) ? obj.items : [];
  const items = itemsInput.map((raw, i) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    return {
      id: str(it.id) || `item-${i + 1}`,
      name: str(it.name) || `Item ${i + 1}`,
      price: num(it.price),
    };
  });

  const surchargesInput = Array.isArray(obj.surcharges) ? obj.surcharges : [];
  const surcharges = surchargesInput
    .map((raw) => {
      const s = (raw ?? {}) as Record<string, unknown>;
      return { label: str(s.label) || "Surcharge", amount: num(s.amount) };
    })
    .filter((s) => s.amount !== 0 || s.label);

  const subtotal = num(obj.subtotal);
  const computedSubtotal = items.reduce((sum, it) => sum + it.price, 0);

  return {
    restaurant: str(obj.restaurant),
    date: str(obj.date),
    items,
    subtotal: subtotal || computedSubtotal,
    tax: num(obj.tax),
    tip: num(obj.tip),
    surcharges,
    total: num(obj.total),
    gratuityIncluded: Boolean(obj.gratuityIncluded),
  };
}
