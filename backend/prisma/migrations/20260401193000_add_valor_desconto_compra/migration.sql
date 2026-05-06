-- Desconto sobre produtos (separado de outras despesas que somam na nota)
ALTER TABLE "compras" ADD COLUMN "valorDesconto" DOUBLE PRECISION NOT NULL DEFAULT 0;
