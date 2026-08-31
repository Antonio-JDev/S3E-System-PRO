-- AlterTable
ALTER TABLE "tarefas_internas" ADD COLUMN "criadoPorId" TEXT;

-- CreateIndex
CREATE INDEX "tarefas_internas_criadoPorId_idx" ON "tarefas_internas"("criadoPorId");

-- AddForeignKey
ALTER TABLE "tarefas_internas" ADD CONSTRAINT "tarefas_internas_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
