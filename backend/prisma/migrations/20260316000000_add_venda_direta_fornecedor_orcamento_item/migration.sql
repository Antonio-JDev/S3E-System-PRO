-- AlterTable
ALTER TABLE "orcamento_items" ADD COLUMN IF NOT EXISTS "vendaDiretaFornecedor" BOOLEAN NOT NULL DEFAULT false;
