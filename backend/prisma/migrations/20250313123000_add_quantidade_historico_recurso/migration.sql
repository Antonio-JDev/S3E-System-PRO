-- No-op em instalações novas: historico_recurso_humano é criado depois (20260124...).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'historico_recurso_humano'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'historico_recurso_humano' AND column_name = 'quantidade'
    ) THEN
        ALTER TABLE "historico_recurso_humano" ADD COLUMN "quantidade" double precision;
    END IF;
END $$;
