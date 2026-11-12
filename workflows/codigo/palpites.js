// A pick for each of tonight's games. The chance comes from a source, never from the
// model: ESPN's Matchup Predictor first, then the betting line, and only when neither
// exists a plain estimate from the records. The model only writes the "why", from the
// context gathered here (records home and away, last five, second night in a row).
const ET = "America/New_York";

const diaET = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const ontemET = (iso) => diaET(new Date(new Date(iso).getTime() - 24 * 3600 * 1000).toISOString());
const aproveitamento = (campanha) => {
  const [v, d] = String(campanha ?? "").split("-").map(Number);
  return v + d > 0 ? v / (v + d) : 0.5;
};
// Moneyline → implied probability (still carries the bookmaker's margin; normalized below).
const implicita = (ml) => (ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100));

function chanceCasa(resumo, jogo) {
  const p = Number(resumo?.predictor?.homeTeam?.gameProjection);
  if (p > 0 && p < 100) return { chance: Math.round(p), fonte: "ESPN" };
  const linha = (resumo?.pickcenter ?? []).find((x) => x.homeTeamOdds?.moneyLine && x.awayTeamOdds?.moneyLine);
  if (linha) {
    const c = implicita(linha.homeTeamOdds.moneyLine);
    const v = implicita(linha.awayTeamOdds.moneyLine);
    return { chance: Math.round((100 * c) / (c + v)), fonte: "apostas" };
  }
  // Records alone: the better team wins more, and home court is worth a few points.
  const casa = aproveitamento(jogo.casa.campanha);
  const fora = aproveitamento(jogo.visitante.campanha);
  const chance = Math.round(100 * Math.min(0.85, Math.max(0.15, 0.5 + (casa - fora) / 2 + 0.06)));
  return { chance, fonte: "campanha" };
}

function lerPalpite(resumo, jogo) {
  const { chance, fonte } = chanceCasa(resumo, jogo);
  const favoritoCasa = chance >= 50;
  const ultimos = Object.fromEntries(
    (resumo?.lastFiveGames ?? []).map((t) => [
      t.team?.abbreviation,
      (t.events ?? []).slice().sort((a, b) => String(a.gameDate).localeCompare(String(b.gameDate))),
    ]),
  );
  const contexto = (lado) => {
    const jogos = ultimos[lado.sigla] ?? [];
    const ultimo = jogos.at(-1);
    return {
      sigla: lado.sigla,
      campanha: lado.campanha,
      em_casa: lado.em_casa ?? null,
      fora_de_casa: lado.fora_de_casa ?? null,
      ultimos_5: jogos.map((g) => g.gameResult).join("") || null,
      // Played last night (US calendar): tired legs, often a rotation player rested.
      segunda_noite_seguida: Boolean(ultimo && jogo.data && diaET(ultimo.gameDate) === ontemET(jogo.data)),
    };
  };
  return {
    favorito: favoritoCasa ? jogo.casa.sigla : jogo.visitante.sigla,
    chance: favoritoCasa ? chance : 100 - chance,
    fonte,
    contexto: { casa: contexto(jogo.casa), visitante: contexto(jogo.visitante) },
  };
}

if (typeof $input !== "undefined") {
  const agenda = $input.first().json;
  const jogos = [];
  for (const jogo of agenda.jogos ?? []) {
    let resumo = null;
    try {
      resumo = await this.helpers.httpRequest({
        url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${jogo.id}`,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SextoHomem/1.0; +https://github.com/guialmm/sexto-homem)" },
        json: true,
        timeout: 20000,
      });
    } catch {
      // without the summary the pick falls back to the records
    }
    jogos.push({ ...jogo, palpite: lerPalpite(resumo, jogo) });
  }
  return [{ json: { ...agenda, jogos } }];
} else {
  module.exports = { lerPalpite };
}
