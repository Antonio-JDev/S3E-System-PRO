-- AlterTable: Inscrição Municipal para NFS-e (Itajaí/SC - Pública v7.4)
ALTER TABLE "empresas_fiscais" ADD COLUMN IF NOT EXISTS "inscricaoMunicipal" TEXT;

-- CreateTable: NFS-e (Nota Fiscal de Serviço - Pública/Itajaí)
CREATE TABLE "nfse" (
    "id" TEXT NOT NULL,
    "empresaFiscalId" TEXT NOT NULL,
    "numeroLote" INTEGER NOT NULL,
    "protocolo" TEXT,
    "numeroNfse" TEXT,
    "codigoVerificacao" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'Pendente',
    "ambiente" TEXT NOT NULL,
    "xmlEnvio" TEXT,
    "xmlResposta" TEXT,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nfse_empresaFiscalId_idx" ON "nfse"("empresaFiscalId");
CREATE INDEX "nfse_protocolo_idx" ON "nfse"("protocolo");
CREATE INDEX "nfse_numeroNfse_idx" ON "nfse"("numeroNfse");

-- AddForeignKey
ALTER TABLE "nfse" ADD CONSTRAINT "nfse_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "empresas_fiscais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
