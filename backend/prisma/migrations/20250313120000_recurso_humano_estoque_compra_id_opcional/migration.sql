-- AlterTable: permitir entrada manual no Estoque de Recursos Humanos (itens já na empresa, sem compra cadastrada)
ALTER TABLE "recurso_humano_estoque" ALTER COLUMN "compraId" DROP NOT NULL;
