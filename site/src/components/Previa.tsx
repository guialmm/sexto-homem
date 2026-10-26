"use client";

import { useEffect, useState } from "react";

type Edicao = { ok: boolean; data?: string; assunto?: string; html?: string };

/** The latest edition that really went out, as subscribers saw it. */
export function Previa() {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  useEffect(() => {
    fetch("/api/ultima-edicao")
      .then((r) => r.json())
      .then(setEdicao)
      .catch(() => setEdicao({ ok: false }));
  }, []);

  const data = edicao?.data
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        timeZone: "UTC",
      }).format(new Date(edicao.data))
    : null;

  return (
    <figure className="overflow-hidden rounded-2xl border border-linha bg-card shadow-[0_30px_60px_-30px_rgba(18,17,16,0.35)]">
      <figcaption className="flex items-center gap-3 border-b border-linha px-5 py-3 text-sm">
        <span className="size-2.5 rounded-full bg-bola" />
        <span className="min-w-0 flex-1 truncate font-medium">
          {edicao?.assunto ?? "Carregando a última edição…"}
        </span>
        {data && <span className="shrink-0 text-apagado">{data}</span>}
      </figcaption>
      {edicao?.ok && edicao.html ? (
        <iframe
          title="Última edição do Sexto Homem"
          // The e-mail's links have no target; inside the frame they would try to
          // load the source there, which the sandbox and the news sites both block.
          srcDoc={`<base target="_blank">${edicao.html}`}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="h-[620px] w-full"
        />
      ) : (
        <div className="grid h-[620px] place-items-center p-8 text-center text-apagado">
          {edicao ? "A primeira edição sai amanhã às 8h." : ""}
        </div>
      )}
    </figure>
  );
}
