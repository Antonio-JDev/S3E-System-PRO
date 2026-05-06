-- AlterTable: adicionar campos de endereço ao ContatoLead (para preencher orçamento)
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "logradouro" TEXT;
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "numero" TEXT;
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "bairro" TEXT;
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "cep" TEXT;
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "cidade" TEXT;
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "estado" TEXT;
