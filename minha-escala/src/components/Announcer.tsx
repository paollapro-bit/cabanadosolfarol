import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';

type Notify = (message: string) => void;
const Ctx = createContext<Notify>(() => {});

/** Mensagem breve no ecrã (e lida por leitores de ecrã) — p. ex. "Guardado". */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const notify = useCallback<Notify>((text) => {
    clearTimeout(timer.current);
    setMsg({ text, id: Date.now() });
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <Ctx.Provider value={notify}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe">
        {msg && (
          <div
            key={msg.id}
            className="anim-fade mt-2 flex items-center gap-2 rounded-full bg-neutral-900/90 px-5 py-3 text-[15px] font-medium text-white shadow-lg backdrop-blur dark:bg-white/90 dark:text-neutral-900"
          >
            <Check size={18} strokeWidth={2.5} aria-hidden />
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useNotify = () => useContext(Ctx);
