-- AlterTable
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "ferramentaId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compra_items_ferramentaId_fkey'
  ) THEN
    ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_ferramentaId_fkey" 
    FOREIGN KEY ("ferramentaId") REFERENCES "ferramentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex (optional - Prisma may add this)
CREATE INDEX IF NOT EXISTS "compra_items_ferramentaId_idx" ON "compra_items"("ferramentaId");
