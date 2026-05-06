-- Add contratoPdfUrl and contratoHtml to vendas (contrato assinado / Jodit)
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "contratoPdfUrl" TEXT;
ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "contratoHtml" TEXT;
