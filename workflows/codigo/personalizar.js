// One e-mail per subscriber: first name, their unsubscribe link, and their team at the
// top: last night's result and tonight's game with the pick.
function personalizar(edicao, inscrito, siteUrl) {
  const time = inscrito.time_favorito;
  // Both, when the team played last night and plays again tonight: the subscriber's own
  // team comes first, before anything else in the edition.
  const linhas = [];
  const jogo = edicao.resultados.jogos.find((j) => j.casa.sigla === time || j.visitante.sigla === time);
  const hoje = edicao.agenda.jogos.find((j) => j.casa.sigla === time || j.visitante.sigla === time);
  if (jogo) {
    const meu = jogo.casa.sigla === time ? jogo.casa : jogo.visitante;
    const outro = meu === jogo.casa ? jogo.visitante : jogo.casa;
    // Team names are English plurals ("Celtics", "Pistons"): no Portuguese article fits
    // every one of them, so the sentence is built without articles.
    const quem = meu.cestinha ? ` ${meu.cestinha.nome} fez ${meu.cestinha.valor}.` : "";
    linhas.push(`Seu time ${meu.venceu ? "venceu" : "perdeu"}: ${meu.apelido} ${meu.pontos} x ${outro.pontos} ${outro.apelido}.${quem}`);
  }
  if (hoje) {
    const outro = hoje.casa.sigla === time ? hoje.visitante : hoje.casa;
    const meu = hoje.casa.sigla === time ? hoje.casa : hoje.visitante;
    const p = hoje.palpite;
    const palpite = p ? ` Palpite: ${p.favorito === meu.sigla ? meu.apelido : outro.apelido} (${p.chance}%).` : "";
    linhas.push(`${jogo ? "E joga de novo hoje" : "Seu time joga hoje"}: ${meu.apelido} x ${outro.apelido}, às ${hoje.hora}.${palpite}`);
  }
  const destaque = linhas.join("<br>");
  const bloco = destaque
    ? `<p style="margin:18px 0 0;padding:12px 16px;background:#f1e2cc;border-left:3px solid #c8873a;font-size:15px">${linhas.map((l) => l.replace(/[<>&]/g, "")).join("<br>")}</p>`
    : "";
  const primeiroNome = String(inscrito.nome).trim().split(/\s+/)[0].replace(/[<>&"]/g, "");
  return {
    para: inscrito.email,
    assunto: edicao.assunto,
    html: edicao.html
      .replace("{{NOME}}", primeiroNome)
      .replace("{{DESTAQUE_TIME}}", bloco)
      .replace("{{DESCADASTRAR}}", `${siteUrl}/descadastrar?token=${inscrito.token_descadastro}`),
  };
}

if (typeof $input !== "undefined") {
  const edicao = $("Montar edição").first().json;
  return $input.all().map((i) => ({ json: { ...i.json, ...personalizar(edicao, i.json, $env.SITE_URL) } }));
} else {
  module.exports = { personalizar };
}
