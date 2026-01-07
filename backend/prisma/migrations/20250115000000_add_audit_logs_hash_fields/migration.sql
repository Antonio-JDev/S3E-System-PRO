-- AlterTable
-- Adiciona campos para auditoria imutável em cadeia (hash chain)
-- Usa IF NOT EXISTS para evitar erros se os campos já existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'hash') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "hash" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'previousHash') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "previousHash" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'chainId') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "chainId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'sequence') THEN
        ALTER TABLE "audit_logs" ADD COLUMN "sequence" INTEGER;
    END IF;
END $$;

-- CreateIndex (com IF NOT EXISTS implícito via verificação)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_chainId_idx') THEN
        CREATE INDEX "audit_logs_chainId_idx" ON "audit_logs"("chainId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_entity_entityId_idx') THEN
        CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
    END IF;
END $$;

