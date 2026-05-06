-- AlterEnum
ALTER TYPE "LancamentoFolhaCategoria" ADD VALUE IF NOT EXISTS 'PAGAMENTO_BANCO_HORAS';

-- AlterTable
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "horasFolgaAcumuladas" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "lancamentos_folha" ADD COLUMN IF NOT EXISTS "quantidadeHoras" DECIMAL(12,2);
