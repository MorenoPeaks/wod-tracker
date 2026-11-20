"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fmtTime, parseNum, parseTime } from "@/lib/util";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="card safe-bottom max-h-[88dvh] w-full overflow-y-auto rounded-b-none p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label="Chiudi">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Campo numerico: tiene il testo digitato e salva ad ogni modifica. */
export function NumField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder: string;
  label: string;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  useEffect(() => {
    if (parseNum(text) !== value) setText(value === undefined ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className="input text-center"
      inputMode="decimal"
      placeholder={placeholder}
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNum(e.target.value));
      }}
    />
  );
}

/** Campo tempo mm:ss. */
export function TimeField({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [text, setText] = useState(fmtTime(value));
  useEffect(() => {
    if (parseTime(text) !== value) setText(fmtTime(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className="input text-center"
      inputMode="numeric"
      placeholder="mm:ss"
      aria-label="Tempo (mm:ss)"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseTime(e.target.value));
      }}
      onBlur={() => setText(fmtTime(value))}
    />
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="scroll-x flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          className="chip"
          data-on={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card muted p-6 text-center text-sm">{children}</div>;
}
