-- Múltiplos anexos no funil (até 8 URLs)
ALTER TABLE "contato_leads" ADD COLUMN IF NOT EXISTS "anexosUrls" JSONB;

UPDATE "contato_leads"
SET "anexosUrls" = jsonb_build_array("contaEnergiaUrl")
WHERE "contaEnergiaUrl" IS NOT NULL
  AND ("anexosUrls" IS NULL OR "anexosUrls" = 'null'::jsonb OR jsonb_typeof("anexosUrls") <> 'array');
