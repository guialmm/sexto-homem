// Builds workflows/edicao.json and workflows/alertas.json.
//
// The JavaScript of each Code node lives in workflows/codigo/*.js, where it can
// be read, reviewed and tested; this script stitches it into the JSON n8n imports.
//
//   npm run workflows
import { readFileSync, writeFileSync } from "node:fs";

const codigo = (nome) => readFileSync(new URL(`../workflows/codigo/${nome}.js`, import.meta.url), "utf8");
const PG = { postgres: { id: "pgSextoHomem0001", name: "Postgres · Sexto Homem" } };
const SMTP = { smtp: { id: "smtpMailpit00001", name: "SMTP · Mailpit (local)" } };
const NAVEGADOR = "Mozilla/5.0 (compatible; SextoHomem/1.0; +https://github.com/guialmm/sexto-homem)";
// A source that is down must not sink the edition: its node passes the error on.
const TOLERANTE = { onError: "continueRegularOutput", retryOnFail: true, maxTries: 3, waitBetweenTries: 5000 };

let n = 0;
const no = (name, type, typeVersion, position, parameters, extra = {}) => ({
  id: `no${String(++n).padStart(3, "0")}`,
  name,
  type: `n8n-nodes-base.${type}`,
  typeVersion,
  position,
  parameters,
  ...extra,
});
const code = (name, arquivo, position, extra) => no(name, "code", 2, position, { jsCode: codigo(arquivo) }, extra);
const http = (name, url, position, formato = "json", extra = {}) =>
  no(
    name,
    "httpRequest",
    4.2,
    position,
    {
      url,
      sendHeaders: true,
      headerParameters: { parameters: [{ name: "User-Agent", value: NAVEGADOR }] },
      options: {
        timeout: 30000,
        ...(formato === "json" ? {} : { response: { response: { responseFormat: formato, outputPropertyName: "data" } } }),
      },
    },
    { ...TOLERANTE, ...extra },
  );
const rss = (name, url, position) => no(name, "rssFeedRead", 1.1, position, { url, options: {} }, TOLERANTE);
const sql = (name, query, replacement, position, extra = {}) =>
  no(name, "postgres", 2.6, position, { operation: "executeQuery", query, options: { queryReplacement: replacement } }, { credentials: PG, ...extra });

const nodes = [
  no("Toda manhã às 8h", "scheduleTrigger", 1.2, [0, 300], { rule: { interval: [{ field: "cronExpression", expression: "0 8 * * *" }] } }),
  no("Rodar agora", "manualTrigger", 1, [0, 480], {}),
  code("Datas", "datas", [220, 380]),

  http("Placares de ontem", "=https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={{ $json.ontem }}", [480, 0]),
  code("Resultados", "resultados", [700, 0]),
  http("Jogos de hoje", "=https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates={{ $json.hoje }}", [480, 180]),
  code("Agenda", "agenda", [700, 180]),

  // Portuguese feeds such as The Playoffs and Jumper Brasil were dropped: their RSS
  // stopped updating months ago, though the sites are alive.
  rss("ESPN Brasil", "https://www.espn.com.br/rss/nba", [480, 420]),
  rss("ESPN (inglês)", "https://www.espn.com/espn/rss/nba/news", [480, 600]),
  http("Mapa de notícias do Lance", "https://www.lance.com.br/sitemap/news/today.xml", [480, 780], "text"),
  no("Lance em JSON", "xml", 1, [700, 780], { mode: "xmlToJson", dataPropertyName: "data", options: {} }, { onError: "continueRegularOutput" }),
  no("Juntar fontes", "merge", 3, [920, 600], { numberInputs: 3 }),
  code("Notícias das últimas 24h", "noticias", [1140, 600]),
  sql(
    "Guardar notícias novas",
    `-- A story already sent in a past edition is never sent again; one collected but
-- not yet sent (e.g. this morning's run crashed) stays available.
WITH dados AS (
  SELECT * FROM json_to_recordset($1::json) AS x(fonte text, titulo text, url text, publicada_em timestamptz)
), novas AS (
  INSERT INTO noticias (fonte, titulo, url, publicada_em)
  SELECT fonte, titulo, url, publicada_em FROM dados
  ON CONFLICT (url) DO NOTHING
  RETURNING id, url
), pendentes AS (
  SELECT n.id, n.url FROM noticias n
  JOIN dados d USING (url)
  LEFT JOIN edicoes e ON e.id = n.edicao_id
  WHERE e.id IS NULL OR e.status <> 'enviada'
)
SELECT coalesce(json_agg(t), '[]'::json) AS novas
FROM (SELECT * FROM novas UNION SELECT * FROM pendentes) t;`,
    "={{ [JSON.stringify($json.noticias)] }}",
    [1360, 600],
  ),
  code("Lista de notícias", "lista-noticias", [1580, 600]),

  code("Achar último relatório", "achar-relatorio", [480, 1020], { onError: "continueRegularOutput" }),
  http("Baixar PDF", "={{ $json.pdf }}", [920, 1020], "file"),
  no("Ler PDF", "extractFromFile", 1, [1140, 1020], { operation: "pdf", binaryPropertyName: "data", options: {} }, { onError: "continueRegularOutput" }),
  code("Desfalques", "lesoes", [1360, 1020]),

  no("Juntar tudo", "merge", 3, [1800, 400], { numberInputs: 4 }),
  code("Preparar pedido à IA", "pedido-ia", [2020, 400]),
  code("Escrever com a IA", "escrever-ia", [2240, 400], { onError: "continueRegularOutput" }),
  code("Montar edição", "montar-edicao", [2460, 400]),
  sql(
    "Registrar edição",
    `-- One edition per day. Today's edition already sent: no row back, nothing more runs.
WITH e AS (
  INSERT INTO edicoes (data, assunto, html, jogos, noticias, status)
  VALUES ($1::date, $2, $3, $4, $5, 'enviando')
  ON CONFLICT (data) DO UPDATE SET
    assunto = EXCLUDED.assunto, html = EXCLUDED.html, jogos = EXCLUDED.jogos,
    noticias = EXCLUDED.noticias, status = 'enviando', erro = NULL
  WHERE edicoes.status <> 'enviada'
  RETURNING id
), ligar AS (
  UPDATE noticias SET edicao_id = (SELECT id FROM e)
  WHERE id = ANY (string_to_array(NULLIF($6, ''), ',')::int[])
)
SELECT id FROM e;`,
    "={{ [$json.dataEdicao, $json.assunto, $json.html, $json.jogos, $json.noticiasIds.length, $json.noticiasIds.join(',')] }}",
    [2680, 400],
  ),
  sql(
    "Inscritos que faltam",
    `-- Whoever already got today's edition is skipped: a re-run never mails twice.
SELECT i.id, i.email, i.nome, i.time_favorito, i.token_descadastro
FROM inscritos i
WHERE i.status = 'ativo'
  AND NOT EXISTS (SELECT 1 FROM envios v WHERE v.edicao_id = $1 AND v.inscrito_id = i.id)
ORDER BY i.id;`,
    "={{ [$json.id] }}",
    [2900, 400],
  ),
  no("Em lotes de 10", "splitInBatches", 3, [3120, 400], { batchSize: 10, options: {} }),
  code("Personalizar", "personalizar", [3340, 520]),
  no(
    "Enviar e-mail",
    "emailSend",
    2.1,
    [3560, 520],
    {
      fromEmail: "={{ $env.REMETENTE || 'Sexto Homem <newsletter@sextohomem.test>' }}",
      toEmail: "={{ $json.para }}",
      subject: "={{ $json.assunto }}",
      emailFormat: "html",
      html: "={{ $json.html }}",
      options: { appendAttribution: false },
    },
    { credentials: SMTP },
  ),
  sql(
    "Registrar envio",
    "INSERT INTO envios (edicao_id, inscrito_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;",
    "={{ [$('Registrar edição').first().json.id, $('Personalizar').item.json.id] }}",
    [3780, 520],
  ),
  sql(
    "Fechar edição",
    `UPDATE edicoes SET status = 'enviada', enviada_em = now(),
  destinatarios = (SELECT count(*) FROM envios WHERE edicao_id = $1)
WHERE id = $1
RETURNING data, destinatarios;`,
    "={{ [$('Registrar edição').first().json.id] }}",
    [3340, 280],
    { executeOnce: true },
  ),
];

const liga = (de, para, entrada = 0, saida = 0) => ({ de, para, entrada, saida });
const ligacoes = [
  liga("Toda manhã às 8h", "Datas"),
  liga("Rodar agora", "Datas"),
  ...["Placares de ontem", "Jogos de hoje", "ESPN Brasil", "ESPN (inglês)", "Mapa de notícias do Lance", "Achar último relatório"].map((p) => liga("Datas", p)),
  liga("Placares de ontem", "Resultados"),
  liga("Jogos de hoje", "Agenda"),
  liga("ESPN Brasil", "Juntar fontes", 0),
  liga("ESPN (inglês)", "Juntar fontes", 1),
  liga("Mapa de notícias do Lance", "Lance em JSON"),
  liga("Lance em JSON", "Juntar fontes", 2),
  liga("Juntar fontes", "Notícias das últimas 24h"),
  liga("Notícias das últimas 24h", "Guardar notícias novas"),
  liga("Guardar notícias novas", "Lista de notícias"),
  liga("Achar último relatório", "Baixar PDF"),
  liga("Baixar PDF", "Ler PDF"),
  liga("Ler PDF", "Desfalques"),
  liga("Resultados", "Juntar tudo", 0),
  liga("Agenda", "Juntar tudo", 1),
  liga("Lista de notícias", "Juntar tudo", 2),
  liga("Desfalques", "Juntar tudo", 3),
  liga("Juntar tudo", "Preparar pedido à IA"),
  liga("Preparar pedido à IA", "Escrever com a IA"),
  liga("Escrever com a IA", "Montar edição"),
  liga("Montar edição", "Registrar edição"),
  liga("Registrar edição", "Inscritos que faltam"),
  liga("Inscritos que faltam", "Em lotes de 10"),
  liga("Em lotes de 10", "Fechar edição", 0, 0), // output 0: done
  liga("Em lotes de 10", "Personalizar", 0, 1), // output 1: next batch
  liga("Personalizar", "Enviar e-mail"),
  liga("Enviar e-mail", "Registrar envio"),
  liga("Registrar envio", "Em lotes de 10"),
];

const connections = {};
for (const { de, para, entrada, saida } of ligacoes) {
  const main = (connections[de] ??= { main: [] }).main;
  while (main.length <= saida) main.push([]);
  main[saida].push({ node: para, type: "main", index: entrada });
}
for (const { de, para } of ligacoes) {
  if (!nodes.some((x) => x.name === de) || !nodes.some((x) => x.name === para)) throw new Error(`ligação inválida: ${de} → ${para}`);
}

const edicao = {
  id: "edicaoSextoHom01",
  name: "Sexto Homem · Edição diária",
  active: true,
  settings: { executionOrder: "v1", timezone: "America/Sao_Paulo", errorWorkflow: "alertasSextoHo01" },
  nodes,
  connections,
};

const alertas = {
  id: "alertasSextoHo01",
  name: "Sexto Homem · Alertas",
  active: false,
  settings: { executionOrder: "v1", timezone: "America/Sao_Paulo" },
  nodes: [
    { id: "al1", name: "Quando uma execução falhar", type: "n8n-nodes-base.errorTrigger", typeVersion: 1, position: [0, 0], parameters: {} },
    {
      id: "al2",
      name: "Avisar por e-mail",
      type: "n8n-nodes-base.emailSend",
      typeVersion: 2.1,
      position: [240, 0],
      credentials: SMTP,
      parameters: {
        fromEmail: "={{ $env.REMETENTE || 'Sexto Homem <newsletter@sextohomem.test>' }}",
        toEmail: "={{ $env.ALERTA_EMAIL || 'alertas@sextohomem.test' }}",
        subject: "=Falha no Sexto Homem: {{ $json.execution.lastNodeExecuted || $json.workflow.name }}",
        emailFormat: "text",
        text: "=O workflow \"{{ $json.workflow.name }}\" falhou no passo \"{{ $json.execution.lastNodeExecuted }}\".\n\nErro: {{ $json.execution.error.message }}\n\nExecução: {{ $json.execution.url }}",
        options: { appendAttribution: false },
      },
    },
  ],
  connections: { "Quando uma execução falhar": { main: [[{ node: "Avisar por e-mail", type: "main", index: 0 }]] } },
};

writeFileSync(new URL("../workflows/edicao.json", import.meta.url), JSON.stringify(edicao, null, 2) + "\n");
writeFileSync(new URL("../workflows/alertas.json", import.meta.url), JSON.stringify(alertas, null, 2) + "\n");
console.log(`edicao.json: ${nodes.length} nós, ${ligacoes.length} ligações · alertas.json`);
