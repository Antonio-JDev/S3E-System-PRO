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

-- AlterTable (com verificação para evitar erro se coluna já existe)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registros_atividade' AND column_name = 'usuarioId'
    ) THEN
        ALTER TABLE "registros_atividade" ADD COLUMN "usuarioId" TEXT;
        -- Atualizar registros existentes com um valor padrão (se necessário)
        UPDATE "registros_atividade" SET "usuarioId" = (SELECT id FROM "users" LIMIT 1) WHERE "usuarioId" IS NULL;
        -- Tornar NOT NULL após popular
        ALTER TABLE "registros_atividade" ALTER COLUMN "usuarioId" SET NOT NULL;
    END IF;
END $$;

-- CreateIndex (com IF NOT EXISTS implícito via DO block)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'registros_atividade' AND indexname = 'registros_atividade_usuarioId_idx'
    ) THEN
        CREATE INDEX "registros_atividade_usuarioId_idx" ON "registros_atividade"("usuarioId");
    END IF;
END $$;

-- AddForeignKey (com verificação)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'registros_atividade' 
        AND constraint_name = 'registros_atividade_usuarioId_fkey'
    ) THEN
        ALTER TABLE "registros_atividade" 
        ADD CONSTRAINT "registros_atividade_usuarioId_fkey" 
        FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
ALTER TABLE "kits_ferramenta" ADD CONSTRAINT "kits_ferramenta_eletricistaId_fkey" FOREIGN KEY ("eletricistaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
