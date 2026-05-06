-- Alíquotas por empresa (CNPJ) para cálculo de custo agregado e lucro líquido em orçamentos
ALTER TABLE "empresas_fiscais" ADD COLUMN IF NOT EXISTS "aliquotaMaterial" DOUBLE PRECISION DEFAULT 8;
ALTER TABLE "empresas_fiscais" ADD COLUMN IF NOT EXISTS "aliquotaServico" DOUBLE PRECISION DEFAULT 8;

UPDATE "empresas_fiscais" SET "aliquotaMaterial" = COALESCE("aliquotaMaterial", 8) WHERE "aliquotaMaterial" IS NULL;
UPDATE "empresas_fiscais" SET "aliquotaServico" = COALESCE("aliquotaServico", 8) WHERE "aliquotaServico" IS NULL;
