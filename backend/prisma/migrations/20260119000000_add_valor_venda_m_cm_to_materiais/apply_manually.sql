-- Script para aplicar manualmente no banco de dados de produção
-- Execute este script diretamente no PostgreSQL se a migration automática falhar

-- Adicionar colunas valorVendaM e valorVendaCM à tabela materiais
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "valorVendaM" DOUBLE PRECISION;
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "valorVendaCM" DOUBLE PRECISION;

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'materiais' 
AND column_name IN ('valorVendaM', 'valorVendaCM');
