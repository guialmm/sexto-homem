// What happened in each of last night's games beyond the box score: ESPN's recap
// (where an injury during the game shows up, "left in the third quarter with a sore
// ankle") and the highlight clips (a poster dunk, a buzzer-beater) with their links.
// The model reads both to write a fuller comment; a game whose summary fails keeps
// its score and leaders, just with less to say.
const MAX_RECAP = 1800;
const MAX_LANCES = 6;

function semHtml(texto) {
  return String(texto ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function lerResumo(resumo) {
  if (!resumo || resumo.error) return { recap: null, lances: [] };
  const recap = semHtml(resumo.article?.story).slice(0, MAX_RECAP) || null;
  const vistos = new Set();
  const lances = (resumo.videos ?? [])
    .map((v) => ({ titulo: semHtml(v.headline), url: v.links?.web?.href ?? null }))
    // The full-game package says nothing about a specific play.
    .filter((v) => v.titulo && !/game highlights|full highlights|postgame|press conference/i.test(v.titulo))
    .filter((v) => !vistos.has(v.titulo) && vistos.add(v.titulo))
    .slice(0, MAX_LANCES)
    // Only https links to ESPN's own video pages go into the e-mail.
    .map((v, i) => ({ n: i + 1, titulo: v.titulo, url: /^https:\/\/www\.espn\.com\//.test(v.url ?? "") ? v.url : null }));
  return { recap, lances };
}

if (typeof $input !== "undefined") {
  const resultados = $input.first().json;
  const jogos = [];
  for (const jogo of resultados.jogos ?? []) {
    let resumo = null;
    try {
      resumo = await this.helpers.httpRequest({
        url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${jogo.id}`,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SextoHomem/1.0; +https://github.com/guialmm/sexto-homem)" },
        json: true,
        timeout: 20000,
      });
    } catch {
      // keep going: one summary down must not sink the edition
    }
    jogos.push({ ...jogo, ...lerResumo(resumo) });
  }
  return [{ json: { ...resultados, jogos } }];
} else {
  module.exports = { lerResumo, semHtml };
}
