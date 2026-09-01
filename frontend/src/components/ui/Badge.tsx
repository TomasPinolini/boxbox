import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
