-- CreateTable: Ferramentas
CREATE TABLE "ferramentas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "descricao" TEXT,
    "valorCompra" DOUBLE PRECISION,
    "imagemUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ferramentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Kits de Ferramentas
CREATE TABLE "kits_ferramenta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "eletricistaId" TEXT NOT NULL,
    "eletricistaNome" TEXT NOT NULL,
    "dataEntrega" TIMESTAMP(3) NOT NULL,
    "imagemUrl" TEXT,
    "assinatura" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kits_ferramenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Itens dos Kits
CREATE TABLE "kit_ferramenta_itens" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "ferramentaId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "estadoEntrega" TEXT NOT NULL DEFAULT 'Novo',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kit_ferramenta_itens_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Adicionar usuarioId ao RegistroAtividade
ALTER TABLE "registros_atividade" ADD COLUMN "usuarioId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ferramentas_codigo_key" ON "ferramentas"("codigo");
CREATE INDEX "kits_ferramenta_eletricistaId_idx" ON "kits_ferramenta"("eletricistaId");
CREATE INDEX "kit_ferramenta_itens_kitId_idx" ON "kit_ferramenta_itens"("kitId");
CREATE INDEX "kit_ferramenta_itens_ferramentaId_idx" ON "kit_ferramenta_itens"("ferramentaId");
CREATE INDEX "registros_atividade_usuarioId_idx" ON "registros_atividade"("usuarioId");

-- AddForeignKey
ALTER TABLE "kit_ferramenta_itens" ADD CONSTRAINT "kit_ferramenta_itens_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits_ferramenta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kit_ferramenta_itens" ADD CONSTRAINT "kit_ferramenta_itens_ferramentaId_fkey" FOREIGN KEY ("ferramentaId") REFERENCES "ferramentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registros_atividade" ADD CONSTRAINT "registros_atividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
