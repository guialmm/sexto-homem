// Postgres returned only the stories it had never seen (ON CONFLICT on the URL);
// put their summaries back for the model.
const novas = $input.first().json.novas ?? [];
const coletadas = new Map($("Notícias das últimas 24h").first().json.noticias.map((n) => [n.url, n]));
return [{ json: { tipo: "noticias", noticias: novas.map((n) => ({ id: n.id, ...coletadas.get(n.url) })) } }];
