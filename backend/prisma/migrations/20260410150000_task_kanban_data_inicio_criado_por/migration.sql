-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "dataInicio" TIMESTAMP(3),
ADD COLUMN     "criadoPorId" TEXT;

-- CreateIndex
CREATE INDEX "tasks_criadoPorId_idx" ON "tasks"("criadoPorId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
