import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarCheck2, X } from 'lucide-react';
import { db } from '../db/db';
import { IMPORT_NOTICE_KEY, type ImportNotice } from '../db/seed';
import { formatMonthYear, parseISO } from '../lib/dates';

/** Aviso no ecrã inicial quando chega uma escala nova ou corrigida. */
export function ImportBanner({ go }: { go: (path: string) => void }) {
  const notice = useLiveQuery(() => db.settings.get(IMPORT_NOTICE_KEY), [])?.value as ImportNotice | undefined;
  if (!notice?.reports.length) return null;
  const dismiss = () => db.settings.delete(IMPORT_NOTICE_KEY);

  return (
    <div role="status" className="anim-rise rounded-[24px] bg-sky-50 p-4 text-sky-950 dark:bg-sky-500/15 dark:text-sky-50">
      <div className="flex items-start gap-3">
        <CalendarCheck2 size={24} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          {notice.reports.map((r) => {
            const { year, month } = parseISO(`${r.month}-01`);
            const name = formatMonthYear(year, month);
            return (
              <div key={r.month}>
                <p className="text-[16px] font-bold leading-snug">
                  {r.isNew ? `Chegou a escala de ${name}` : `A escala de ${name} foi corrigida`}
                </p>
                <p className="text-[14px] leading-snug opacity-85">
                  {r.isNew
                    ? `${r.added} ${r.added === 1 ? 'dia adicionado' : 'dias adicionados'}.`
                    : `${r.added + r.updated + r.removed} ${r.added + r.updated + r.removed === 1 ? 'dia alterado' : 'dias alterados'}.`}
                  {r.kept.length > 0 &&
                    ` ${r.kept.length} ${r.kept.length === 1 ? 'dia ficou' : 'dias ficaram'} como tu alteraste (dia ${r.kept
                      .map((d) => parseISO(d).day)
                      .join(', ')}).`}{' '}
                  Confere os dias marcados a azul.
                </p>
                <button
                  onClick={() => {
                    void dismiss();
                    go(`/calendario/${r.month}`);
                  }}
                  className="press mt-2 rounded-full bg-sky-600 px-4 py-2 text-[14px] font-semibold text-white"
                >
                  Ver {name.split(' ')[0]}
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={dismiss} aria-label="Fechar aviso" className="press grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/5 dark:bg-white/10">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
