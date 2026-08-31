-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "unificacaoGrupoId" TEXT;
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "unificacaoContasOrigemIds" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contas_pagar_unificacaoGrupoId_idx" ON "contas_pagar"("unificacaoGrupoId");
