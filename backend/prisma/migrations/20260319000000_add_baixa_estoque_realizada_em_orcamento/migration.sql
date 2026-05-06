-- AlterTable
-- OBRA = baixa feita ao Iniciar obra (OS); VENDA = baixa feita ao Gerar PV. Evita dupla baixa.
ALTER TABLE "orcamentos" ADD COLUMN "baixaEstoqueRealizadaEm" TEXT;
