-- AlterTable
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "numero" TEXT;

-- AlterTable
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "numeroObra" TEXT;
