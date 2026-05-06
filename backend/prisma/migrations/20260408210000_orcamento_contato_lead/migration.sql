-- Vincula orçamento ao lead do CRM (funil)
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "contatoLeadId" TEXT;

CREATE INDEX IF NOT EXISTS "orcamentos_contatoLeadId_idx" ON "orcamentos"("contatoLeadId");

ALTER TABLE "orcamentos" DROP CONSTRAINT IF EXISTS "orcamentos_contatoLeadId_fkey";

ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_contatoLeadId_fkey" FOREIGN KEY ("contatoLeadId") REFERENCES "contato_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
