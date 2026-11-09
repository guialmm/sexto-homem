import { connection } from "next/server";

import { consulta } from "@/lib/db";

type Edicao = { data: string; assunto: string; html: string };

// The site shows the latest edition as a sample. Placeholders get neutral values:
// no subscriber's name or unsubscribe link ever leaves this query.
export async function GET() {
  await connection(); // read the database on every request, never at build time
  const [edicao] = await consulta<Edicao>(
    `SELECT to_char(data, 'YYYY-MM-DD') AS data, assunto,
       replace(replace(replace(html, '{{NOME}}', 'leitor'), '{{DESTAQUE_TIME}}', ''), '{{DESCADASTRAR}}', '#') AS html
     FROM edicoes
     WHERE status = 'enviada'
     ORDER BY data DESC LIMIT 1`,
  );
  return Response.json(edicao?.html ? { ok: true, ...edicao } : { ok: false });
}
