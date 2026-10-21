// The dates one edition works with. NBA games are dated in US Eastern time: at
// 8h in Brasília, "last night" is still yesterday over there. SEXTO_DATA
// (YYYY-MM-DD) replays any past morning, for tests and backfills.
function calcularDatas(agora) {
  const dia = (d, tz) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const ontem = new Date(agora.getTime() - 24 * 3600 * 1000);
  return {
    dataEdicao: dia(agora, "America/Sao_Paulo"),
    ontem: dia(ontem, "America/New_York").replaceAll("-", ""),
    hoje: dia(agora, "America/New_York").replaceAll("-", ""),
    // News window: a little over a day, so nothing published at 7:59 slips through.
    desde: new Date(agora.getTime() - 26 * 3600 * 1000).toISOString(),
  };
}

if (typeof $input !== "undefined") {
  const fixa = $env.SEXTO_DATA;
  const agora = fixa ? new Date(`${fixa}T08:00:00-03:00`) : new Date();
  return [{ json: calcularDatas(agora) }];
} else {
  module.exports = { calcularDatas };
}
