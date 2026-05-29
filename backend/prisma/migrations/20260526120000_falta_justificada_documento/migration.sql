-- Anexo de atestado/declaração em falta justificada (persiste antes da importação XLS)
ALTER TABLE "ocorrencias_ponto_rh"
  ADD COLUMN IF NOT EXISTS "documentoAnexoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "documentoAnexoNome" TEXT;
