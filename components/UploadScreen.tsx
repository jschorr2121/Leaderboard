"use client";

import { useCallback, useRef, useState } from "react";
import { Receipt } from "@/lib/types";

const LOADING_LINES = [
  "Reading the fine print…",
  "Counting the appetizers…",
  "Squinting at the tax line…",
  "Itemizing your night out…",
  "Decoding the handwriting…",
  "Adding up the damage…",
];

interface Props {
  imageDataUrl: string | null;
  onImage: (dataUrl: string) => void;
  onParsed: (receipt: Receipt, raw: string) => void;
  onManual: () => void;
}

type ErrorState = {
  message: string;
  raw?: string | null;
  retryable: boolean;
} | null;

// Downscale large photos client-side so uploads stay fast and within API limits.
async function fileToScaledDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });

  // HEIC can't be drawn to canvas in most browsers — pass through and let the
  // server respond with a friendly conversion message if needed.
  if (file.type === "image/heic" || file.type === "image/heif") {
    return dataUrl;
  }

  try {
    const img = await loadImage(dataUrl);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    if (scale >= 1) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}

export default function UploadScreen({
  imageDataUrl,
  onImage,
  onParsed,
  onManual,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingLine, setLoadingLine] = useState(LOADING_LINES[0]);
  const [error, setError] = useState<ErrorState>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      try {
        const dataUrl = await fileToScaledDataUrl(file);
        onImage(dataUrl);
      } catch {
        setError({ message: "Couldn't read that image. Try another.", retryable: true });
      }
    },
    [onImage]
  );

  const parse = useCallback(async () => {
    if (!imageDataUrl) return;
    setError(null);
    setLoading(true);
    let lineIdx = 0;
    const interval = setInterval(() => {
      lineIdx = (lineIdx + 1) % LOADING_LINES.length;
      setLoadingLine(LOADING_LINES[lineIdx]);
    }, 1800);

    try {
      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data?.message || "Something went wrong reading the receipt.",
          raw: data?.raw ?? null,
          retryable: true,
        });
        return;
      }
      onParsed(data.receipt as Receipt, data.raw as string);
    } catch {
      setError({
        message: "Network hiccup — couldn't reach the server.",
        retryable: true,
      });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [imageDataUrl, onParsed]);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <header className="pt-2 text-center">
        <h1 className="text-3xl font-black tracking-tight">
          Split<span className="text-emerald-500">Snap</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Snap a receipt. Split it fairly. Done.
        </p>
      </header>

      {!imageDataUrl ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
            dragOver
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-300 bg-white hover:border-emerald-300"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            🧾
          </div>
          <div>
            <p className="font-semibold text-slate-700">Drop a receipt photo</p>
            <p className="text-sm text-slate-400">or tap to choose a file</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          />
        </label>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageDataUrl}
            alt="Receipt preview"
            className="max-h-[55vh] w-full object-contain bg-slate-100"
          />
          <button
            onClick={() => {
              onImage("");
              setError(null);
            }}
            disabled={loading}
            className="w-full border-t border-slate-100 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            Choose a different photo
          </button>
        </div>
      )}

      {/* Camera capture (mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
      />

      {!imageDataUrl && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.98]"
          >
            📁 Upload
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm active:scale-[0.98]"
          >
            📷 Take Photo
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm">
          <p className="font-semibold text-rose-700">😬 {error.message}</p>
          {error.raw && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-rose-500">
                Show what the AI saw
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] text-slate-600">
                {error.raw}
              </pre>
            </details>
          )}
          <div className="mt-3 flex gap-2">
            {error.retryable && imageDataUrl && (
              <button
                onClick={parse}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
              >
                Retry
              </button>
            )}
            <button
              onClick={onManual}
              className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700"
            >
              Enter items manually
            </button>
          </div>
        </div>
      )}

      {imageDataUrl && !loading && (
        <button
          onClick={parse}
          className="rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 transition active:scale-[0.98]"
        >
          ✨ Parse Receipt
        </button>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-500" />
          <p className="text-sm font-medium text-slate-600">{loadingLine}</p>
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="shimmer h-3 rounded bg-slate-100"
                style={{ width: `${90 - i * 15}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <button
          onClick={onManual}
          className="text-center text-sm font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
        >
          or skip the photo and enter items manually
        </button>
      )}
    </div>
  );
}
