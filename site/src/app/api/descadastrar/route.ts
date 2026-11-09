import { consulta } from "@/lib/db";

// POST only: Gmail and Outlook open every link in an e-mail (GET) to scan it,
// and that must not unsubscribe anyone. Any other method gets a 405.
export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const [inscrito] = await consulta<{ nome: string }>(
    `UPDATE inscritos SET status = 'descadastrado', descadastrado_em = now()
     WHERE status <> 'descadastrado' AND token_descadastro::text = $1
     RETURNING nome`,
    [String(corpo.token ?? "")],
  );
  return Response.json(inscrito ? { ok: true } : { ok: false, erro: "Link inválido ou já usado." });
}
