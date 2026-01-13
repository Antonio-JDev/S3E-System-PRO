-- AlterTable: Adicionar campos de fracionamento em Material
ALTER TABLE "materiais" 
ADD COLUMN IF NOT EXISTS "quantidadePorEmbalagem" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "tipoEmbalagem" TEXT,
ADD COLUMN IF NOT EXISTS "precoEmbalagem" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "precoUnitario" DOUBLE PRECISION;

-- AlterTable: Adicionar campos de fracionamento em CompraItem
-- IMPORTANTE: Usar aspas duplas para preservar camelCase (PostgreSQL converte para minúsculas sem aspas)
ALTER TABLE "compra_items" 
ADD COLUMN IF NOT EXISTS "quantidadeFracionada" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "tipoEmbalagem" TEXT,
ADD COLUMN IF NOT EXISTS "unidadeEmbalagem" TEXT,
ADD COLUMN IF NOT EXISTS "fracionamentoAplicado" BOOLEAN DEFAULT false;
