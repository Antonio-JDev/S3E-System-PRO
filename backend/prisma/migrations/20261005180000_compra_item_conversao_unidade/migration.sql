-- Unidade comercial do item da compra e auditoria de conversão de unidade (ex.: cabo em km -> m).
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "unidadeMedida" TEXT;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "unidadeOriginal" TEXT;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "quantidadeOriginal" DOUBLE PRECISION;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "valorUnitOriginal" DOUBLE PRECISION;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "conversaoUnidadeEm" TIMESTAMP(3);
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "conversaoUnidadePorId" TEXT;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "conversaoUnidadePorNome" TEXT;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "conversaoUnidadeOrigem" TEXT;
