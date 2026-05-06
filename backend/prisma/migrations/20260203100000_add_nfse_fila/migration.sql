-- CreateTable
CREATE TABLE "nfse_fila" (
    "id" TEXT NOT NULL,
    "empresaFiscalId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL,
    "numeroLote" INTEGER NOT NULL,
    "xmlEnvio" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "proximaTentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfse_fila_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nfse_fila_status_idx" ON "nfse_fila"("status");

-- CreateIndex
CREATE INDEX "nfse_fila_proximaTentativa_idx" ON "nfse_fila"("proximaTentativa");

-- AddForeignKey
ALTER TABLE "nfse_fila" ADD CONSTRAINT "nfse_fila_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "empresas_fiscais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
