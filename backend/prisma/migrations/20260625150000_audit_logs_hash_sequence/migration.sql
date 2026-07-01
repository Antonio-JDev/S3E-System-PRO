-- Garante colunas de cadeia de hash em bases onde 20250115000000 foi marcada applied sem executar.
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "sequence" INTEGER;
