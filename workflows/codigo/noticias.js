// Joins the news sources into one list: RSS feeds (one n8n item per story) and
// Lance's news sitemap (one item holding the whole XML). ESPN Brasil's "NBA" feed
// and Lance's sitemap mix in every sport, so only URLs under /nba/ count there.
const FONTES = [
  ["espn.com.br", "espn_br"],
  ["lance.com.br", "lance"],
  ["espn.com", "espn"],
];
const MISTURADAS = new Set(["espn_br", "lance"]);

function juntarNoticias(entradas, desde) {
  const fonteDe = (url) => FONTES.find(([trecho]) => url.includes(trecho))?.[1] ?? "outra";
  const limite = new Date(desde).getTime();
  const lista = [];
  for (const j of entradas) {
    if (j.urlset) {
      for (const u of [].concat(j.urlset.url ?? [])) {
        const loc = String(u.loc ?? "");
        if (!loc.includes("/nba/")) continue; // the sitemap covers every sport
        const n = u["news:news"] ?? {};
        lista.push({ titulo: n["news:title"], url: loc, publicada_em: n["news:publication_date"], resumo: "" });
      }
    } else if (j.link && j.title) {
      lista.push({
        titulo: j.title,
        url: j.link,
        publicada_em: j.isoDate ?? j.pubDate,
        resumo: String(j.contentSnippet ?? "").replace(/\s+/g, " ").trim().slice(0, 400),
      });
    }
  }
  const vistas = new Set();
  return lista
    .filter((n) => n.titulo && n.url && n.publicada_em && new Date(n.publicada_em).getTime() >= limite)
    .filter((n) => !vistas.has(n.url) && vistas.add(n.url))
    .map((n) => ({ ...n, fonte: fonteDe(n.url), titulo: String(n.titulo).trim() }))
    .filter((n) => !MISTURADAS.has(n.fonte) || n.url.includes("/nba/"))
    .sort((a, b) => new Date(b.publicada_em) - new Date(a.publicada_em))
    .slice(0, 40);
}

if (typeof $input !== "undefined") {
  const entradas = $input.all().map((i) => i.json).filter((j) => !j.error);
  return [{ json: { noticias: juntarNoticias(entradas, $("Datas").first().json.desde) } }];
} else {
  module.exports = { juntarNoticias };
}
