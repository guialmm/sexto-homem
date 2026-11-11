"use client";

import { useState } from "react";

import { TIMES } from "@/lib/times";


type Estado = { tipo: "parado" } | { tipo: "enviando" } | { tipo: "ok"; email: string } | { tipo: "erro"; mensagem: string };

export function Inscricao() {
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEstado({ tipo: "enviando" });
    try {
      const r = await fetch("/api/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: dados.get("nome"),
          email: dados.get("email"),
          time: dados.get("time"),
          consentimento: dados.get("consentimento") === "on",
        }),
      });
      const corpo = await r.json().catch(() => null);
      if (!r.ok || !corpo?.ok) throw new Error(corpo?.erro ?? "Não deu certo agora. Tente de novo em instantes.");
      setEstado({ tipo: "ok", email: String(dados.get("email") ?? "") });
    } catch (e) {
      setEstado({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Não deu certo agora." });
    }
  }

  if (estado.tipo === "ok") {
    // No celebration yet: without the click in the e-mail, nothing arrives.
    return (
      <div role="status" className="animate-subir flex items-start gap-5 rounded-2xl border-2 border-bola bg-card p-5">
        <svg viewBox="0 0 48 48" className="size-12 shrink-0" aria-hidden>
          <rect x="4" y="10" width="40" height="28" rx="4" className="fill-none stroke-ink" strokeWidth="3" />
          <path d="M6 13 L24 27 L42 13" className="fill-none stroke-bola" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <div>
          <p className="font-placar text-3xl font-extrabold uppercase leading-none">Falta confirmar</p>
          <p className="mt-2">
            Mandamos um e-mail para <strong className="break-all">{estado.email}</strong>. Abra e clique em{" "}
            <strong>Confirmar inscrição</strong>: <strong>sem esse clique, você não recebe a newsletter.</strong>
          </p>
          <p className="mt-2 text-sm text-apagado">Não chegou em um minuto? Olhe o spam e a aba Promoções.</p>
        </div>
      </div>
    );
  }

  const campo = "w-full rounded-xl border border-linha bg-card px-4 py-3 outline-none transition focus:border-ink";
  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="nome" required maxLength={80} placeholder="Seu nome" autoComplete="given-name" className={campo} />
        <input name="email" type="email" required maxLength={200} placeholder="seu@email.com" autoComplete="email" className={campo} />
      </div>
      <select name="time" defaultValue="" className={`${campo} appearance-none text-apagado`}>
        <option value="">Time do coração (opcional)</option>
        {TIMES.map(([sigla, nome]) => (
          <option key={sigla} value={sigla}>
            {nome}
          </option>
        ))}
      </select>
      <label className="flex items-start gap-3 text-sm text-apagado">
        <input name="consentimento" type="checkbox" required className="mt-0.5 size-4 accent-bola" />
        Aceito receber o Sexto Homem por e-mail. Dá para sair com um clique em qualquer edição.
      </label>
      <button
        disabled={estado.tipo === "enviando"}
        className="w-full rounded-xl bg-ink px-6 py-3.5 font-semibold text-white transition hover:bg-bola disabled:opacity-60 sm:w-auto"
      >
        {estado.tipo === "enviando" ? "Inscrevendo…" : "Quero receber de graça"}
      </button>
      <p className="text-sm text-apagado">
        Depois de enviar, confirme pelo link que chega no seu e-mail: só assim a inscrição vale.
      </p>
      {estado.tipo === "erro" && (
        <p role="alert" className="text-sm text-erro">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
