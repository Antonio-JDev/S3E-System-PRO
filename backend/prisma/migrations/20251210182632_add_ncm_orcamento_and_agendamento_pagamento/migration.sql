/*
  Warnings:

  - Added the required column `usuarioId` to the `registros_atividade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "dataAgendamento" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ferramentas" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "kit_ferramenta_itens" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "kits_ferramenta" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "orcamento_items" ADD COLUMN     "ncm" TEXT;

-- AlterTable
ALTER TABLE "registros_atividade" ADD COLUMN     "usuarioId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "registros_atividade_usuarioId_idx" ON "registros_atividade"("usuarioId");

-- AddForeignKey
ALTER TABLE "registros_atividade" ADD CONSTRAINT "registros_atividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_ferramenta" ADD CONSTRAINT "kits_ferramenta_eletricistaId_fkey" FOREIGN KEY ("eletricistaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
