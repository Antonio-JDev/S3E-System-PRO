-- Classificação da justificativa parcial (abonar / banco / horas devidas)
ALTER TABLE "ocorrencias_ponto_rh"
  ADD COLUMN IF NOT EXISTS "classificacaoJustificativa" TEXT;
