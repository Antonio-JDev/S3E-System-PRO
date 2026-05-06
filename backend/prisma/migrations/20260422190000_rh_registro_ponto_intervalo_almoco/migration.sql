-- AlterTable: registros_ponto
-- Intervalo de almoço explícito (manual) para conferência de ponto

ALTER TABLE "registros_ponto"
  ADD COLUMN IF NOT EXISTS "intervaloAlmocoInicio" TEXT;

ALTER TABLE "registros_ponto"
  ADD COLUMN IF NOT EXISTS "intervaloAlmocoFim" TEXT;

ALTER TABLE "registros_ponto"
  ADD COLUMN IF NOT EXISTS "intervaloAlmocoOrigem" TEXT;

