import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Info, Trash2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { useNotify } from './Announcer';
import { db } from '../db/db';
import { formatMonthYear } from '../lib/dates';
import { photoImporter } from '../lib/importers/photo';

interface Props {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
}

/**
 * Guarda a fotografia da escala do mês, para conferir enquanto se preenche.
 * NÃO há reconhecimento automático (ver lib/importers/photo.ts).
 */
export function PhotoSheet({ open, year, month, onClose }: Props) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const photo = useLiveQuery(() => db.attachments.where('month').equals(key).last(), [key]);
  const input = useRef<HTMLInputElement>(null);
  const notify = useNotify();
  const [zoom, setZoom] = useState(false);

  const url = useMemo(() => (photo ? URL.createObjectURL(photo.blob) : null), [photo]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    await db.transaction('rw', db.attachments, async () => {
      await db.attachments.where('month').equals(key).delete();
      await db.attachments.add({ month: key, name: file.name, type: file.type, blob: file, createdAt: Date.now() });
    });
    notify('Fotografia guardada');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Fotografia da escala" subtitle={<span className="capitalize">{formatMonthYear(year, month)}</span>}>
      <div className="space-y-4 pt-1">
        {url ? (
          <button onClick={() => setZoom((z) => !z)} className="block w-full overflow-auto rounded-2xl bg-[var(--surface-2)]" aria-label={zoom ? 'Reduzir' : 'Ampliar'}>
            <img src={url} alt={`Fotografia da escala de ${formatMonthYear(year, month)}`} className={zoom ? 'max-w-none w-[220%]' : 'w-full'} />
          </button>
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl border-2 border-dashed border-[var(--line)] text-[15px] text-[var(--muted)]">
            Ainda não há fotografia deste mês.
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => input.current?.click()}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] py-3.5 text-[16px] font-bold text-[var(--bg)]"
          >
            <Camera size={20} aria-hidden /> {url ? 'Substituir' : 'Adicionar fotografia'}
          </button>
          {photo && (
            <button
              onClick={async () => {
                if (photo.id !== undefined && confirm('Apagar a fotografia deste mês?')) {
                  await db.attachments.delete(photo.id);
                  notify('Fotografia apagada');
                }
              }}
              aria-label="Apagar fotografia"
              className="press grid w-14 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
        <input ref={input} type="file" accept={photoImporter.accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

        <div className="flex gap-3 rounded-2xl bg-[var(--surface-2)] p-3.5 text-[14px] leading-snug text-[var(--muted)]">
          <Info size={20} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            A leitura automática da fotografia <strong className="text-[var(--ink)]">ainda não está disponível</strong>. Guarda aqui a
            fotografia para a teres à mão enquanto preenches os dias com “Editar vários dias”. As fotografias ficam só neste iPhone e
            não entram na cópia de segurança.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
