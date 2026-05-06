-- AlterTable: adicionar campo classificacao em contas_pagar (movimentações, fluxo de caixa, DRE)
ALTER TABLE "contas_pagar" ADD COLUMN "classificacao" TEXT;

-- CreateIndex
CREATE INDEX "contas_pagar_classificacao_idx" ON "contas_pagar"("classificacao");
