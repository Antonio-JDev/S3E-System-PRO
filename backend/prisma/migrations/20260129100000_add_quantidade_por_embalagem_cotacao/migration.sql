-- AlterTable
-- Adiciona coluna de fracionamento em cotações: 1 pacote = quantidadePorEmbalagem unidades
ALTER TABLE "cotacoes" ADD COLUMN "quantidadePorEmbalagem" DOUBLE PRECISION;
