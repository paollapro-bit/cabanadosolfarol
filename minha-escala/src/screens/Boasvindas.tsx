import { useState } from 'react';
import { CalendarDays, Camera, WifiOff } from 'lucide-react';
import { setNome } from '../lib/perfil';

/** Primeira abertura (versão para qualquer pessoa): pede só o nome. */
export function Boasvindas() {
  const [nome, setNomeLocal] = useState('');
  const valido = nome.trim().length >= 2;
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pt-safe pb-safe">
      <div className="anim-rise flex-1 pt-10">
        <img src="./apple-touch-icon.png" alt="" className="h-20 w-20 rounded-[22px] shadow-lg" />
        <h1 className="mt-6 text-[34px] font-extrabold leading-tight tracking-tight">Minha Escala</h1>
        <p className="mt-2 text-[18px] leading-snug text-[var(--muted)]">O teu turno de hoje, num relance.</p>

        <ul className="mt-8 space-y-4 text-[16px]">
          <li className="flex gap-3">
            <Camera className="mt-0.5 shrink-0 text-[var(--accent)]" size={22} aria-hidden />
            Tira uma fotografia à escala e a app lê a tua linha. Tu confirmas antes de guardar.
          </li>
          <li className="flex gap-3">
            <CalendarDays className="mt-0.5 shrink-0 text-[var(--accent)]" size={22} aria-hidden />
            Vê a que horas entras, a que horas sais e quando é a próxima folga.
          </li>
          <li className="flex gap-3">
            <WifiOff className="mt-0.5 shrink-0 text-[var(--accent)]" size={22} aria-hidden />
            Depois de instalada, funciona sem internet. A tua escala fica só no teu telemóvel.
          </li>
        </ul>
      </div>

      <form
        className="anim-rise space-y-3 pb-4 pt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) void setNome(nome);
        }}
      >
        <label className="block">
          <span className="mb-2 block text-[15px] font-semibold">Como te chamas?</span>
          <input
            value={nome}
            onChange={(e) => setNomeLocal(e.target.value)}
            autoComplete="given-name"
            placeholder="O teu nome"
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 text-[18px] outline-none focus:border-[var(--accent)]"
          />
        </label>
        <button
          type="submit"
          disabled={!valido}
          className="press w-full rounded-2xl bg-[var(--ink)] py-4 text-[18px] font-bold text-[var(--bg)] disabled:opacity-40"
        >
          Começar
        </button>
      </form>
    </div>
  );
}
