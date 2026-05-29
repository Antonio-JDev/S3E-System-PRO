-- Justificativa parcial de ponto (meio período)
-- - entrada atrasada ou saída antecipada com intervalo HH:mm-HH:mm
-- - persiste antes/depois do XLS (vinculação ao registro é opcional)

-- Enum: adiciona novo tipo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OcorrenciaPontoRhTipo'
      AND e.enumlabel = 'JUSTIFICATIVA_PARCIAL'
  ) THEN
    ALTER TYPE "OcorrenciaPontoRhTipo" ADD VALUE 'JUSTIFICATIVA_PARCIAL';
  END IF;
END$$;

ALTER TABLE "ocorrencias_ponto_rh"
  ADD COLUMN IF NOT EXISTS "justificativaTipo" TEXT,
  ADD COLUMN IF NOT EXISTS "horaInicio" TEXT,
  ADD COLUMN IF NOT EXISTS "horaFim" TEXT;

