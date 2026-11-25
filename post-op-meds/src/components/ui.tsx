import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { StatusLevel } from '../lib/types';

export const LEVEL_STYLES: Record<StatusLevel, { chip: string; dot: string; ring: string; text: string }> = {
  green: { chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700' },
  yellow: { chip: 'bg-amber-50 text-amber-900 border-amber-300', dot: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-amber-700' },
  red: { chip: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-700' },
};

export function StatusChip({ level, label }: { level: StatusLevel; label: string }) {
  const s = LEVEL_STYLES[level];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${s.chip}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      {label}
    </span>
  );
}

export function Modal({ open, onClose, title, children, tone = 'default' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; tone?: 'default' | 'danger';
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl ${tone === 'danger' ? 'border-t-8 border-red-500' : ''}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <h2 id={titleId} className="text-lg font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="סגור" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/60">
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600"
      />
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-slate-600">{description}</span>}
      </span>
    </label>
  );
}

export function Callout({ tone, icon, children }: { tone: 'red' | 'amber' | 'blue'; icon?: ReactNode; children: ReactNode }) {
  const cls = {
    red: 'border-red-300 bg-red-50 text-red-900',
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border p-3 text-sm ${cls}`} role={tone === 'red' ? 'alert' : undefined}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[.98]',
  danger: 'inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 font-bold text-white transition hover:bg-red-600 active:scale-[.98]',
  ghost: 'inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100',
};
