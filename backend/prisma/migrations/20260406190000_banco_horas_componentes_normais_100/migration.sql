-- Saldo do banco separado (normais vs HE 100%)
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "saldoBancoHorasNormaisExcedente" DECIMAL(12,2);
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "saldoBancoHorasExtras100" DECIMAL(12,2);

UPDATE "funcionarios"
SET
  "saldoBancoHorasNormaisExcedente" = COALESCE("saldoBancoHoras", 0),
  "saldoBancoHorasExtras100" = 0
WHERE "saldoBancoHorasNormaisExcedente" IS NULL;

-- Excedente por competência (detalhe)
ALTER TABLE "banco_horas_excesso_competencia" ADD COLUMN IF NOT EXISTS "excessoNormais" DECIMAL(12,2);
ALTER TABLE "banco_horas_excesso_competencia" ADD COLUMN IF NOT EXISTS "excessoExtras100" DECIMAL(12,2);

UPDATE "banco_horas_excesso_competencia"
SET
  "excessoNormais" = COALESCE("excessoHoras", 0),
  "excessoExtras100" = 0
WHERE "excessoNormais" IS NULL;

-- Lançamento: baixa proporcional ao pagar salário
ALTER TABLE "lancamentos_folha" ADD COLUMN IF NOT EXISTS "horasComponenteNormais" DECIMAL(12,2);
ALTER TABLE "lancamentos_folha" ADD COLUMN IF NOT EXISTS "horasComponenteExtras100" DECIMAL(12,2);
