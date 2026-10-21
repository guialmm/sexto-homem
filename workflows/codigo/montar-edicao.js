// Turns the sources plus the model's prose into the e-mail. Links and scores
// always come from the sources; any id the model invents is dropped, and if the
// model failed altogether the edition still goes out, just without commentary.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const NOME_FONTE = { espn_br: "ESPN Brasil", lance: "Lance!", espn: "ESPN" };
const COR = { tinta: "#14110f", apagado: "#7a7068", linha: "#ece6df", laranja: "#e8572a", fundo: "#faf7f3" };

function lerIA(resposta) {
  try {
    const texto = resposta?.candidates?.[0]?.content?.parts?.[0]?.text;
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function dataPorExtenso(iso) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function secao(titulo, corpo) {
  return `<h2 style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${COR.apagado};margin:36px 0 12px;border-top:1px solid ${COR.linha};padding-top:20px">${titulo}</h2>${corpo}`;
}

function montarEdicao({ dataEdicao, resultados, agenda, noticias, desfalques }, ia) {
  const idsJogos = new Set(resultados.jogos.map((j) => j.id));
  const porId = new Map(noticias.noticias.map((n) => [n.id, n]));
  const comentarios = new Map((ia?.jogos ?? []).filter((j) => idsJogos.has(j.id)).map((j) => [j.id, j.comentario]));
  const escolhidas = (ia?.noticias ?? []).filter((n) => porId.has(n.id)).slice(0, 6);
  // Without the model: the newest stories in Portuguese, titles as published.
  const lista = escolhidas.length
    ? escolhidas.map((n) => ({ ...porId.get(n.id), titulo: n.titulo, resumo: n.resumo }))
    : noticias.noticias.filter((n) => n.fonte !== "espn").slice(0, 6).map((n) => ({ ...n, resumo: "" }));
  const traducao = new Map((ia?.motivos ?? []).map((m) => [m.original, m.traducao]));
  // Only names that are really in the report: anything else the model wrote is ignored.
  const importantes = new Set(ia?.desfalques_importantes ?? []);

  if (!resultados.jogos.length && !lista.length) return null; // nothing happened: no edition

  const jogosHtml = resultados.jogos
    .map((j) => {
      const time = (t) => `<span style="font-weight:${t.venceu ? 700 : 400};color:${t.venceu ? COR.tinta : COR.apagado}">${esc(t.apelido)} ${t.pontos}</span>`;
      const ot = j.prorrogacoes ? ` <span style="color:${COR.apagado};font-size:13px">(${j.prorrogacoes > 1 ? `${j.prorrogacoes} prorrogações` : "prorrogação"})</span>` : "";
      const cestinhas = [j.visitante, j.casa]
        .filter((t) => t.cestinha)
        .map((t) => `${esc(t.cestinha.nome)} ${t.cestinha.valor} pts`)
        .join(" · ");
      const comentario = comentarios.get(j.id);
      return `<div style="margin:0 0 18px">
  <p style="margin:0;font-size:18px">${time(j.visitante)} <span style="color:${COR.apagado}">x</span> ${time(j.casa)}${ot}</p>
  <p style="margin:4px 0 0;font-size:13px;color:${COR.apagado}">Cestinhas: ${cestinhas}</p>
  ${comentario ? `<p style="margin:6px 0 0;font-size:15px;line-height:1.55">${esc(comentario)}</p>` : ""}
</div>`;
    })
    .join("");

  const noticiasHtml = lista
    .map(
      (n) => `<div style="margin:0 0 18px">
  <a href="${esc(n.url)}" style="font-size:16px;font-weight:700;color:${COR.tinta};text-decoration:none">${esc(n.titulo)}</a>
  ${n.resumo ? `<p style="margin:4px 0 0;font-size:15px;line-height:1.55">${esc(n.resumo)}</p>` : ""}
  <p style="margin:4px 0 0;font-size:12px;color:${COR.apagado}">${esc(NOME_FONTE[n.fonte] ?? n.fonte)} · <a href="${esc(n.url)}" style="color:${COR.laranja}">ler</a></p>
</div>`,
    )
    .join("");

  const fora = (sigla) =>
    (desfalques.porTime?.[sigla] ?? [])
      .filter((d) => d.status === "fora" || d.status === "dúvida")
      .map((d) => ({ nome: d.jogador, texto: `${esc(d.jogador)}${d.status === "dúvida" ? " (dúvida)" : ""}, ${esc(traducao.get(d.motivo) ?? d.motivo)}` }));
  // A long list of season-long injuries is noise: show the (at most) two absences
  // that matter, as picked by the model from the report, and count the rest.
  const agendaHtml = agenda.jogos
    .map((j) => {
      const todas = [...fora(j.visitante.sigla), ...fora(j.casa.sigla)];
      const escolhidas = ia ? todas.filter((b) => importantes.has(b.nome)) : todas.slice(0, 2);
      const resto = todas.length - escolhidas.length;
      const linha = [escolhidas.map((b) => b.texto).join("; "), resto ? `${escolhidas.length ? "e mais " : ""}${resto} fora` : ""]
        .filter(Boolean)
        .join("; ");
      return `<div style="margin:0 0 14px">
  <p style="margin:0;font-size:16px"><span style="font-family:monospace;color:${COR.laranja}">${esc(j.hora)}</span>&nbsp; ${esc(j.visitante.apelido)} x ${esc(j.casa.apelido)}</p>
  ${linha ? `<p style="margin:3px 0 0;font-size:13px;color:${COR.apagado}">Desfalques: ${linha}</p>` : ""}
</div>`;
    })
    .join("");

  const avisos = [resultados.falha, agenda.falha, desfalques.falha].filter(Boolean);
  const assunto = (ia?.assunto ?? `O que rolou na NBA: ${dataPorExtenso(dataEdicao)}`).slice(0, 90);
  const html = `<div style="background:${COR.fundo};padding:24px 0"><div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 28px;background:#fff;color:${COR.tinta}">
<p style="margin:0;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${COR.laranja};font-weight:700">Sexto Homem</p>
<p style="margin:4px 0 0;font-size:13px;color:${COR.apagado}">${esc(dataPorExtenso(dataEdicao))}</p>
<p style="margin:22px 0 0;font-size:17px;line-height:1.6">Bom dia, {{NOME}}. ${esc(ia?.abertura ?? "Aqui está o que rolou na NBA enquanto você dormia.")}</p>
{{DESTAQUE_TIME}}
${resultados.jogos.length ? secao("Resultados da noite", jogosHtml) : ""}
${lista.length ? secao("O que rolou", noticiasHtml) : ""}
${agenda.jogos.length ? secao("Hoje à noite", agendaHtml) : ""}
${avisos.length ? `<p style="margin:24px 0 0;font-size:12px;color:${COR.apagado}">Hoje faltou: ${esc(avisos.join(", "))}.</p>` : ""}
<p style="margin:36px 0 0;font-size:12px;line-height:1.6;color:${COR.apagado};border-top:1px solid ${COR.linha};padding-top:16px">Você recebe o Sexto Homem porque se inscreveu e confirmou seu e-mail. Placares e estatísticas: ESPN. Desfalques: relatório oficial da NBA. <a href="{{DESCADASTRAR}}" style="color:${COR.apagado}">Descadastrar em um clique</a>.</p>
</div></div>`;

  return { dataEdicao, assunto, html, jogos: resultados.jogos.length, noticiasIds: lista.map((n) => n.id).filter(Number.isInteger), comIA: Boolean(ia), resultados, agenda };
}

if (typeof $input !== "undefined") {
  const base = $("Preparar pedido à IA").first().json;
  const edicao = montarEdicao({ ...base, dataEdicao: $("Datas").first().json.dataEdicao }, lerIA($input.first().json));
  return edicao ? [{ json: edicao }] : [];
} else {
  module.exports = { montarEdicao, lerIA };
}
