-- AlterTable: permitir entrada manual de recursos (sem compra vinculada)
-- compraId passa a ser opcional: NULL = recurso adicionado manualmente
ALTER TABLE "recurso_humano_estoque" ALTER COLUMN "compraId" DROP NOT NULL;
