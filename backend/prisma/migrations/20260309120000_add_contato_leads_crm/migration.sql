-- CreateTable
-- CRM: Funil de Atendimento (leads/contatos antes de virar orçamento)
CREATE TABLE "contato_leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT,
    "cpfCnpj" TEXT,
    "necessidade" TEXT,
    "mediaKwhMes" DOUBLE PRECISION,
    "contaEnergiaUrl" TEXT,
    "observacoesTecnicas" TEXT,
    "viabilidadeTecnica" BOOLEAN,
    "condicoesNaoAtender" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGUARDANDO_DOCUMENTO',
    "etapa" INTEGER NOT NULL DEFAULT 1,
    "clienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contato_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contato_leads_status_idx" ON "contato_leads"("status");

-- CreateIndex
CREATE INDEX "contato_leads_etapa_idx" ON "contato_leads"("etapa");

-- CreateIndex
CREATE INDEX "contato_leads_createdAt_idx" ON "contato_leads"("createdAt");

-- AddForeignKey
ALTER TABLE "contato_leads" ADD CONSTRAINT "contato_leads_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
