-- ============================================
-- Script para adicionar colunas faltantes
-- Execute este script no banco de dados PostgreSQL
-- ============================================

-- 1. Adicionar coluna dataAgendamento em contas_pagar
ALTER TABLE "contas_pagar" 
ADD COLUMN IF NOT EXISTS "dataAgendamento" TIMESTAMP(3);

-- 2. Adicionar coluna ncm em orcamento_items
ALTER TABLE "orcamento_items" 
ADD COLUMN IF NOT EXISTS "ncm" TEXT;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contas_pagar' 
  AND column_name IN ('dataAgendamento');

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orcamento_items' 
  AND column_name IN ('ncm');
