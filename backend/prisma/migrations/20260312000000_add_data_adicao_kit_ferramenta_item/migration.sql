-- AlterTable
-- Adiciona coluna dataAdicao em kit_ferramenta_itens: data em que a ferramenta foi adicionada ao kit.
ALTER TABLE "kit_ferramenta_itens" ADD COLUMN IF NOT EXISTS "dataAdicao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
