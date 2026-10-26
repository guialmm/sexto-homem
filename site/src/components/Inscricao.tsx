"use client";

import { useState } from "react";

import { TIMES } from "@/lib/times";

type Estado = { tipo: "parado" } | { tipo: "enviando" } | { tipo: "ok"; mensagem: string } | { tipo: "erro"; mensagem: string };

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
      setEstado({ tipo: "ok", mensagem: corpo.mensagem });
    } catch (e) {
      setEstado({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Não deu certo agora." });
    }
  }

  if (estado.tipo === "ok") {
    return (
      <div className="animate-subir rounded-2xl border border-linha bg-card p-6">
        <p className="font-placar text-2xl font-extrabold uppercase">Quase lá</p>
        <p className="mt-2 text-apagado">{estado.mensagem} Se não aparecer em um minuto, olhe o spam.</p>
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
      {estado.tipo === "erro" && (
        <p role="alert" className="text-sm text-erro">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
