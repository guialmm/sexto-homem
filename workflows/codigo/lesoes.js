// Turns the official NBA injury report (a PDF whose text comes out one word per
// line) into { sigla: [{ jogador, status, motivo }] } for today's games.
//
// The PDF has no structure to rely on, only patterns: a matchup "ATL@ORL", a
// team's full name, then players as "Last, First" followed by a status word.
// Everything between one player's status and the next player is the reason,
// minus the page header the PDF repeats when a list crosses a page break.

const TIMES = {
  'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN', 'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE', 'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET', 'Golden State Warriors': 'GS', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
  'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM', 'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN', 'New Orleans Pelicans': 'NO', 'New York Knicks': 'NY',
  'Oklahoma City Thunder': 'OKC', 'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SA', 'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTAH', 'Washington Wizards': 'WSH',
};
const STATUS = { Out: 'fora', Doubtful: 'dúvida', Questionable: 'questionável', Probable: 'provável', Available: 'disponível' };
// Players on two-way contracts assigned to the G League are not news.
const IGNORAR = /G League|Two-?\s?Way/i;

function lerRelatorio(textoBruto) {
  // Rejoin words the PDF split ("Two- Way", "Gilgeous- Alexander") and flatten lines.
  const texto = String(textoBruto ?? '').replace(/-\s+(?=\w)/g, '-').replace(/\s+/g, ' ');
  const nomes = Object.keys(TIMES).map((n) => n.replace(/\s+/g, '\\s+')).join('|');
  const marcos = [];
  for (const m of texto.matchAll(new RegExp(`\\b(${nomes})\\b`, 'g'))) {
    marcos.push({ pos: m.index, sigla: TIMES[m[1].replace(/\s+/g, ' ')] });
  }
  const jogador = /\b([A-Z][A-Za-z'.-]+(?: (?:Jr\.|Sr\.|II|III|IV))?), ([A-Z][A-Za-z'.-]+(?: [A-Z][A-Za-z'.-]+)?) (Out|Doubtful|Questionable|Probable|Available)\b/g;
  const achados = [...texto.matchAll(jogador)];
  const porTime = {};
  achados.forEach((m, i) => {
    const time = [...marcos].reverse().find((t) => t.pos < m.index);
    if (!time) return;
    const fimMotivo = Math.min(
      achados[i + 1]?.index ?? texto.length,
      ...marcos.filter((t) => t.pos > m.index).map((t) => t.pos).slice(0, 1),
      ...[...texto.slice(m.index).matchAll(/\b[A-Z]{2,4}@[A-Z]{2,4}\b|\d{2}:\d{2} \(ET\)|Page \d+ of \d+|Injury Report:|Game Date/g)].slice(0, 1).map((x) => m.index + x.index),
    );
    const motivo = texto.slice(m.index + m[0].length, fimMotivo).trim().replace(/^Injury\/Illness ?- ?/, '');
    if (IGNORAR.test(motivo)) return;
    (porTime[time.sigla] ??= []).push({ jogador: `${m[2]} ${m[1]}`, status: STATUS[m[3]], motivo });
  });
  return porTime;
}

// In n8n this file is the body of a Code node; under Node it is a module for the tests.
if (typeof $input !== 'undefined') {
  const entrada = $input.first().json;
  return [{ json: { tipo: 'desfalques', porTime: entrada.text ? lerRelatorio(entrada.text) : {}, falha: entrada.text ? null : 'relatório de lesões indisponível' } }];
} else {
  module.exports = { lerRelatorio };
}
