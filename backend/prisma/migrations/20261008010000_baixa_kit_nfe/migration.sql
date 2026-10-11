-- Kit vendido como produto: a baixa dos componentes fica marcada à parte da baixa de material de obra.

ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "baixaKitRealizadaEm" TEXT;
