"use client";

import { useEffect, useState } from "react";

type Lado = { sigla: string; pontos: number; venceu: boolean };
type Jogo = { visitante: Lado; casa: Lado };

/** Scoreboard ticker: last night's real finals scrolling like an arena's LED ribbon. */
export function Placar() {
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [ha, setHa] = useState<number | null>(null);
  useEffect(() => {
    fetch("/placar")
      .then((r) => r.json())
      .then((d) => {
        setJogos(d.jogos ?? []);
        setHa(d.ha);
      })
      .catch(() => {});
  }, []);

  if (!jogos.length) return <div className="h-10 border-y border-ink/10" aria-hidden />;

  const lado = (t: Lado) => (
    <span className={t.venceu ? "text-bg" : "text-bg/45"}>
      {t.sigla} <span className="tabular-nums">{t.pontos}</span>
    </span>
  );
  const faixa = (
    <ul className="flex shrink-0 items-center gap-10 pr-10">
      <li className="font-semibold uppercase tracking-[0.18em] text-bola">{ha === 1 ? "Ontem" : "Última rodada"}</li>
      {jogos.map((j, i) => (
        <li key={i} className="flex items-center gap-2 whitespace-nowrap">
          {lado(j.visitante)}
          <span className="text-bg/30">×</span>
          {lado(j.casa)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group relative flex h-10 items-center overflow-hidden bg-ink font-placar text-lg" aria-label="Placares da última rodada">
      {/* Two copies side by side make the loop seamless. */}
      <div className="animate-letreiro flex group-hover:[animation-play-state:paused]">
        {faixa}
        <div aria-hidden>{faixa}</div>
      </div>
    </div>
  );
}
