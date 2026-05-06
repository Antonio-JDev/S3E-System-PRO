-- Migration: add numeroSequencial to vendas
-- Created at: 2026-02-09T12:00:00Z
-- This migration adds an auto-incrementing "numeroSequencial" column to the "vendas" table.

DO $$
BEGIN
  -- Adicionar coluna numeroSequencial se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'vendas'
      AND column_name = 'numeroSequencial'
  ) THEN
    -- Primeiro, adicionar a coluna sem constraint
    ALTER TABLE "vendas" ADD COLUMN "numeroSequencial" SERIAL;
    
    -- Atualizar valores existentes com sequência baseada na data de criação
    WITH ranked_vendas AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as rn
      FROM "vendas"
    )
    UPDATE "vendas" v
    SET "numeroSequencial" = rv.rn
    FROM ranked_vendas rv
    WHERE v.id = rv.id;
    
    -- Agora adicionar a constraint UNIQUE
    ALTER TABLE "vendas" ADD CONSTRAINT "vendas_numeroSequencial_key" UNIQUE ("numeroSequencial");
  END IF;
END$$;
