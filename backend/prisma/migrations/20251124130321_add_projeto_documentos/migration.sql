-- CreateTable
CREATE TABLE "projeto_documentos" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "observacoes" TEXT,
    "tamanho" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projeto_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projeto_documentos_projetoId_idx" ON "projeto_documentos"("projetoId");

-- CreateIndex
CREATE INDEX "projeto_documentos_tipo_idx" ON "projeto_documentos"("tipo");

-- AddForeignKey
ALTER TABLE "projeto_documentos" ADD CONSTRAINT "projeto_documentos_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
