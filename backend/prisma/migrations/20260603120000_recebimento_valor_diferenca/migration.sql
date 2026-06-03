-- Recebimento com diferença (retenção/imposto): valor que não entra no caixa mas quita a parcela
ALTER TABLE "recebimentos_parciais" ADD COLUMN IF NOT EXISTS "valorDiferenca" DOUBLE PRECISION;
ALTER TABLE "recebimentos_parciais" ADD COLUMN IF NOT EXISTS "motivoDiferenca" TEXT;
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "valorDiferenca" DOUBLE PRECISION;
