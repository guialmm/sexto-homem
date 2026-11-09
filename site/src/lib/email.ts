import nodemailer from "nodemailer";

// Brevo in production (smtp-relay.brevo.com:587, STARTTLS); Mailpit locally,
// which catches every message so nothing leaves the machine.
const porta = Number(process.env.SMTP_PORT ?? (process.env.SMTP_HOST ? 587 : 1026));
const transporte = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: porta,
  secure: porta === 465,
  requireTLS: porta === 587,
  auth: process.env.SMTP_LOGIN ? { user: process.env.SMTP_LOGIN, pass: process.env.SMTP_CHAVE } : undefined,
});

// REMETENTE may be a bare address (the one verified in Brevo); the inbox shows the name.
const endereco = process.env.REMETENTE ?? "newsletter@sextohomem.test";
const REMETENTE = endereco.includes("<") ? endereco : `Sexto Homem <${endereco}>`;

export async function enviarEmail(para: string, assunto: string, html: string) {
  await transporte.sendMail({ from: REMETENTE, to: para, subject: assunto, html });
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailConfirmacao(nome: string, link: string) {
  return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e1610;background:#fbf7f1">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7a6a5a;margin:0">Sexto Homem</p>
  <h1 style="font-size:24px;margin:8px 0 16px">Falta um passo, ${escapar(nome)}.</h1>
  <p style="font-size:16px;line-height:1.6">Confirme seu e-mail para começar a receber, toda manhã, o que rolou na NBA enquanto você dormia.</p>
  <p style="margin:28px 0"><a href="${escapar(link)}" style="background:#1e1610;color:#fbf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Confirmar inscrição</a></p>
  <p style="font-size:13px;color:#7a6a5a">Se não foi você, ignore este e-mail: sem confirmação, você não recebe nada.</p>
</div>`;
}
