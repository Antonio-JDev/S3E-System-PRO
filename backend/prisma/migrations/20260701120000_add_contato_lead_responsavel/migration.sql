-- AlterTable
ALTER TABLE "contato_leads" ADD COLUMN "responsavelId" TEXT;

-- CreateIndex
CREATE INDEX "contato_leads_responsavelId_idx" ON "contato_leads"("responsavelId");

-- AddForeignKey
ALTER TABLE "contato_leads" ADD CONSTRAINT "contato_leads_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
