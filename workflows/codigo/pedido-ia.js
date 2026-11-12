// Builds the request for the model. It writes the prose; it never decides facts:
// scores, links and injuries come from the sources, and the model refers to
// games and stories only by the ids it was given.
const SISTEMA = `Você escreve o Sexto Homem, newsletter diária da NBA em português do Brasil,
lida às 8h por quem dormiu antes dos jogos acabarem.
Tom: fã que entende de basquete, direto, com bom humor leve. Nada de clichê de IA,
nada de emoji, nada de exclamação em toda frase.
Regras:
- Use somente os dados fornecidos. Não invente placares, números, lesões nem fatos.
- Refira-se a jogos e notícias apenas pelos "id" recebidos.
- Escolha no máximo 6 notícias, as mais relevantes, sem repetir assunto; ignore as que
  não forem sobre a NBA. Reescreva o título em português e resuma em uma ou duas frases.
- Para cada jogo de ontem, um comentário de duas ou três frases: o que decidiu o jogo e,
  quando o resumo em inglês ou os lances mostrarem, quem se machucou durante a partida
  (ex.: saiu no primeiro quarto com dor abdominal e não voltou) e o lance mais marcante
  (uma enterrada por cima de alguém, uma cesta no estouro do relógio). Nada além do que
  está no resumo e nos lances.
- Vídeos: em "videos", liste no máximo 3 lances da noite inteira, do mais impactante para
  o menos, cada um com o "id" do jogo e o "n" do lance. Escolha como um editor de
  highlights: enterrada por cima de alguém (poster), toco que vira contra-ataque, cesta
  da vitória ou no estouro do relógio, drible que derruba o marcador, passe ou jogada
  absurda, sequência histórica. Lesão só se for grave, de um jogador importante, e se o
  próprio lance da lesão estiver no vídeo (queda feia, aterrissagem ruim); nunca um
  jogador indo para o vestiário. Enterrada comum, bola de três comum ou arremesso errado
  não entram. Melhor 1 vídeo ótimo do que 3 medianos; sem nenhum à altura, deixe vazio.
  Legenda: só a tradução fiel do título do vídeo, sem acrescentar nada da matéria.
- Para cada jogo de hoje há um palpite pronto (favorito e chance, de uma fonte). Não mude
  o favorito nem a chance: escreva só o motivo, uma frase, usando o contexto (campanha,
  campanha em casa ou fora, últimos 5 jogos, segunda noite seguida, desfalques).
- Traduza TODOS os motivos de lesão da lista para um português curto e natural.
- Para cada jogo de hoje, escolha até 2 desfalques que mais pesam (titulares e estrelas),
  usando exatamente os nomes da lista; se nenhum pesa, não escolha nenhum.`;

const ESQUEMA = {
  type: "object",
  properties: {
    assunto: { type: "string", description: "Assunto do e-mail, até 70 caracteres, sobre o fato mais marcante" },
    abertura: { type: "string", description: "Duas ou três frases abrindo a edição" },
    jogos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          comentario: { type: "string" },
        },
        required: ["id", "comentario"],
      },
    },
    videos: {
      type: "array",
      description: "No máximo 3, do mais importante para o menos importante",
      items: {
        type: "object",
        properties: { id: { type: "string" }, n: { type: "integer" }, legenda: { type: "string" } },
        required: ["id", "n", "legenda"],
      },
    },
    palpites: {
      type: "array",
      items: { type: "object", properties: { id: { type: "string" }, motivo: { type: "string" } }, required: ["id", "motivo"] },
    },
    noticias: {
      type: "array",
      items: { type: "object", properties: { id: { type: "integer" }, titulo: { type: "string" }, resumo: { type: "string" } }, required: ["id", "titulo", "resumo"] },
    },
    motivos: { type: "array", items: { type: "object", properties: { original: { type: "string" }, traducao: { type: "string" } }, required: ["original", "traducao"] } },
    desfalques_importantes: { type: "array", items: { type: "string" }, description: "Nomes, exatamente como na lista" },
  },
  required: ["assunto", "abertura", "jogos", "videos", "palpites", "noticias", "motivos", "desfalques_importantes"],
};

function montarPedido({ resultados, agenda, noticias, desfalques }) {
  const placar = (j) => `${j.visitante.apelido} ${j.visitante.pontos} x ${j.casa.pontos} ${j.casa.apelido}`;
  const timesDeHoje = new Set(agenda.jogos.flatMap((j) => [j.casa.sigla, j.visitante.sigla]));
  const relevantes = Object.entries(desfalques.porTime ?? {})
    .filter(([sigla]) => timesDeHoje.has(sigla))
    .flatMap(([, lista]) => lista.filter((d) => d.status === "fora" || d.status === "dúvida"));
  const dados = {
    jogos_de_ontem: resultados.jogos.map((j) => ({
      id: j.id,
      placar: placar(j),
      prorrogacoes: j.prorrogacoes,
      manchete_em_ingles: j.manchete,
      resumo_em_ingles: j.recap ?? null,
      lances: (j.lances ?? []).map((l) => ({ n: l.n, titulo: l.titulo })),
      destaques: [j.visitante, j.casa].map((t) => ({ time: t.apelido, cestinha: t.cestinha, rebotes: t.rebotes, assistencias: t.assistencias })),
    })),
    noticias: noticias.noticias.map((n) => ({ id: n.id, fonte: n.fonte, titulo: n.titulo, resumo: n.resumo })),
    jogos_de_hoje: agenda.jogos.map((j) => ({
      id: j.id,
      jogo: `${j.hora} ${j.visitante.apelido} x ${j.casa.apelido}`,
      palpite: j.palpite ? { favorito: j.palpite.favorito, chance: `${j.palpite.chance}%`, contexto: j.palpite.contexto } : null,
      desfalques: [j.visitante.sigla, j.casa.sigla].flatMap((sigla) =>
        (desfalques.porTime?.[sigla] ?? []).filter((d) => d.status === "fora" || d.status === "dúvida").map((d) => d.jogador),
      ),
    })),
    motivos_de_lesao: [...new Set(relevantes.map((d) => d.motivo))],
  };
  return {
    systemInstruction: { parts: [{ text: SISTEMA }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(dados) }] }],
    generationConfig: { temperature: 0.6, responseMimeType: "application/json", responseSchema: ESQUEMA },
  };
}

if (typeof $input !== "undefined") {
  const pegar = (tipo) => $input.all().map((i) => i.json).find((j) => j.tipo === tipo) ?? { jogos: [], noticias: [], porTime: {} };
  const partes = { resultados: pegar("resultados"), agenda: pegar("agenda"), noticias: pegar("noticias"), desfalques: pegar("desfalques") };
  return [{ json: { ...partes, requisicao: montarPedido(partes) } }];
} else {
  module.exports = { montarPedido, ESQUEMA };
}
