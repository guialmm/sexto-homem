// One e-mail per subscriber: first name, their unsubscribe link, and a line
// about their team when it played last night or plays tonight.
function personalizar(edicao, inscrito, siteUrl) {
  const time = inscrito.time_favorito;
  let destaque = "";
  const jogo = edicao.resultados.jogos.find((j) => j.casa.sigla === time || j.visitante.sigla === time);
  const hoje = edicao.agenda.jogos.find((j) => j.casa.sigla === time || j.visitante.sigla === time);
  if (jogo) {
    const meu = jogo.casa.sigla === time ? jogo.casa : jogo.visitante;
    const outro = meu === jogo.casa ? jogo.visitante : jogo.casa;
    // Team names are English plurals ("Celtics", "Pistons"): no Portuguese article fits
    // every one of them, so the sentence is built without articles.
    const quem = meu.cestinha ? ` ${meu.cestinha.nome} fez ${meu.cestinha.valor}.` : "";
    destaque = `Seu time ${meu.venceu ? "venceu" : "perdeu"}: ${meu.apelido} ${meu.pontos} x ${outro.pontos} ${outro.apelido}.${quem}`;
  } else if (hoje) {
    const outro = hoje.casa.sigla === time ? hoje.visitante : hoje.casa;
    const meu = hoje.casa.sigla === time ? hoje.casa : hoje.visitante;
    destaque = `Seu time joga hoje: ${meu.apelido} x ${outro.apelido}, às ${hoje.hora}.`;
  }
  const bloco = destaque
    ? `<p style="margin:18px 0 0;padding:12px 16px;background:#fdf1ec;border-left:3px solid #e8572a;font-size:15px">${destaque.replace(/[<>&]/g, "")}</p>`
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
