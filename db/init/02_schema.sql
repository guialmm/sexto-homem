-- Newsletter data. Runs against POSTGRES_DB (sexto_homem) on first start;
-- in production run it once by hand: psql "$DATABASE_URL" -f db/init/02_schema.sql

CREATE TYPE status_inscrito AS ENUM ('pendente', 'ativo', 'descadastrado');

CREATE TABLE inscritos (
    id                serial PRIMARY KEY,
    email             text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    nome              text NOT NULL,
    time_favorito     text,                      -- abbreviation, e.g. 'BOS'
    status            status_inscrito NOT NULL DEFAULT 'pendente',
    -- Double opt-in and one-click unsubscribe; unguessable, never reused.
    token_confirmacao uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    token_descadastro uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    consentimento_em  timestamptz NOT NULL DEFAULT now(),   -- LGPD: when they agreed
    confirmado_em     timestamptz,
    descadastrado_em  timestamptz,
    criado_em         timestamptz NOT NULL DEFAULT now()
);
-- "Ana@Gmail.com" and "ana@gmail.com" are the same person.
CREATE UNIQUE INDEX inscritos_email_unico ON inscritos (lower(email));

CREATE TABLE edicoes (
    id            serial PRIMARY KEY,
    data          date NOT NULL UNIQUE,          -- one edition per morning
    assunto       text,
    html          text,
    jogos         int NOT NULL DEFAULT 0,
    noticias      int NOT NULL DEFAULT 0,
    destinatarios int NOT NULL DEFAULT 0,
    status        text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviando', 'enviada', 'falhou')),
    erro          text,
    criada_em     timestamptz NOT NULL DEFAULT now(),
    enviada_em    timestamptz
);

CREATE TABLE noticias (
    id           serial PRIMARY KEY,
    fonte        text NOT NULL,                  -- 'the_playoffs', 'jumper', 'lance', 'espn'
    titulo       text NOT NULL,
    url          text NOT NULL UNIQUE,           -- what keeps a story out of two editions
    publicada_em timestamptz,
    coletada_em  timestamptz NOT NULL DEFAULT now(),
    edicao_id    int REFERENCES edicoes (id) ON DELETE SET NULL
);

-- Who already got which edition: a re-run after a crash never mails anyone twice.
CREATE TABLE envios (
    edicao_id   int NOT NULL REFERENCES edicoes (id) ON DELETE CASCADE,
    inscrito_id int NOT NULL REFERENCES inscritos (id) ON DELETE CASCADE,
    enviado_em  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (edicao_id, inscrito_id)
);
