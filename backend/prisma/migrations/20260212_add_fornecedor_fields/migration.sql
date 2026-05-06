-- Migration: add fornecedor fiscal fields
-- Date: 2026-02-12
BEGIN;

-- Campos opcionais para informações fiscais retornadas pela BrasilAPI
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS cep TEXT;

-- Campos fiscais úteis para faturamento/relatórios
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS cnae_fiscal INTEGER;
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS codigo_municipio_ibge INTEGER;
ALTER TABLE IF EXISTS fornecedores ADD COLUMN IF NOT EXISTS situacao_cadastral INTEGER;

COMMIT;

