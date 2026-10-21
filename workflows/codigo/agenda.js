// Tonight's games, with the tip-off in Brasília time.
function lerAgenda(resposta) {
  if (!resposta || resposta.error || !Array.isArray(resposta.events)) {
    return { tipo: "agenda", jogos: [], falha: "agenda indisponível" };
  }
  const hora = (iso) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const lado = (t) => ({ sigla: t.team.abbreviation, nome: t.team.displayName, apelido: t.team.shortDisplayName, campanha: t.records?.[0]?.summary ?? null });
  const jogos = resposta.events
    .filter((e) => e.status?.type?.state === "pre")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const c = e.competitions[0];
      return {
        id: String(e.id),
        hora: hora(e.date),
        casa: lado(c.competitors.find((t) => t.homeAway === "home")),
        visitante: lado(c.competitors.find((t) => t.homeAway === "away")),
      };
    });
  return { tipo: "agenda", jogos, falha: null };
}

if (typeof $input !== "undefined") {
  return [{ json: lerAgenda($input.first().json) }];
} else {
  module.exports = { lerAgenda };
}
