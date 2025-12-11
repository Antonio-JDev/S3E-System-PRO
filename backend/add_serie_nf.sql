-- Adicionar coluna serieNF na tabela compras
ALTER TABLE compras ADD COLUMN IF NOT EXISTS "serieNF" TEXT;
