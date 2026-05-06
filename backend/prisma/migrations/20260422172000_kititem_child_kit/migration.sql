-- AlterTable: kit_items
-- Permite kit dentro de kit: KitItem aponta para material OU kit filho

ALTER TABLE "kit_items"
  ALTER COLUMN "materialId" DROP NOT NULL;

ALTER TABLE "kit_items"
  ADD COLUMN IF NOT EXISTS "kitFilhoId" TEXT;

-- Foreign key para kit filho (auto-relação)
ALTER TABLE "kit_items"
  ADD CONSTRAINT "kit_items_kitFilhoId_fkey"
  FOREIGN KEY ("kitFilhoId") REFERENCES "kits"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Garantir que exatamente um dos campos esteja preenchido (material OU kitFilho)
ALTER TABLE "kit_items"
  ADD CONSTRAINT "kit_items_material_or_child_check"
  CHECK (
    ("materialId" IS NOT NULL AND "kitFilhoId" IS NULL)
    OR
    ("materialId" IS NULL AND "kitFilhoId" IS NOT NULL)
  );

-- Índices opcionais para performance
CREATE INDEX IF NOT EXISTS "kit_items_kitFilhoId_idx" ON "kit_items"("kitFilhoId");
