-- AlterTable: ContaReceber - permitir receitas manuais (sem venda)
ALTER TABLE "contas_receber" ALTER COLUMN "vendaId" DROP NOT NULL;

ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'VENDA';
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "pagadorNome" TEXT;

CREATE INDEX IF NOT EXISTS "contas_receber_tipo_idx" ON "contas_receber"("tipo");
CREATE INDEX IF NOT EXISTS "contas_receber_vendaId_idx" ON "contas_receber"("vendaId");
