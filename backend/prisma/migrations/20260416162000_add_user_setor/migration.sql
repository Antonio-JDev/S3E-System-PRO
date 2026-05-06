-- Add optional user department used in WhatsApp CRM signature
ALTER TABLE "users"
ADD COLUMN "setor" TEXT;
