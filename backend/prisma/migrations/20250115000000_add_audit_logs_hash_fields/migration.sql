-- AlterTable
-- Adiciona campos para auditoria imutável em cadeia (hash chain)
ALTER TABLE "audit_logs" ADD COLUMN "hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "chainId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "sequence" INTEGER;

-- CreateIndex
CREATE INDEX "audit_logs_chainId_idx" ON "audit_logs"("chainId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

