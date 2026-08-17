-- COSMOS — schema inicial
-- Este ficheiro corre automaticamente na primeira arrancada do servidor.
-- É idempotente: pode correr múltiplas vezes sem partir nada.

CREATE TABLE IF NOT EXISTS testimonials (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(40),
  place        VARCHAR(80),
  story        VARCHAR(600) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_created
  ON testimonials(created_at DESC);

-- Preparação para features futuras. Deixado como comentário
-- para não criar tabelas antes de sabermos os requisitos exatos.
--
-- CREATE TABLE IF NOT EXISTS users (
--   id            SERIAL PRIMARY KEY,
--   email         VARCHAR(255) UNIQUE NOT NULL,
--   password_hash VARCHAR(255),
--   verified_at   TIMESTAMPTZ,
--   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );
--
-- CREATE TABLE IF NOT EXISTS event_subscriptions (
--   id            SERIAL PRIMARY KEY,
--   user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
--   event_key     VARCHAR(100) NOT NULL,
--   notify_hours  INTEGER DEFAULT 24,
--   created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   UNIQUE(user_id, event_key)
-- );
