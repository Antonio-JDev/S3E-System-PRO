-- AlterTable: data da compra para entrada manual (quando não há compra vinculada)
ALTER TABLE "recurso_humano_estoque" ADD COLUMN "dataCompra" TIMESTAMP(3);
