# Sexto Homem

[![CI](https://github.com/guialmm/sexto-homem/actions/workflows/ci.yml/badge.svg)](https://github.com/guialmm/sexto-homem/actions/workflows/ci.yml)
[![Edição diária](https://github.com/guialmm/sexto-homem/actions/workflows/edicao.yml/badge.svg)](https://github.com/guialmm/sexto-homem/actions/workflows/edicao.yml)

**No ar: [sextohomem.vercel.app](https://sextohomem.vercel.app)** — inscreva-se e receba amanhã cedo.

**A NBA da noite, antes do café.** Newsletter diária em português: os jogos acabam de
madrugada no Brasil, e às 8h chega o que você perdeu — resultados, as notícias que
importam e quem está fora dos jogos de hoje. Tudo coletado, escrito e enviado por um
workflow no **n8n**, sem ninguém encostar em nada — e sem servidor: roda todo dia no
GitHub Actions, com o banco no Neon e os e-mails pelo Brevo, tudo no plano gratuito.

| A edição | O site de inscrição |
|---|---|
| ![Edição de 26/10/2026, a da noite dos 52 pontos de Luka Doncic](docs/edicao.png) | ![Site com o formulário e a prévia da última edição enviada](docs/site.png) |

## O workflow

![Workflow da edição diária no n8n](docs/workflow.png)

Todo dia por volta das 8h (horário de Brasília):

1. **Coleta** em paralelo:
   - placares de ontem e jogos de hoje — JSON da ESPN;
   - o resumo de cada jogo de ontem (a matéria e os clipes de lances) e, para cada jogo de
     hoje, a chance de vitória do *Matchup Predictor* da ESPN, campanhas em casa e fora,
     últimos 5 jogos e quem joga em noites seguidas;
   - notícias — RSS da ESPN Brasil e da ESPN, e o *sitemap* de notícias do Lance (XML);
   - desfalques — o **relatório oficial de lesões da NBA, em PDF**.
2. **Descarta notícia repetida**: a URL é única no banco, então nada que saiu ontem volta hoje.
3. **A IA (Gemini) escreve a edição**: assunto, abertura, um comentário por jogo (o que
   decidiu, quem se machucou na partida), as 6 notícias mais relevantes traduzidas e
   resumidas, os motivos das lesões em português, os dois desfalques que mais pesam em cada
   jogo, o **motivo de cada palpite** e os **até 3 lances da noite** que valem o vídeo.
   - O favorito e a chance do palpite vêm da ESPN (ou da linha de apostas, ou da campanha):
     a IA só explica o porquê, não decide quem ganha.
   - Vídeos escolhidos como um editor de highlights: jogada de impacto primeiro; lesão só se
     for grave e o lance aparecer no clipe. "Jogador vai para o vestiário" nem chega à IA.
4. **Monta o e-mail** e **personaliza por leitor**: primeiro nome, link de descadastro e,
   se ele escolheu um time, o time dele no topo — "Seu time perdeu: Warriors 108 x 115
   Rockets" e, se joga de novo, o jogo de hoje com o palpite.
5. **Envia em lotes de 10** e registra cada envio.
6. Se qualquer passo falhar, o job do GitHub Actions falha e o GitHub avisa por e-mail;
   um último passo ainda confere no banco que a edição do dia ficou como `enviada`.

A inscrição fica no próprio site (rotas do Next.js): inscrever, confirmar (**double opt-in**),
descadastrar e a prévia da última edição, gravando e lendo direto no Postgres.

## Arquitetura (custo zero, sem servidor)

```mermaid
flowchart LR
  cron(["~7h · Vercel Cron"]) -- workflow_dispatch --> gha["GitHub Actions<br/>n8n descartável<br/>import → execute"]
  leitor(["leitor"]) --> vercel["Vercel · Next.js<br/>/api/inscrever · /api/confirmar<br/>/api/descadastrar · /api/ultima-edicao"]
  gha -- SQL --> neon[("Neon · Postgres (São Paulo)<br/>inscritos · edicoes · noticias · envios")]
  vercel -- SQL --> neon
  gha -- SMTP --> brevo["Brevo<br/>300 e-mails/dia"]
  vercel -- SMTP --> brevo
  brevo --> caixa(["caixa de entrada"])
```

- **Sem n8n ligado 24h.** O [`edicao.yml`](.github/workflows/edicao.yml) sobe o n8n 2.44.5 num
  container, importa as credenciais (montadas a partir dos *secrets* por
  [`credenciais-ci.mjs`](scripts/credenciais-ci.mjs)) e o `edicao.json`, executa uma vez e
  descarta tudo. O estado que importa — quem é inscrito, o que já foi enviado — mora no Neon.
- **Na hora certa.** O agendamento do próprio GitHub atrasa sob carga: no segundo dia no ar, a
  edição das 7h37 só saiu às 15h14. Agora quem dispara é o Vercel Cron (plano grátis: uma vez
  por dia, dentro da hora marcada), chamando uma rota protegida do site
  ([`disparar-edicao`](site/src/app/api/disparar-edicao/route.ts)) que pede o workflow por
  `workflow_dispatch` — esse começa em segundos. O cron do GitHub ficou como reserva às 8h17;
  se a edição do dia já saiu, ele não muda nada.
- **O agendamento não morre.** O GitHub desliga *crons* depois de 60 dias sem atividade no
  repositório; todo run termina reativando o próprio workflow pela API, o que zera esse prazo.
- **Log público, dados privados.** O repositório é público e o log do Actions também: a saída do
  `n8n execute` (que tem os e-mails dos inscritos) fica dentro do container; só o erro aparece.

## Problemas reais do caminho

O guia deste projeto diz: *nem toda fonte entrega os dados prontos*. Foi exatamente isso.

- **O relatório de lesões é um PDF sem estrutura.** O texto sai uma palavra por linha
  ("Dennis, / RayJ / Questionable / G / League / - / Two- / Way"). A leitura usa padrões —
  o confronto `ATL@ORL`, o nome do time, o jogador como "Sobrenome, Nome" seguido do status —
  e foi testada contra um relatório real. Ela descarta contratos *two-way* mandados à G League
  (não são notícia) e corta o cabeçalho que o PDF repete quando uma lista atravessa a página.
- **A NBA bloqueia robôs na página que lista os relatórios** (403). Em vez de disfarçar o
  robô de navegador, o workflow usa o fato de que o PDF sai a cada 15 minutos com o horário no
  nome (`Injury-Report_2026-10-21_09_45AM.pdf`): calcula os nomes do mais recente para trás e
  baixa direto do servidor de arquivos, que é público. O robô continua se identificando.
- **RSS que pararam no tempo.** Os feeds do The Playoffs e do Jumper Brasil respondem
  normalmente, mas o último item era de junho e de setembro. Saíram; entrou a ESPN Brasil — cujo
  feed "NBA" mistura futebol, então só valem os links com `/nba/` (o mesmo filtro do sitemap do Lance).
- **Gemini sobrecarregado.** No plano gratuito, os modelos mais novos respondem *503* em
  horário de pico. A chamada percorre uma lista de modelos; quando um esgota a cota *do dia*,
  pula direto para o próximo. Na primeira edição real, dois modelos falharam e o terceiro escreveu.
- **Se a IA cair de vez, a edição sai mesmo assim**, sem os comentários — os títulos em
  português entram como foram publicados. Uma fonte fora do ar vira uma nota no rodapé
  ("Hoje faltou: relatório de lesões"), não uma edição perdida.
- **O n8n come `{{ }}`.** O nó do Postgres trata chaves duplas na SQL como expressão dele e as
  apaga. A consulta que monta a prévia do site constrói as chaves com `chr(123)`.

## Garantias

| | Como |
|---|---|
| Ninguém recebe a mesma edição duas vezes | tabela `envios` (edição, inscrito); uma nova execução depois de uma queda continua de onde parou |
| Nenhuma notícia se repete entre edições | `url` única em `noticias`; notícia coletada mas ainda não enviada continua disponível |
| A IA não decide o palpite | favorito e chance vêm da ESPN; a IA escreve só o motivo |
| A IA não inventa link nem jogador | ela só referencia jogos e notícias pelo `id` recebido; links vêm do banco; ids e nomes fora da lista são descartados |
| Descadastro de verdade, e só de propósito | o link do e-mail abre uma página com botão; a rota só aceita `POST` — Gmail e Outlook abrem os links dos e-mails para checá-los, e isso não pode descadastrar ninguém |
| Inscrição não revela quem já é inscrito | a resposta é a mesma para e-mail novo e já cadastrado |
| LGPD | consentimento explícito com data, confirmação por e-mail, descadastro em um clique |
| SQL segura | todas as consultas são parametrizadas (um token com `'; drop table` só não encontra ninguém) |

## Código testável dentro de um workflow

Escrever JavaScript dentro de um JSON de 30 nós é ilegível e impossível de testar. Aqui, cada
nó de código é um arquivo em [`workflows/codigo/`](workflows/codigo) que roda no n8n e também
é importado pelos testes; [`scripts/montar-workflows.mjs`](scripts/montar-workflows.mjs) costura
tudo no `edicao.json` que o n8n importa. O CI falha se o JSON versionado não bater com o código.

```bash
npm test   # 14 testes: leitura do PDF, montagem da edição, personalização, filtro de notícias
```

## Rodando

### Em produção

| Onde | O quê |
|---|---|
| Neon | `psql "$DATABASE_URL" -f db/init/02_schema.sql`, uma vez |
| GitHub → *secrets* | `DATABASE_URL`, `SMTP_LOGIN`, `SMTP_CHAVE`, `REMETENTE`, `GEMINI_API_KEY`; variável `SITE_URL` |
| Vercel | *Root Directory* `site`; variáveis `DATABASE_URL`, `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_LOGIN`, `SMTP_CHAVE`, `REMETENTE`, `SITE_URL`, `CRON_SECRET` e `GH_DISPATCH_TOKEN` (token *fine-grained* só deste repositório, Actions: *read and write*) |

Rodar a edição fora de hora: **Actions → edicao → Run workflow** (o campo `data` refaz uma
manhã passada), ou `gh workflow run edicao.yml`.

### Local

Precisa de Docker e Node 22.

```bash
cp .env.example .env                # chave de criptografia do n8n e chave grátis do Gemini
docker compose up -d                # n8n, Postgres e Mailpit
scripts/importar.sh                 # credenciais locais + o workflow da edição, publicado

cd site && npm install && npm run dev -- --port 3001
```

- n8n: http://localhost:5678 (na primeira vez, crie a conta local)
- caixa de e-mails de teste: http://localhost:8026 — nenhum e-mail sai da máquina
- site: http://localhost:3001 — sem variáveis, usa o Postgres (porta 5435) e o Mailpit (1026) do Docker

Rodar a edição agora, sem esperar as 8h:

```bash
docker compose exec -e N8N_RUNNERS_BROKER_PORT=5690 n8n n8n execute --id=edicaoSextoHom01
SEXTO_DATA=2026-10-21 docker compose up -d n8n   # refaz uma manhã passada
```

## Estrutura

```
db/init/                 esquema: inscritos, edicoes, noticias, envios
workflows/
  edicao.json            a edição diária (gerado)
  codigo/*.js            os nós de código, um arquivo cada
scripts/                 montar-workflows.mjs, importar.sh, credenciais-ci.mjs
site/                    Next.js: página, prévia e as rotas /api da inscrição
.github/workflows/       ci.yml (testes e build), edicao.yml (a edição de todo dia)
testes/                  node --test
```

## Créditos

Placares, estatísticas e notícias: ESPN e Lance!. Desfalques: relatório oficial de lesões da
NBA. Projeto de portfólio, sem vínculo com a NBA. Licença MIT.
