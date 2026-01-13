-- Script para aplicar manualmente a migration de fracionamento
-- Execute este script diretamente no banco de dados de produção se necessário

-- AlterTable: Adicionar campos de fracionamento em Material
ALTER TABLE "materiais" 
ADD COLUMN IF NOT EXISTS "quantidadePorEmbalagem" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "tipoEmbalagem" TEXT,
ADD COLUMN IF NOT EXISTS "precoEmbalagem" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "precoUnitario" DOUBLE PRECISION;

-- AlterTable: Adicionar campos de fracionamento em CompraItem
ALTER TABLE "compra_items" 
ADD COLUMN IF NOT EXISTS "quantidadeFracionada" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "tipoEmbalagem" TEXT,
ADD COLUMN IF NOT EXISTS "unidadeEmbalagem" TEXT,
ADD COLUMN IF NOT EXISTS "fracionamentoAplicado" BOOLEAN DEFAULT false;

-- Verificar se as colunas foram criadas
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'compra_items' 
AND column_name IN ('quantidadeFracionada', 'tipoEmbalagem', 'unidadeEmbalagem', 'fracionamentoAplicado')
ORDER BY column_name;
