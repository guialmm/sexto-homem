"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Aviso } from "@/components/Aviso";

type Resultado = { ok: boolean; nome?: string; erro?: string };

export function Confirmacao() {
  const token = useSearchParams().get("token") ?? "";
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const enviado = useRef(false);

  useEffect(() => {
    if (enviado.current) return; // React runs effects twice in development
    enviado.current = true;
    fetch(`/api/confirmar?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setResultado)
      .catch(() => setResultado({ ok: false, erro: "Não deu para confirmar agora. Tente abrir o link de novo." }));
  }, [token]);

  if (!resultado) return <Aviso titulo="Confirmando…" voltar={false} />;
  if (!resultado.ok) return <Aviso titulo="Link inválido">Esse link já foi usado ou expirou. Se ainda não recebe a newsletter, inscreva-se de novo.</Aviso>;
  return (
    <Aviso titulo={`Tudo certo, ${resultado.nome?.split(" ")[0]}`}>
      Sua inscrição está confirmada. A próxima edição chega amanhã às 8h.
    </Aviso>
  );
}
