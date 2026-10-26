import Link from "next/link";
import type { ReactNode } from "react";

export function Aviso({ titulo, children, voltar = true }: { titulo: string; children?: ReactNode; voltar?: boolean }) {
  return (
    <div className="animate-subir mx-auto max-w-xl px-5 py-20 text-center sm:px-8">
      <h1 className="font-placar text-5xl font-extrabold uppercase leading-none">{titulo}</h1>
      <div className="mt-5 text-lg text-apagado">{children}</div>
      {voltar && (
        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-bola-texto hover:underline">
          Voltar para o início
        </Link>
      )}
    </div>
  );
}
