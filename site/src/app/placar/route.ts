// Last night's final scores for the ticker at the top of the page. The site reads
// ESPN's public scoreboard on the server (the browser can't, because of CORS).
type Time = { team: { abbreviation: string }; score: string; homeAway: "home" | "away"; winner?: boolean };
type Evento = { status: { type: { completed: boolean } }; competitions: { competitors: Time[] }[] };

function diaEUA(deslocamentoDias: number): string {
  const d = new Date(Date.now() + deslocamentoDias * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d)
    .replaceAll("-", "");
}

export async function GET() {
  // Yesterday first; on a day off, walk back up to three days.
  for (let dias = 1; dias <= 4; dias++) {
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${diaEUA(-dias)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const eventos: Evento[] = (await r.json()).events ?? [];
      const jogos = eventos
        .filter((e) => e.status.type.completed)
        .map((e) => {
          const [a, b] = e.competitions[0].competitors;
          const [visitante, casa] = a.homeAway === "away" ? [a, b] : [b, a];
          return {
            visitante: { sigla: visitante.team.abbreviation, pontos: Number(visitante.score), venceu: Boolean(visitante.winner) },
            casa: { sigla: casa.team.abbreviation, pontos: Number(casa.score), venceu: Boolean(casa.winner) },
          };
        });
      if (jogos.length) return Response.json({ jogos, ha: dias });
    } catch {
      // ESPN slow or down: try the day before, then give up quietly
    }
  }
  return Response.json({ jogos: [], ha: null });
}
