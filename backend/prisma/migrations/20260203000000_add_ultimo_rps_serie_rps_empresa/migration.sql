-- AlterTable: NFS-e Pública Itajaí - gestão de numeração e série
ALTER TABLE "empresas_fiscais" ADD COLUMN IF NOT EXISTS "ultimoRpsEnviado" INTEGER;
ALTER TABLE "empresas_fiscais" ADD COLUMN IF NOT EXISTS "serieRps" TEXT;
