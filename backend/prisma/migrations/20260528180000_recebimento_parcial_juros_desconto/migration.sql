-- Juros e desconto por recebimento (movimentações de caixa / conciliação)
ALTER TABLE "recebimentos_parciais" ADD COLUMN IF NOT EXISTS "valorJuros" DOUBLE PRECISION;
ALTER TABLE "recebimentos_parciais" ADD COLUMN IF NOT EXISTS "valorDesconto" DOUBLE PRECISION;
