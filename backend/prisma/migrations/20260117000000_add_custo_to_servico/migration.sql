-- AlterTable: Adicionar campo custo em Servico
ALTER TABLE "servicos" 
ADD COLUMN IF NOT EXISTS "custo" DOUBLE PRECISION;
