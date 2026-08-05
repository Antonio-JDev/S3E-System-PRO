-- Rastreia minutos já aplicadosados no banco via avaliação A/B/P/D (evita duplicar no recalc).
ALTER TABLE "comentarios_conferencia_ponto_rh"
  ADD COLUMN IF NOT EXISTS "minutosBancoCreditoAplicados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "comentarios_conferencia_ponto_rh"
  ADD COLUMN IF NOT EXISTS "minutosBancoDebitoAplicados" INTEGER NOT NULL DEFAULT 0;
