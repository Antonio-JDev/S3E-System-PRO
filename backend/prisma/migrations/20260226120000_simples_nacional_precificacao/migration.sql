-- Parâmetros de Precificação (Simples Nacional): config
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "aliquotaImpostoPadrao" DOUBLE PRECISION DEFAULT 8;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "markupFabricante" DOUBLE PRECISION DEFAULT 1.55;
ALTER TABLE "configuracoes_sistema" ADD COLUMN IF NOT EXISTS "markupRevendedor" DOUBLE PRECISION DEFAULT 1.10;
-- Backfill from existing columns if null
UPDATE "configuracoes_sistema" SET "aliquotaImpostoPadrao" = COALESCE("aliquotaImpostoPadrao", "percentualImpostoPadrao", 8);
UPDATE "configuracoes_sistema" SET "markupFabricante" = COALESCE("markupFabricante", "multiplicadorVenda", 1.55);
UPDATE "configuracoes_sistema" SET "markupRevendedor" = COALESCE("markupRevendedor", 1.10);

-- Material: custo agregado e valor imposto (DAS sobre valor de venda)
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "valorImposto" DOUBLE PRECISION;
ALTER TABLE "materiais" ADD COLUMN IF NOT EXISTS "custoAgregado" DOUBLE PRECISION;
