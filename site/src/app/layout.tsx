import type { Metadata } from "next";
import { Big_Shoulders, Manrope } from "next/font/google";
import Link from "next/link";

import { Placar } from "@/components/Placar";
import { Quadra } from "@/components/Quadra";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Sexto Homem · A NBA da noite, antes do café",
  description:
    "Newsletter diária da NBA em português: resultados, o que rolou e quem está fora dos jogos de hoje. Todo dia às 8h.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Quadra />
        <Placar />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="font-placar text-2xl font-extrabold uppercase tracking-wide"
          >
            Sexto <span className="text-bola-texto">Homem</span>
          </Link>
          <a
            href="https://github.com/guialmm/sexto-homem"
            className="rounded-full border border-linha px-4 py-1.5 text-sm text-apagado transition hover:border-ink hover:text-ink"
          >
            Como é feito
          </a>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-xs text-apagado sm:px-8">
          Projeto de portfólio. Placares e estatísticas: ESPN. Desfalques:
          relatório oficial da NBA. Sem vínculo com a NBA.
        </footer>
      </body>
    </html>
  );
}
