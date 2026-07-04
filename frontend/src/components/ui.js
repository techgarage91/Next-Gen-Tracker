import React from "react";
import { X } from "lucide-react";

export function cx(...c) { return c.filter(Boolean).join(" "); }

export function Button({ variant = "primary", className, children, ...p }) {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-cyan text-black border border-cyan hover:bg-cyan-hi glow-cyan",
    volt: "bg-volt text-black border border-volt hover:brightness-110",
    secondary: "bg-transparent text-ink-1 border border-line hover:border-volt hover:text-volt font-mono",
    ghost: "bg-transparent text-ink-2 hover:text-ink-1 hover:bg-surface-2",
    danger: "bg-transparent text-err border border-err/50 hover:bg-err hover:text-black",
  };
  return <button className={cx(base, styles[variant], className)} {...p}>{children}</button>;
}

export function Card({ className, children, ...p }) {
  return <div className={cx("bg-surface border border-line p-6", className)} {...p}>{children}</div>;
}

export function Label({ children, className }) {
  return <label className={cx("block text-[11px] font-mono uppercase tracking-widest text-ink-2 mb-2", className)}>{children}</label>;
}

export function Input({ className, ...p }) {
  return <input className={cx("w-full bg-bg border-b-2 border-line px-1 py-2.5 text-ink-1 font-mono text-sm outline-none focus:border-cyan transition-colors placeholder:text-ink-3", className)} {...p} />;
}

export function Textarea({ className, ...p }) {
  return <textarea className={cx("w-full bg-bg border border-line p-3 text-ink-1 font-mono text-sm outline-none focus:border-cyan transition-colors placeholder:text-ink-3", className)} {...p} />;
}

export function Select({ className, children, ...p }) {
  return (
    <select className={cx("w-full bg-bg border-b-2 border-line px-1 py-2.5 text-ink-1 font-mono text-sm outline-none focus:border-cyan transition-colors", className)} {...p}>
      {children}
    </select>
  );
}

export function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>;
}

const STATUS_MAP = {
  Done: "border-ok text-ok", Pending: "border-warn text-warn", Returned: "border-ink-3 text-ink-2",
  Paid: "border-ok text-ok", Unpaid: "border-err text-err",
};
export function StatusBadge({ value, className }) {
  return <span className={cx("inline-block px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border", STATUS_MAP[value] || "border-line text-ink-2", className)}>{value}</span>;
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:p-8" onMouseDown={onClose}>
      <div
        className={cx("relative w-full bg-surface border border-line my-4", wide ? "max-w-3xl" : "max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
        data-testid="modal"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display font-bold text-lg tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-ink-3 hover:text-cyan transition-colors" data-testid="modal-close-btn"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-ink-3">
      <div className="h-8 w-8 border-2 border-line border-t-cyan rounded-full animate-spin" />
      {label && <span className="font-mono text-xs uppercase tracking-widest">{label}</span>}
    </div>
  );
}
