import type { ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useNow';

export function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <span
      role="status"
      className="anim-fade inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1 text-[12px] font-semibold text-[var(--muted)] shadow-sm"
    >
      <WifiOff size={13} aria-hidden /> Offline · dados guardados no iPhone
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[24px] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">{children}</h2>
      {action}
    </div>
  );
}

export function IconBubble({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${className}`}>{children}</span>;
}
