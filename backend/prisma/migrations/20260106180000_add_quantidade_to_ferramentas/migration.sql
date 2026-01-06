-- Add quantidade column to ferramentas
-- This aligns the database schema with Prisma model:
-- model Ferramenta {
--   ...
--   quantidade Int @default(0)
-- }

ALTER TABLE "ferramentas"
ADD COLUMN IF NOT EXISTS "quantidade" INTEGER NOT NULL DEFAULT 0;


