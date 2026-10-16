-- CreateTable
CREATE TABLE "regras_fiscais_nfe" (
    "id" TEXT NOT NULL,
    "empresaFiscalId" TEXT,
    "regime" TEXT NOT NULL,
    "cfop" TEXT,
    "ncm" TEXT,
    "origem" TEXT NOT NULL DEFAULT '0',
    "cstIcms" TEXT NOT NULL,
    "aliquotaIcms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cstPis" TEXT NOT NULL,
    "aliquotaPis" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cstCofins" TEXT NOT NULL,
    "aliquotaCofins" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cstIpi" TEXT NOT NULL DEFAULT '99',
    "aliquotaIpi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "informarTotTrib" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regras_fiscais_nfe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regras_fiscais_nfe_regime_ativo_idx" ON "regras_fiscais_nfe"("regime", "ativo");

-- CreateIndex
CREATE INDEX "regras_fiscais_nfe_empresaFiscalId_idx" ON "regras_fiscais_nfe"("empresaFiscalId");

-- AddForeignKey
ALTER TABLE "regras_fiscais_nfe" ADD CONSTRAINT "regras_fiscais_nfe_empresaFiscalId_fkey" FOREIGN KEY ("empresaFiscalId") REFERENCES "empresas_fiscais"("id") ON DELETE CASCADE ON UPDATE CASCADE;
