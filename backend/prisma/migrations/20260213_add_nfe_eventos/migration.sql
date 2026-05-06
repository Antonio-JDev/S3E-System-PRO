-- Migration: add_nfe_eventos
-- Generated: 2026-02-13
--
BEGIN;

-- Ensure pgcrypto for gen_random_uuid (safe if already installed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create nfe_eventos table to store events/logs linked to notas_fiscais
-- NOTE: use TEXT for notaFiscalId to match existing notas_fiscais.id column type (text)
CREATE TABLE IF NOT EXISTS nfe_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notaFiscalId" TEXT REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  tipo VARCHAR NOT NULL,        -- INFO | SUCESSO | ERRO
  descricao TEXT NOT NULL,
  metadata JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries by nota and date
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_notafiscalid ON nfe_eventos("notaFiscalId");
CREATE INDEX IF NOT EXISTS idx_nfe_eventos_createdat ON nfe_eventos("createdAt");

COMMIT;

