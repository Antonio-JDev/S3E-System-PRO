-- Add missing column expected by Prisma seed/model
ALTER TABLE "configuracoes_sistema"
  ADD COLUMN IF NOT EXISTS "logoDanfeUrl" text;

