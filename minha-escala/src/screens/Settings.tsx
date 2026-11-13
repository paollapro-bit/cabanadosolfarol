import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  CalendarPlus,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sun,
  SunMoon,
  Upload,
  HardDrive,
} from 'lucide-react';
import { db } from '../db/db';
import { CODIGO_ACESSO_KEY, setNome, useNome } from '../lib/perfil';
import { BREAK_KEY, LAST_BACKUP_KEY, putSetting, resetShifts, saveShift } from '../db/repo';
import { useBreakMinutes, useShifts } from '../hooks/useData';
import { Card, OfflineBadge, SectionTitle } from '../components/Common';
import { Sheet } from '../components/Sheet';
import { useNotify } from '../components/Announcer';
import { applyTheme, CHIP, getThemePref, type ThemePref } from '../lib/theme';
import { backupFileName, BackupError, createBackup, parseBackup, restoreBackup } from '../lib/backup';
import { saveFile, scheduleCsv, scheduleIcs } from '../lib/export';
import { formatDuration, grossMinutes, isValidTime, netMinutes, shiftTimeRange, TYPE_LABEL, type ShiftDef, type ShiftType } from '../lib/shifts';

export function Settings({ back }: { back: () => void }) {
  const shifts = useShifts();
  const breakMinutes = useBreakMinutes();
  const notify = useNotify();
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  const [editing, setEditing] = useState<ShiftDef | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastBackup = useLiveQuery(() => db.settings.get(LAST_BACKUP_KEY), []);
  const dayCount = useLiveQuery(() => db.days.count(), []);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const chooseTheme = (t: ThemePref) => {
    setTheme(t);
    applyTheme(t);
  };

  const setBreak = (v: number) => putSetting(BREAK_KEY, Math.min(180, Math.max(0, v)));

  const exportBackup = async () => {
    const backup = await createBackup(db);
    const r = await saveFile(JSON.stringify(backup, null, 2), backupFileName(), 'application/json');
    if (r !== 'cancelado') {
      await putSetting(LAST_BACKUP_KEY, Date.now());
      notify('Cópia de segurança criada');
    }
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const when = new Date(backup.exportedAt).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'long', timeStyle: 'short' });
      if (!confirm(`Restaurar a cópia de ${when} (${backup.days.length} dias)?\n\nA escala atual neste iPhone será substituída.`)) return;
      await restoreBackup(db, backup);
      notify('Cópia restaurada');
    } catch (e) {
      alert(e instanceof BackupError ? e.message : 'Não foi possível ler o ficheiro.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const exportCsv = async () => {
    if (!shifts) return;
    const days = await db.days.toArray();
    await saveFile(scheduleCsv(days, shifts.map), 'minha-escala.csv', 'text/csv');
  };

  const exportIcs = async () => {
    if (!shifts) return;
    const days = await db.days.toArray();
    await saveFile(scheduleIcs(days, shifts.map), 'minha-escala.ics', 'text/calendar');
  };

  const lastBackupText =
    typeof lastBackup?.value === 'number'
      ? `Última cópia: ${new Date(lastBackup.value).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', day: 'numeric', month: 'long', year: 'numeric' })}`
      : 'Ainda não fizeste nenhuma cópia.';

  return (
    <div className="mx-auto max-w-lg px-4 pt-safe pb-safe">
      <div className="flex items-center justify-between pb-1 pt-2">
        <button onClick={back} className="press -ml-1 flex items-center gap-0.5 py-2 pr-2 text-[17px] font-semibold text-[var(--accent)]">
          <ChevronLeft size={26} aria-hidden /> Hoje
        </button>
        <OfflineBadge />
      </div>
      <h1 className="px-1 pb-5 text-[32px] font-extrabold tracking-tight">Definições</h1>

      <div className="space-y-7">
        <Perfil />

        <section>
          <SectionTitle>Aparência</SectionTitle>
          <Card className="grid grid-cols-3 gap-1 p-1.5">
            {(
              [
                ['sistema', 'Automático', SunMoon],
                ['claro', 'Claro', Sun],
                ['escuro', 'Escuro', Moon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => chooseTheme(value)}
                aria-pressed={theme === value}
                className={`press flex flex-col items-center gap-1 rounded-[18px] py-3 text-[14px] font-semibold ${
                  theme === value ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--muted)]'
                }`}
              >
                <Icon size={20} aria-hidden /> {label}
              </button>
            ))}
          </Card>
        </section>

        <section>
          <SectionTitle>Cálculo de horas</SectionTitle>
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[16px] font-semibold">Intervalo de descanso</div>
                <div className="text-[13px] text-[var(--muted)]">Descontado em cada turno de trabalho</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setBreak(breakMinutes - 5)} aria-label="Menos 5 minutos" className="press grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-2)]">
                  <Minus size={18} />
                </button>
                <span className="tabular w-16 text-center text-[18px] font-bold" aria-live="polite">
                  {breakMinutes} min
                </span>
                <button onClick={() => setBreak(breakMinutes + 5)} aria-label="Mais 5 minutos" className="press grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-2)]">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle
            action={
              <button
                onClick={async () => {
                  if (confirm('Repor os horários e funções originais dos turnos?')) {
                    await resetShifts();
                    notify('Turnos repostos');
                  }
                }}
                className="flex items-center gap-1 text-[14px] font-semibold text-[var(--accent)]"
              >
                <RotateCcw size={14} aria-hidden /> Repor
              </button>
            }
          >
            Turnos
          </SectionTitle>
          <Card className="divide-y divide-[var(--line)] overflow-hidden">
            {shifts?.list.map((s) => (
              <button key={s.code} onClick={() => setEditing(s)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className={`grid h-10 w-12 shrink-0 place-items-center rounded-xl text-[16px] font-extrabold ${CHIP[s.type]}`}>{s.code}</span>
                <div className="flex-1">
                  <div className="text-[16px] font-semibold">
                    {TYPE_LABEL[s.type]} · {s.role}
                  </div>
                  <div className="tabular text-[13px] text-[var(--muted)]">
                    {s.type === 'folga' ? 'Dia de descanso' : `${shiftTimeRange(s)} · ${formatDuration(netMinutes(s, breakMinutes))} líquidas`}
                  </div>
                </div>
                <ChevronRight size={18} className="text-[var(--muted)]" aria-hidden />
              </button>
            ))}
          </Card>
        </section>

        <section>
          <SectionTitle>Cópia de segurança</SectionTitle>
          <Card className="p-4">
            <div className="flex gap-3">
              <ShieldCheck size={24} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              <p className="text-[14px] leading-snug text-[var(--muted)]">
                A escala fica guardada apenas neste iPhone. Se apagares os dados do Safari ou removeres a aplicação, a escala perde-se. Faz uma cópia
                de vez em quando e guarda-a em “Ficheiros”, no iCloud ou envia-a para ti própria.
              </p>
            </div>
            <p className="mt-3 text-[13px] font-semibold">{lastBackupText}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={exportBackup} className="press flex items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] py-3.5 text-[15px] font-bold text-[var(--bg)]">
                <Download size={18} aria-hidden /> Fazer cópia
              </button>
              <button
                onClick={() => fileInput.current?.click()}
                className="press flex items-center justify-center gap-2 rounded-2xl bg-[var(--surface-2)] py-3.5 text-[15px] font-bold"
              >
                <Upload size={18} aria-hidden /> Restaurar
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => importBackup(e.target.files?.[0])}
            />
          </Card>
        </section>

        <section>
          <SectionTitle>Exportar escala</SectionTitle>
          <Card className="divide-y divide-[var(--line)] overflow-hidden">
            <RowButton icon={<CalendarPlus size={20} />} title="Para o Calendário do iPhone" subtitle="Ficheiro .ics com todos os turnos" onClick={exportIcs} />
            <RowButton icon={<FileSpreadsheet size={20} />} title="Folha de cálculo" subtitle="Ficheiro .csv (Excel, Numbers)" onClick={exportCsv} />
          </Card>
        </section>

        <section>
          <SectionTitle>Armazenamento</SectionTitle>
          <Card className="flex items-center gap-3 p-4">
            <HardDrive size={22} className="shrink-0 text-[var(--muted)]" aria-hidden />
            <div className="text-[14px] leading-snug text-[var(--muted)]">
              {dayCount ?? 0} dias registados neste dispositivo.
              {persisted === true && ' Armazenamento protegido pelo sistema.'}
              {persisted === false && ' Instala a aplicação no ecrã principal para proteger melhor os dados.'}
            </div>
          </Card>
        </section>

        <p className="pb-4 text-center text-[13px] text-[var(--muted)]">
          Minha Escala · funciona sem internet
          <br />
          Horários no fuso de Lisboa
        </p>
      </div>

      <ShiftEditor shift={editing} onClose={() => setEditing(null)} breakMinutes={breakMinutes} />
    </div>
  );
}

function RowButton({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span className="text-[var(--accent)]" aria-hidden>
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-[16px] font-semibold">{title}</div>
        <div className="text-[13px] text-[var(--muted)]">{subtitle}</div>
      </div>
      <ChevronRight size={18} className="text-[var(--muted)]" aria-hidden />
    </button>
  );
}

function ShiftEditor({ shift, onClose, breakMinutes }: { shift: ShiftDef | null; onClose: () => void; breakMinutes: number }) {
  return (
    <Sheet open={!!shift} onClose={onClose} title={shift ? `Turno ${shift.code}` : ''} subtitle="As alterações aplicam-se a todos os dias com este código.">
      {shift && <ShiftForm key={shift.code} shift={shift} onDone={onClose} breakMinutes={breakMinutes} />}
    </Sheet>
  );
}

function ShiftForm({ shift, onDone, breakMinutes }: { shift: ShiftDef; onDone: () => void; breakMinutes: number }) {
  const notify = useNotify();
  const [type, setType] = useState<ShiftType>(shift.type);
  const [role, setRole] = useState(shift.role);
  const [start, setStart] = useState(shift.start ?? '09:00');
  const [end, setEnd] = useState(shift.end ?? '17:00');
  const isOff = type === 'folga';
  const valid = role.trim() !== '' && (isOff || (isValidTime(start) && isValidTime(end) && start !== end));
  const preview: ShiftDef = { code: shift.code, type, role, start: isOff ? null : start, end: isOff ? null : end };

  const save = async () => {
    if (!valid) return;
    await saveShift({ ...preview, role: role.trim() });
    notify(`Turno ${shift.code} guardado`);
    onDone();
  };

  const field = 'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[17px] outline-none focus:border-[var(--accent)]';
  return (
    <div className="space-y-4 pt-1">
      <div>
        <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Tipo</div>
        <div className="grid grid-cols-4 gap-1.5">
          {(['abertura', 'fecho', 'intermedio', 'folga'] as ShiftType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`press rounded-2xl py-2.5 text-[13px] font-bold ${CHIP[t]} ${type === t ? 'ring-[3px] ring-[var(--ink)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Função</span>
        <input value={role} onChange={(e) => setRole(e.target.value)} className={field} placeholder="Ex.: Caixa" />
      </label>
      {!isOff && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Entrada</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={`${field} tabular`} />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)]">Saída</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={`${field} tabular`} />
          </label>
        </div>
      )}
      {!isOff && valid && (
        <p className="text-[14px] text-[var(--muted)]">
          {formatDuration(grossMinutes(preview))} no total · {formatDuration(netMinutes(preview, breakMinutes))} sem o intervalo
        </p>
      )}
      <button
        onClick={save}
        disabled={!valid}
        className="press w-full rounded-2xl bg-[var(--ink)] py-4 text-[17px] font-bold text-[var(--bg)] disabled:opacity-40"
      >
        Guardar
      </button>
    </div>
  );
}

function Perfil() {
  const nome = useNome();
  const codigo = useLiveQuery(async () => (await db.settings.get(CODIGO_ACESSO_KEY))?.value ?? '', []);
  const notify = useNotify();
  const field = 'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[17px] outline-none focus:border-[var(--accent)]';
  if (nome === undefined || codigo === undefined) return null;
  return (
    <section>
      <SectionTitle>Perfil</SectionTitle>
      <Card className="space-y-4 p-4">
        <label className="block">
          <span className="mb-1.5 block text-[15px] font-semibold">O teu nome</span>
          <input
            key={nome}
            defaultValue={nome}
            onBlur={async (e) => {
              const v = e.target.value.trim();
              if (v.length >= 2 && v !== nome) {
                await setNome(v);
                notify('Nome guardado');
              } else e.target.value = nome;
            }}
            autoComplete="given-name"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[15px] font-semibold">Código de acesso à leitura (opcional)</span>
          <input
            key={String(codigo)}
            defaultValue={String(codigo)}
            onBlur={async (e) => {
              const v = e.target.value.trim();
              if (v !== codigo) {
                await db.settings.put({ key: CODIGO_ACESSO_KEY, value: v });
                notify('Código guardado');
              }
            }}
            autoCapitalize="off"
            autoCorrect="off"
            className={field}
          />
          <span className="mt-1.5 block text-[13px] leading-snug text-[var(--muted)]">
            Só é preciso se quem gere a aplicação te tiver dado um código para a leitura de fotografias.
          </span>
        </label>
      </Card>
    </section>
  );
}
