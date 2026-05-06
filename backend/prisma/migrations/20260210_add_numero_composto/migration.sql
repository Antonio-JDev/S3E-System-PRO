-- Migration: add ultimoNumeroNFe to empresas_fiscais and make nota fiscal numero nullable, add ambiente and composite unique
BEGIN;

-- 1) Add ultimoNumeroNFe to empresas_fiscais if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas_fiscais' AND column_name='ultimoNumeroNFe') THEN
        ALTER TABLE "empresas_fiscais" ADD COLUMN "ultimoNumeroNFe" integer;
    END IF;
END$$;

-- 2) Make numero in notas_fiscais nullable (if currently NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='notas_fiscais' AND column_name='numero' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "notas_fiscais" ALTER COLUMN "numero" DROP NOT NULL;
    END IF;
END$$;

-- 3) Add ambiente column to notas_fiscais (default HOMOLOGACAO) if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notas_fiscais' AND column_name='ambiente') THEN
        ALTER TABLE "notas_fiscais" ADD COLUMN "ambiente" text NOT NULL DEFAULT 'HOMOLOGACAO';
    END IF;
END$$;

-- 4) Create composite unique constraint on (empresaFiscalId, numero) if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.contype = 'u'
          AND t.relname = 'notas_fiscais'
          AND c.conname = 'notas_fiscais_empresaFiscalId_numero_key'
    ) THEN
        ALTER TABLE "notas_fiscais"
          ADD CONSTRAINT notas_fiscais_empresaFiscalId_numero_key UNIQUE ("empresaFiscalId", "numero");
    END IF;
END$$;

COMMIT;

