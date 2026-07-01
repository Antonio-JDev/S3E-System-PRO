-- AlterTable
-- Adiciona campos para auditoria imutável em cadeia (hash chain)
-- Em instalações novas, audit_logs só é criada em 20260213_add_audit_logs (com essas colunas).
-- Esta migration é no-op nesse caso; em bases legadas, adiciona colunas camelCase se faltarem.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) THEN
        RETURN;
    END IF;

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
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_chainId_idx') THEN
        CREATE INDEX "audit_logs_chainId_idx" ON "audit_logs"("chainId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'audit_logs_entity_entityId_idx') THEN
        CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");
    END IF;
END $$;
