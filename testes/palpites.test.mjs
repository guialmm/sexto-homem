import assert from "node:assert/strict";
import { test } from "node:test";

import { carregar } from "./carregar.mjs";

const { lerResumo } = carregar("resumos");
const { lerPalpite } = carregar("palpites");
const { montarEdicao } = carregar("montar-edicao");

const jogo = (extra = {}) => ({
  id: "77",
  data: "2026-11-13T00:00Z", // 19h in New York on 11/12
  hora: "21:00",
  casa: { sigla: "PHI", apelido: "76ers", campanha: "9-3", em_casa: "4-2" },
  visitante: { sigla: "TOR", apelido: "Raptors", campanha: "5-6", fora_de_casa: "3-3" },
  ...extra,
});
const ultimos = (sigla, ...datas) => ({ team: { abbreviation: sigla }, events: datas.map((d) => ({ gameDate: d, gameResult: "W" })) });

test("a chance vem do Matchup Predictor da ESPN; noite seguida pelo calendário dos EUA", () => {
  const p = lerPalpite(
    {
      predictor: { homeTeam: { gameProjection: "71.6" } },
      lastFiveGames: [ultimos("TOR", "2026-11-10T00:00Z", "2026-11-12T00:30Z"), ultimos("PHI", "2026-11-11T00:00Z")],
    },
    jogo(),
  );
  assert.deepEqual([p.favorito, p.chance, p.fonte], ["PHI", 72, "ESPN"]);
  assert.equal(p.contexto.visitante.segunda_noite_seguida, true); // played 11/11 at 19h30 ET
  assert.equal(p.contexto.casa.segunda_noite_seguida, false);
  assert.equal(p.contexto.visitante.ultimos_5, "WW");
});

test("sem predictor: linha de apostas; sem nada: campanha com mando de quadra", () => {
  const apostas = lerPalpite({ pickcenter: [{ homeTeamOdds: { moneyLine: 250 }, awayTeamOdds: { moneyLine: -300 } }] }, jogo());
  assert.deepEqual([apostas.favorito, apostas.fonte], ["TOR", "apostas"]);
  assert.ok(apostas.chance > 70 && apostas.chance < 76);
  const campanha = lerPalpite(null, jogo());
  assert.deepEqual([campanha.favorito, campanha.fonte], ["PHI", "campanha"]);
  assert.ok(campanha.chance >= 50 && campanha.chance <= 85);
});

test("resumo: matéria sem HTML e lances com link só da ESPN, sem o pacote do jogo inteiro", () => {
  const r = lerResumo({
    article: { story: "<p>Curry <a href='x'>left</a> with soreness &amp; didn&#39;t return.</p>" },
    videos: [
      { headline: "Warriors vs. Rockets: Game Highlights", links: { web: { href: "https://www.espn.com/video/clip/_/id/1" } } },
      { headline: "Steph Curry heads to locker room", links: { web: { href: "https://www.espn.com/video/clip/_/id/2" } } },
      { headline: "Amen Thompson alley-oop", links: { web: { href: "javascript:alert(1)" } } },
    ],
  });
  assert.equal(r.recap, "Curry left with soreness & didn't return.");
  assert.deepEqual(r.lances.map((l) => [l.n, l.titulo, l.url]), [
    [1, "Steph Curry heads to locker room", "https://www.espn.com/video/clip/_/id/2"],
    [2, "Amen Thompson alley-oop", null],
  ]);
  assert.deepEqual(lerResumo(null), { recap: null, lances: [] });
});

const edicao = (agendaJogos, iaExtra = {}) =>
  montarEdicao(
    {
      dataEdicao: "2026-11-12",
      resultados: {
        jogos: [
          {
            id: "1",
            visitante: { sigla: "GS", apelido: "Warriors", pontos: 104, venceu: false },
            casa: { sigla: "HOU", apelido: "Rockets", pontos: 113, venceu: true },
            prorrogacoes: 0,
            lances: [
              { n: 1, titulo: "Curry heads to locker room", url: "https://www.espn.com/video/clip/_/id/2" },
              { n: 2, titulo: "No link", url: null },
            ],
          },
        ],
      },
      agenda: { jogos: agendaJogos, falha: null },
      noticias: { noticias: [] },
      desfalques: { porTime: {} },
    },
    {
      assunto: "a",
      abertura: "b",
      jogos: [{ id: "1", comentario: "Curry saiu no primeiro quarto.", lance: 1, legenda_lance: "Curry deixa a quadra" }],
      palpites: [{ id: "77", motivo: "Toronto vem da segunda noite seguida." }, { id: "999", motivo: "inventado" }],
      noticias: [],
      motivos: [],
      desfalques_importantes: [],
      ...iaExtra,
    },
  );

test("o e-mail traz o link do lance escolhido e o palpite com o motivo", () => {
  const p = lerPalpite({ predictor: { homeTeam: { gameProjection: "72" } } }, jogo());
  const { html } = edicao([{ ...jogo(), palpite: p }]);
  assert.ok(html.includes('href="https://www.espn.com/video/clip/_/id/2"') && html.includes("Curry deixa a quadra"));
  assert.ok(html.includes("<strong>76ers</strong>") && html.includes("(72%)") && html.includes("segunda noite seguida"));
  assert.ok(!html.includes("inventado"));
});

test("lance inventado ou sem link não vira link; sem jogos hoje, o e-mail avisa", () => {
  const { html } = edicao([], { jogos: [{ id: "1", comentario: "x", lance: 2 }] });
  assert.ok(!html.includes("&#9654;"));
  assert.ok(html.includes("Sem jogos da NBA hoje à noite."));
  const outro = edicao([], { jogos: [{ id: "1", comentario: "x", lance: 42 }] });
  assert.ok(!outro.html.includes("&#9654;"));
});
