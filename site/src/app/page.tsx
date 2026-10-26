import { Bola } from "@/components/Bola";
import { Inscricao } from "@/components/Inscricao";
import { Previa } from "@/components/Previa";
import { Revelar } from "@/components/Revelar";

const PONTOS = [
  [
    "Tudo o que importa da noite",
    "Placares, cestinhas e o que decidiu cada jogo, mais as notícias do dia com link para a fonte.",
  ],
  [
    "Quem está fora hoje",
    "Os desfalques que pesam em cada jogo, tirados do relatório oficial de lesões da NBA.",
  ],
  [
    "Seu time primeiro",
    "Escolha o time do coração e a edição abre com ele: resultado de ontem ou jogo de hoje.",
  ],
];

export default function Inicio() {
  return (
    <div className="relative">
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16">
        <section className="relative min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-bola-texto">
            Todo dia às 8h · em português · de graça
          </p>
          <h1 className="mt-4 font-placar text-6xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl">
            <span className="entrar">
              A NBA da n<Bola atraso={250} />
              ite,
            </span>
            <span className="entrar" style={{ animationDelay: "120ms" }}>
              antes d<Bola atraso={400} /> café.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-apagado">
            Os jogos acabam de madrugada no Brasil. O Sexto Homem chega de manhã
            com o que você perdeu, em três minutos de leitura.
          </p>

          <div className="mt-8 max-w-xl">
            <Inscricao />
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {PONTOS.map(([titulo, texto], i) => (
              <li key={titulo}>
                <Revelar
                  atraso={i * 120}
                  className="border-t-2 border-ink pt-3"
                >
                  <p className="font-placar text-xl font-extrabold uppercase">
                    {titulo}
                  </p>
                  <p className="mt-1 text-sm text-apagado">{texto}</p>
                </Revelar>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative min-w-0 lg:sticky lg:top-8 lg:self-start">
          <Revelar>
            <Previa />
          </Revelar>
        </section>
      </div>
    </div>
  );
}
