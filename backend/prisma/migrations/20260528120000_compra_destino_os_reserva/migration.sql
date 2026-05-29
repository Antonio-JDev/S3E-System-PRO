-- CreateEnum
CREATE TYPE "DestinoCompraAvulsa" AS ENUM ('ESTOQUE', 'OBRA', 'PROJETO');

-- AlterTable compras
ALTER TABLE "compras" ADD COLUMN IF NOT EXISTS "destinoTipo" "DestinoCompraAvulsa";
ALTER TABLE "compras" ADD COLUMN IF NOT EXISTS "projetoId" TEXT;

-- AlterTable compra_items
ALTER TABLE "compra_items" ADD COLUMN IF NOT EXISTS "destinoEstoque" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable reservas_material_projeto
CREATE TABLE IF NOT EXISTS "reservas_material_projeto" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "compraId" TEXT,
    "compraItemId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_material_projeto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reservas_material_projeto_projetoId_idx" ON "reservas_material_projeto"("projetoId");
CREATE INDEX IF NOT EXISTS "reservas_material_projeto_materialId_idx" ON "reservas_material_projeto"("materialId");

ALTER TABLE "compras" DROP CONSTRAINT IF EXISTS "compras_projetoId_fkey";
ALTER TABLE "compras" ADD CONSTRAINT "compras_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservas_material_projeto" DROP CONSTRAINT IF EXISTS "reservas_material_projeto_projetoId_fkey";
ALTER TABLE "reservas_material_projeto" ADD CONSTRAINT "reservas_material_projeto_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reservas_material_projeto" DROP CONSTRAINT IF EXISTS "reservas_material_projeto_materialId_fkey";
ALTER TABLE "reservas_material_projeto" ADD CONSTRAINT "reservas_material_projeto_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservas_material_projeto" DROP CONSTRAINT IF EXISTS "reservas_material_projeto_compraId_fkey";
ALTER TABLE "reservas_material_projeto" ADD CONSTRAINT "reservas_material_projeto_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reservas_material_projeto" DROP CONSTRAINT IF EXISTS "reservas_material_projeto_compraItemId_fkey";
ALTER TABLE "reservas_material_projeto" ADD CONSTRAINT "reservas_material_projeto_compraItemId_fkey" FOREIGN KEY ("compraItemId") REFERENCES "compra_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
