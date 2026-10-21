// Last night's finished games from ESPN's scoreboard JSON.
function lerPlacares(resposta) {
  if (!resposta || resposta.error || !Array.isArray(resposta.events)) {
    return { tipo: "resultados", jogos: [], falha: "placares indisponíveis" };
  }
  const lider = (time, categoria) => {
    const l = time.leaders?.find((x) => x.name === categoria)?.leaders?.[0];
    return l ? { nome: l.athlete?.displayName, valor: Number(l.value) } : null;
  };
  const lado = (t) => ({
    sigla: t.team.abbreviation,
    nome: t.team.displayName,
    apelido: t.team.shortDisplayName,
    pontos: Number(t.score),
    campanha: t.records?.[0]?.summary ?? null,
    venceu: Boolean(t.winner),
    cestinha: lider(t, "points"),
    rebotes: lider(t, "rebounds"),
    assistencias: lider(t, "assists"),
  });
  const jogos = resposta.events
    .filter((e) => e.status?.type?.completed)
    .map((e) => {
      const c = e.competitions[0];
      const casa = lado(c.competitors.find((t) => t.homeAway === "home"));
      const visitante = lado(c.competitors.find((t) => t.homeAway === "away"));
      return {
        id: String(e.id),
        casa,
        visitante,
        prorrogacoes: Math.max(0, (e.status.period ?? 4) - 4),
        manchete: c.headlines?.[0]?.description ?? null,
      };
    });
  return { tipo: "resultados", jogos, falha: null };
}

if (typeof $input !== "undefined") {
  return [{ json: lerPlacares($input.first().json) }];
} else {
  module.exports = { lerPlacares };
}
