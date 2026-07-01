-- AlterTable: permitir entrada manual no Estoque de Recursos Humanos (itens já na empresa, sem compra cadastrada)
-- No-op em instalações novas: a tabela é criada depois (20260123...) já com compraId opcional.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'recurso_humano_estoque'
    ) THEN
        ALTER TABLE "recurso_humano_estoque" ALTER COLUMN "compraId" DROP NOT NULL;
    END IF;
END $$;
