import { consulta } from "@/lib/db";
import { emailConfirmacao, enviarEmail } from "@/lib/email";

const MENSAGEM = "Falta confirmar: abra o e-mail que enviamos e clique em Confirmar inscrição.";

type Inscrito = { nome: string; email: string; status: string; token_confirmacao: string };

export async function POST(request: Request) {
  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const nome = String(corpo.nome ?? "").trim().slice(0, 80);
  const email = String(corpo.email ?? "").trim().toLowerCase().slice(0, 200);
  const time = String(corpo.time ?? "").trim().toUpperCase().slice(0, 4);
  const consentimento = corpo.consentimento === true || corpo.consentimento === "true";

  let erro: string | null = null;
  if (!nome) erro = "Diga seu nome.";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) erro = "Esse e-mail não parece válido.";
  else if (!consentimento) erro = "Precisamos do seu consentimento para enviar a newsletter (LGPD).";
  if (erro) return Response.json({ ok: false, erro }, { status: 422 });

  // Same e-mail again: refresh name/team; a pending or unsubscribed address gets a
  // new confirmation token, an active one is left alone.
  const [inscrito] = await consulta<Inscrito>(
    `INSERT INTO inscritos (nome, email, time_favorito)
     VALUES ($1, $2, NULLIF($3, ''))
     ON CONFLICT (lower(email)) DO UPDATE SET
       nome = EXCLUDED.nome,
       time_favorito = EXCLUDED.time_favorito,
       consentimento_em = now(),
       status = CASE WHEN inscritos.status = 'descadastrado' THEN 'pendente' ELSE inscritos.status END,
       token_confirmacao = CASE WHEN inscritos.status = 'ativo' THEN inscritos.token_confirmacao ELSE gen_random_uuid() END
     RETURNING nome, email, status, token_confirmacao`,
    [nome, email, time],
  );

  if (inscrito.status !== "ativo") {
    const site = process.env.SITE_URL ?? new URL(request.url).origin;
    const link = `${site}/confirmar?token=${inscrito.token_confirmacao}`;
    await enviarEmail(inscrito.email, "Confirme sua inscrição no Sexto Homem", emailConfirmacao(inscrito.nome, link));
  }
  // The same answer for a new and an existing address: the form never reveals who subscribes.
  return Response.json({ ok: true, mensagem: MENSAGEM });
}
