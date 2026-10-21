// The official injury report is a PDF published every 15 minutes on the NBA's
// file server, the time in its name ("Injury-Report_2026-10-21_09_45AM.pdf").
// The page that lists them blocks bots, so instead of scraping it this walks back
// from now in 15-minute steps and takes the first file that exists. The files
// are public; this bot still says who it is.
function candidatos(agora) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  const dia = `${partes.year}-${partes.month}-${partes.day}`;
  let minutos = (Number(partes.hour) % 24) * 60 + Math.floor(Number(partes.minute) / 15) * 15;
  const lista = [];
  for (; minutos >= 0 && lista.length < 40; minutos -= 15) {
    const h24 = Math.floor(minutos / 60);
    const h12 = String(h24 % 12 || 12).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");
    lista.push(`https://ak-static.cms.nba.com/referee/injury/Injury-Report_${dia}_${h12}_${m}${h24 < 12 ? "AM" : "PM"}.pdf`);
  }
  return lista;
}

if (typeof $input !== "undefined") {
  const fixa = $env.SEXTO_DATA;
  const agora = fixa ? new Date(`${fixa}T08:00:00-03:00`) : new Date();
  for (const url of candidatos(agora)) {
    try {
      await this.helpers.httpRequest({ method: "HEAD", url, headers: { "User-Agent": "Mozilla/5.0 (compatible; SextoHomem/1.0; +https://github.com/guialmm/sexto-homem)" } });
      return [{ json: { pdf: url } }];
    } catch {
      // not published at that time: try 15 minutes earlier
    }
  }
  return [{ json: { pdf: null } }];
} else {
  module.exports = { candidatos };
}
