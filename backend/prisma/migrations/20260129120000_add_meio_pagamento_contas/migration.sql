-- AlterTable
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "meioPagamento" TEXT;

-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "meioPagamento" TEXT;
