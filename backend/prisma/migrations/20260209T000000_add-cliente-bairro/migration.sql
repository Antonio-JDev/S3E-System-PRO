-- Migration: add cliente.bairro
-- Created at: 2026-02-09T00:00:00Z
-- This migration adds a nullable "bairro" column to the "clientes" table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'clientes'
      AND column_name = 'bairro'
  ) THEN
    ALTER TABLE "clientes" ADD COLUMN "bairro" text;
  END IF;
END$$;

