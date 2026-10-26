"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Aviso } from "@/components/Aviso";

// Unsubscribing takes a click, not just opening the link: Gmail and Outlook open
// every link in an e-mail to scan it, and that must not unsubscribe anyone.
export function Descadastro() {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<"parado" | "enviando" | "feito" | "erro">("parado");

  async function sair() {
    setEstado("enviando");
    try {
      const r = await fetch("/api/descadastrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setEstado((await r.json()).ok ? "feito" : "erro");
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "feito") return <Aviso titulo="Pronto">Você não vai mais receber o Sexto Homem. Se mudar de ideia, é só se inscrever de novo.</Aviso>;
  if (estado === "erro") return <Aviso titulo="Link inválido">Esse link de descadastro não é válido ou já foi usado.</Aviso>;
  return (
    <Aviso titulo="Sair da newsletter?" voltar={false}>
      <p>Você deixa de receber as edições a partir de amanhã.</p>
      <button
        onClick={sair}
        disabled={estado === "enviando"}
        className="mt-8 rounded-xl bg-ink px-6 py-3.5 font-semibold text-white transition hover:bg-erro disabled:opacity-60"
      >
        {estado === "enviando" ? "Saindo…" : "Confirmar descadastro"}
      </button>
    </Aviso>
  );
}
