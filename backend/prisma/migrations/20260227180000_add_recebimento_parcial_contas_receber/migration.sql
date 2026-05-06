-- AlterTable: contas_receber - valor já recebido (pagamentos parciais) e status Recebido Parcial
ALTER TABLE "contas_receber" ADD COLUMN IF NOT EXISTS "valorRecebido" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable: histórico de recebimentos parciais por duplicata
CREATE TABLE IF NOT EXISTS "recebimentos_parciais" (
    "id" TEXT NOT NULL,
    "contaReceberId" TEXT NOT NULL,
    "valorPago" DOUBLE PRECISION NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "meioPagamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recebimentos_parciais_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "recebimentos_parciais_contaReceberId_idx" ON "recebimentos_parciais"("contaReceberId");

ALTER TABLE "recebimentos_parciais" DROP CONSTRAINT IF EXISTS "recebimentos_parciais_contaReceberId_fkey";
ALTER TABLE "recebimentos_parciais" ADD CONSTRAINT "recebimentos_parciais_contaReceberId_fkey"
    FOREIGN KEY ("contaReceberId") REFERENCES "contas_receber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
