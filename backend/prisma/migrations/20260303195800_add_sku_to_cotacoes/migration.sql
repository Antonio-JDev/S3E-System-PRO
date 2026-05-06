-- CreateIndex
ALTER TABLE "cotacoes" ADD COLUMN "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cotacoes_sku_key" ON "cotacoes"("sku");

-- CreateIndex  
CREATE INDEX "cotacoes_sku_idx" ON "cotacoes"("sku");