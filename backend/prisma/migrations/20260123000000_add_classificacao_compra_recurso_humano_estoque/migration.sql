-- CreateEnum
CREATE TYPE "ClassificacaoCompra" AS ENUM ('COMPOSICAO_ESTOQUE', 'FERRAMENTAS', 'RECURSOS_HUMANOS', 'LIMPEZA_INSUMOS', 'ESCRITORIO_INSUMOS', 'DESPESAS_VARIADAS');

-- AlterTable
ALTER TABLE "compras" ADD COLUMN "classificacao" "ClassificacaoCompra" NOT NULL DEFAULT 'COMPOSICAO_ESTOQUE';

-- CreateTable
CREATE TABLE "recurso_humano_estoque" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "compraItemId" TEXT,
    "nomeItem" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "funcionarioId" TEXT,
    "dataVinculacao" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurso_humano_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurso_humano_estoque_compraId_idx" ON "recurso_humano_estoque"("compraId");

-- CreateIndex
CREATE INDEX "recurso_humano_estoque_funcionarioId_idx" ON "recurso_humano_estoque"("funcionarioId");

-- AddForeignKey
ALTER TABLE "recurso_humano_estoque" ADD CONSTRAINT "recurso_humano_estoque_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso_humano_estoque" ADD CONSTRAINT "recurso_humano_estoque_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
