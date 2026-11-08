import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ShiftDef } from '../lib/shifts';
import { CHIP } from '../lib/theme';

export function codeLabel(code: string | null, shifts: Map<string, ShiftDef>): string {
  if (!code) return 'Sem escala';
  const s = shifts.get(code);
  if (!s) return code;
  return s.type === 'folga' ? `${code} · Folga` : `${code} · ${s.role}`;
}

function Chip({ code, shifts }: { code: string | null; shifts: Map<string, ShiftDef> }) {
  const s = code ? shifts.get(code) : undefined;
  return (
    <span
      className={`inline-flex min-w-[64px] flex-col items-center rounded-2xl px-3 py-2 ${s ? CHIP[s.type] : 'border-2 border-dashed border-[var(--line)] text-[var(--muted)]'}`}
    >
      <span className="text-xl font-extrabold leading-none">{code ?? '—'}</span>
      <span className="mt-1 text-[11px] font-semibold">{s ? (s.type === 'folga' ? 'Folga' : s.role) : 'Sem escala'}</span>
    </span>
  );
}

interface Props {
  title: string;
  from?: string | null;
  to: string | null;
  shifts: Map<string, ShiftDef>;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Pede confirmação antes de substituir um turno que já estava definido. */
export function ConfirmChange({ title, from, to, shifts, detail, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    box.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, []);
  return (
    <div
      ref={box}
      role="alertdialog"
      aria-label={title}
      className="anim-fade rounded-3xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-50"
    >
      <div className="flex items-center gap-2 text-[17px] font-bold">
        <AlertTriangle size={20} aria-hidden /> {title}
      </div>
      {from !== undefined && (
        <div className="mt-3 flex items-center justify-center gap-3" aria-hidden>
          <Chip code={from} shifts={shifts} />
          <ArrowRight size={22} />
          <Chip code={to} shifts={shifts} />
        </div>
      )}
      {detail && <p className="mt-3 text-[14px] leading-snug">{detail}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="press rounded-2xl bg-white py-3.5 text-[15px] font-bold text-neutral-900 shadow-sm dark:bg-white/15 dark:text-white">
          {cancelLabel}
        </button>
        <button onClick={onConfirm} className="press rounded-2xl bg-amber-600 py-3.5 text-[15px] font-bold text-white">
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
