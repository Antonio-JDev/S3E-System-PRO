-- CreateTable
CREATE TABLE "nfe_fila" (
    "id" TEXT NOT NULL,
    "notaFiscalId" TEXT,
    "empresaFiscalId" TEXT,
    "ambiente" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "xmlAssinado" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "proximaTentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nfe_fila_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nfe_fila_status_proximaTentativa_idx" ON "nfe_fila"("status", "proximaTentativa");

-- AddForeignKey
ALTER TABLE "nfe_fila"
ADD CONSTRAINT "nfe_fila_notaFiscalId_fkey"
FOREIGN KEY ("notaFiscalId") REFERENCES "notas_fiscais"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfe_fila"
ADD CONSTRAINT "nfe_fila_empresaFiscalId_fkey"
FOREIGN KEY ("empresaFiscalId") REFERENCES "empresas_fiscais"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
