import { consulta } from "@/lib/db";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  // Compared as text, so a malformed token simply matches nothing instead of erroring.
  const [inscrito] = await consulta<{ nome: string }>(
    `UPDATE inscritos SET status = 'ativo', confirmado_em = now()
     WHERE status = 'pendente' AND token_confirmacao::text = $1
     RETURNING nome`,
    [token],
  );
  return Response.json(inscrito ? { ok: true, nome: inscrito.nome } : { ok: false, erro: "Link inválido ou já usado." });
}
