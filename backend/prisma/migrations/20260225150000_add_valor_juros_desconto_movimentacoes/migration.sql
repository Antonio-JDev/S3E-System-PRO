-- AlterTable: ContaReceber - juros e desconto para conciliação bancária
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "valorJuros" DOUBLE PRECISION;
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "valorDesconto" DOUBLE PRECISION;

-- AlterTable: ContaPagar - juros e desconto para conciliação bancária
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "valorJuros" DOUBLE PRECISION;
ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "valorDesconto" DOUBLE PRECISION;
