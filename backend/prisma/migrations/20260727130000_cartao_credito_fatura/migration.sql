-- CreateTable
CREATE TABLE "cartoes_credito" (
    "id" TEXT NOT NULL,
    "nomeOuBanco" TEXT NOT NULL,
    "bandeira" TEXT NOT NULL,
    "ultimosQuatroDigitos" TEXT NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "diaFechamento" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cartoes_credito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas_cartao" (
    "id" TEXT NOT NULL,
    "cartaoCreditoId" TEXT NOT NULL,
    "mesCompetencia" INTEGER NOT NULL,
    "anoCompetencia" INTEGER NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_cartao_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN "cartaoCreditoId" TEXT;
ALTER TABLE "contas_pagar" ADD COLUMN "faturaCartaoId" TEXT;

-- CreateIndex
CREATE INDEX "contas_pagar_cartaoCreditoId_idx" ON "contas_pagar"("cartaoCreditoId");

-- CreateIndex
CREATE INDEX "contas_pagar_faturaCartaoId_idx" ON "contas_pagar"("faturaCartaoId");

-- CreateIndex
CREATE INDEX "faturas_cartao_cartaoCreditoId_idx" ON "faturas_cartao"("cartaoCreditoId");

-- CreateIndex
CREATE INDEX "faturas_cartao_status_idx" ON "faturas_cartao"("status");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_cartao_cartaoCreditoId_mesCompetencia_anoCompetencia_key" ON "faturas_cartao"("cartaoCreditoId", "mesCompetencia", "anoCompetencia");

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_cartaoCreditoId_fkey" FOREIGN KEY ("cartaoCreditoId") REFERENCES "cartoes_credito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_faturaCartaoId_fkey" FOREIGN KEY ("faturaCartaoId") REFERENCES "faturas_cartao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas_cartao" ADD CONSTRAINT "faturas_cartao_cartaoCreditoId_fkey" FOREIGN KEY ("cartaoCreditoId") REFERENCES "cartoes_credito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
