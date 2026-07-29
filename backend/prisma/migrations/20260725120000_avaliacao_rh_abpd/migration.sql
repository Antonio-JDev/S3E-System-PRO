-- Avaliação rápida A/B/P/D na conferência de ponto (camada override RH).
ALTER TABLE "comentarios_conferencia_ponto_rh" ADD COLUMN IF NOT EXISTS "tratamentoDebito" TEXT;
ALTER TABLE "comentarios_conferencia_ponto_rh" ADD COLUMN IF NOT EXISTS "tratamentoCredito" TEXT;
