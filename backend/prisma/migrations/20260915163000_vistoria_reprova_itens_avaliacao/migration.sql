-- AlterTable: avaliação detalhada por item na reprova CELESC
ALTER TABLE "historico_reprovacao_vistoria"
  ADD COLUMN IF NOT EXISTS "itensAvaliacao" JSONB;
