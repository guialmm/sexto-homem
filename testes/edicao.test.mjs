import assert from "node:assert/strict";
import { test } from "node:test";

import { carregar } from "./carregar.mjs";

const { montarEdicao, lerIA } = carregar("montar-edicao");
const { personalizar } = carregar("personalizar");
const { juntarNoticias } = carregar("noticias");

const time = (sigla, apelido, pontos, venceu, cestinha) => ({ sigla, apelido, nome: apelido, pontos, venceu, cestinha });
const base = () => ({
  dataEdicao: "2026-10-21",
  resultados: {
    jogos: [{ id: "1", visitante: time("BOS", "Celtics", 113, false, { nome: "Paul George", valor: 38 }), casa: time("DET", "Pistons", 121, true, { nome: "Jalen Duren", valor: 22 }), prorrogacoes: 0 }],
    falha: null,
  },
  agenda: { jogos: [{ id: "9", hora: "20:00", visitante: time("ATL", "Hawks"), casa: time("ORL", "Magic") }], falha: null },
  noticias: {
    noticias: [
      { id: 10, fonte: "espn_br", titulo: "Pistons viram", url: "https://www.espn.com.br/nba/a", resumo: "" },
      { id: 11, fonte: "espn", titulo: "LeBron debut", url: "https://www.espn.com/nba/b", resumo: "" },
    ],
  },
  desfalques: {
    porTime: {
      ATL: [
        { jogador: "Trae Young", status: "fora", motivo: "Left Knee Sprain" },
        { jogador: "Mouhamed Gueye", status: "fora", motivo: "Left Foot Fracture" },
        { jogador: "Henri Veesaar", status: "fora", motivo: "Right ACL Tear" },
      ],
    },
    falha: null,
  },
});

const ia = {
  assunto: "Pistons viram e Paul George brilha",
  abertura: "Noite de estreia.",
  jogos: [{ id: "1", comentario: "Detroit virou." }, { id: "999", comentario: "jogo inventado" }],
  noticias: [{ id: 11, titulo: "LeBron estreia", resumo: "Bom jogo." }, { id: 4242, titulo: "Notícia inventada", resumo: "x" }],
  motivos: [{ original: "Left Knee Sprain", traducao: "entorse no joelho esquerdo" }],
  desfalques_importantes: ["Trae Young", "Alguém Que Não Existe"],
};

test("links and scores come from the sources; ids the model invented are dropped", () => {
  const e = montarEdicao(base(), ia);
  assert.equal(e.assunto, "Pistons viram e Paul George brilha");
  assert.deepEqual(e.noticiasIds, [11]);
  assert.ok(e.html.includes('href="https://www.espn.com/nba/b"'));
  assert.ok(!e.html.includes("Notícia inventada") && !e.html.includes("jogo inventado"));
  assert.ok(e.html.includes("Celtics 113") && e.html.includes("Pistons 121"));
});

test("only the absences the model picked from the report are listed; the rest are counted", () => {
  const e = montarEdicao(base(), ia);
  assert.ok(e.html.includes("Trae Young, entorse no joelho esquerdo"));
  assert.ok(e.html.includes("e mais 2 fora"));
  assert.ok(!e.html.includes("Alguém Que Não Existe") && !e.html.includes("Gueye"));
});

test("without the model the edition still goes out, plainer", () => {
  const e = montarEdicao(base(), null);
  assert.equal(e.comIA, false);
  assert.match(e.assunto, /O que rolou na NBA/);
  assert.ok(e.html.includes("Pistons viram")); // Portuguese story with its own title
  assert.ok(!e.html.includes("LeBron debut")); // English titles need the model
  assert.ok(e.html.includes("Trae Young") && e.html.includes("Mouhamed Gueye") && e.html.includes("e mais 1 fora"));
});

test("no games and no news means no edition", () => {
  const vazio = { ...base(), resultados: { jogos: [] }, noticias: { noticias: [] } };
  assert.equal(montarEdicao(vazio, ia), null);
});

test("html in the sources is escaped", () => {
  const b = base();
  b.noticias.noticias[0].titulo = '<script>alert(1)</script>';
  assert.ok(!montarEdicao(b, null).html.includes("<script>"));
});

test("a broken model answer is treated as no answer", () => {
  assert.equal(lerIA({ candidates: [{ content: { parts: [{ text: "{nao é json" }] } }] }), null);
  assert.equal(lerIA({ error: { message: "503" } }), null);
});

test("each subscriber gets their name, their team and their own unsubscribe link", () => {
  const e = montarEdicao(base(), ia);
  const ana = personalizar(e, { email: "ana@x.com", nome: "Ana Souza", time_favorito: "BOS", token_descadastro: "tok-ana" }, "https://site");
  assert.ok(ana.html.includes("Bom dia, Ana."));
  assert.ok(ana.html.includes("Seu time perdeu: Celtics 113 x 121 Pistons. Paul George fez 38."));
  assert.ok(ana.html.includes("https://site/descadastrar?token=tok-ana"));

  const torcedor = personalizar(e, { email: "b@x.com", nome: "Bia", time_favorito: "ATL", token_descadastro: "t" }, "https://site");
  assert.ok(torcedor.html.includes("Seu time joga hoje: Hawks x Magic, às 20:00."));

  const semTime = personalizar(e, { email: "c@x.com", nome: "Caio", time_favorito: null, token_descadastro: "t" }, "https://site");
  assert.ok(!semTime.html.includes("Seu time") && !semTime.html.includes("{{"));
});

test("news: only the last day, no duplicates, NBA only from mixed feeds", () => {
  const desde = "2026-10-20T10:00:00Z";
  const lista = juntarNoticias(
    [
      { title: "Velha", link: "https://www.espn.com/nba/velha", isoDate: "2026-10-19T10:00:00Z" },
      { title: "Nova", link: "https://www.espn.com/nba/nova", isoDate: "2026-10-21T10:00:00Z" },
      { title: "Nova de novo", link: "https://www.espn.com/nba/nova", isoDate: "2026-10-21T10:00:00Z" },
      { title: "Futebol", link: "https://www.espn.com.br/futebol/x", isoDate: "2026-10-21T10:00:00Z" },
      { title: "NBA BR", link: "https://www.espn.com.br/nba/y", isoDate: "2026-10-21T11:00:00Z" },
      { urlset: { url: [
        { loc: "https://www.lance.com.br/nba/z.html", "news:news": { "news:title": "Lance NBA", "news:publication_date": "2026-10-21T09:00:00-03:00" } },
        { loc: "https://www.lance.com.br/futebol/w.html", "news:news": { "news:title": "Lance futebol", "news:publication_date": "2026-10-21T09:00:00-03:00" } },
      ] } },
    ],
    desde,
  );
  assert.deepEqual(lista.map((n) => [n.fonte, n.titulo]), [["lance", "Lance NBA"], ["espn_br", "NBA BR"], ["espn", "Nova"]]);
});
