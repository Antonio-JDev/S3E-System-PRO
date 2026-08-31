-- AlterTable
ALTER TABLE "veiculos" ADD COLUMN IF NOT EXISTS "dataVencimentoIpva" TIMESTAMP(3);
ALTER TABLE "veiculos" ADD COLUMN IF NOT EXISTS "dataVencimentoLicenciamento" TIMESTAMP(3);
