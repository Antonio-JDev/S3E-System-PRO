BEGIN;

-- Add serieNFe column to empresas_fiscais if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas_fiscais' AND column_name='serieNFe') THEN
        ALTER TABLE "empresas_fiscais" ADD COLUMN "serieNFe" text;
    END IF;
END$$;

COMMIT;

