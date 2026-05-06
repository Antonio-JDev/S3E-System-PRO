-- CreateTable
CREATE TABLE "projeto_qualidade" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "statusVisita" TEXT NOT NULL DEFAULT 'pendente',
    "dataVisita" TIMESTAMP(3),
    "responsavel" TEXT,
    "checklist" JSONB,
    "observacoes" TEXT,
    "inspecoes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projeto_qualidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projeto_qualidade_projetoId_key" ON "projeto_qualidade"("projetoId");

-- CreateIndex
CREATE INDEX "projeto_qualidade_projetoId_idx" ON "projeto_qualidade"("projetoId");

-- AddForeignKey
ALTER TABLE "projeto_qualidade" ADD CONSTRAINT "projeto_qualidade_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
