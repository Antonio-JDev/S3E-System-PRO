-- Vinculo persistente fornecedor (NF) → material do estoque
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "codigoFornecedor" TEXT;
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "ean" TEXT;

CREATE TABLE IF NOT EXISTS "material_fornecedor_alias" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "codigoFornecedor" TEXT,
    "ean" TEXT,
    "nomeOriginal" TEXT NOT NULL,
    "nomeNormalizado" TEXT NOT NULL,
    "ncm" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "material_fornecedor_alias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "material_fornecedor_alias_fornecedorId_nomeNormalizado_key"
  ON "material_fornecedor_alias"("fornecedorId", "nomeNormalizado");

CREATE INDEX IF NOT EXISTS "material_fornecedor_alias_fornecedorId_codigoFornecedor_idx"
  ON "material_fornecedor_alias"("fornecedorId", "codigoFornecedor");

CREATE INDEX IF NOT EXISTS "material_fornecedor_alias_ean_idx"
  ON "material_fornecedor_alias"("ean");

CREATE INDEX IF NOT EXISTS "material_fornecedor_alias_materialId_idx"
  ON "material_fornecedor_alias"("materialId");

ALTER TABLE "material_fornecedor_alias" DROP CONSTRAINT IF EXISTS "material_fornecedor_alias_materialId_fkey";
ALTER TABLE "material_fornecedor_alias"
  ADD CONSTRAINT "material_fornecedor_alias_materialId_fkey"
  FOREIGN KEY ("materialId") REFERENCES "materiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "material_fornecedor_alias" DROP CONSTRAINT IF EXISTS "material_fornecedor_alias_fornecedorId_fkey";
ALTER TABLE "material_fornecedor_alias"
  ADD CONSTRAINT "material_fornecedor_alias_fornecedorId_fkey"
  FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
