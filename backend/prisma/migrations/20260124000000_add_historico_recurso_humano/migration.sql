-- CreateTable
CREATE TABLE "historico_recurso_humano" (
    "id" TEXT NOT NULL,
    "recursoHumanoId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "tipoMovimentacao" TEXT NOT NULL,
    "descricao" TEXT,
    "dataMovimentacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_recurso_humano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_recurso_humano_recursoHumanoId_idx" ON "historico_recurso_humano"("recursoHumanoId");

-- CreateIndex
CREATE INDEX "historico_recurso_humano_funcionarioId_idx" ON "historico_recurso_humano"("funcionarioId");

-- CreateIndex
CREATE INDEX "historico_recurso_humano_dataMovimentacao_idx" ON "historico_recurso_humano"("dataMovimentacao");

-- AddForeignKey
ALTER TABLE "historico_recurso_humano" ADD CONSTRAINT "historico_recurso_humano_recursoHumanoId_fkey" FOREIGN KEY ("recursoHumanoId") REFERENCES "recurso_humano_estoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_recurso_humano" ADD CONSTRAINT "historico_recurso_humano_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
