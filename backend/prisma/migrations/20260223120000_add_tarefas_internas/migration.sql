-- CreateEnum
CREATE TYPE "StatusTarefaInterna" AS ENUM ('BACKLOG', 'A_FAZER', 'ANDAMENTO', 'CONCLUIDO');

-- CreateTable
CREATE TABLE "tarefas_internas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "motivo" TEXT,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "coluna" "StatusTarefaInterna" NOT NULL DEFAULT 'BACKLOG',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_internas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas_internas_itens" (
    "id" TEXT NOT NULL,
    "tarefaInternaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataPrevisaoFim" TIMESTAMP(3),
    "observacoes" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_internas_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarefas_internas_coluna_idx" ON "tarefas_internas"("coluna");

-- CreateIndex
CREATE INDEX "tarefas_internas_userId_idx" ON "tarefas_internas"("userId");

-- CreateIndex
CREATE INDEX "tarefas_internas_itens_tarefaInternaId_idx" ON "tarefas_internas_itens"("tarefaInternaId");

-- AddForeignKey
ALTER TABLE "tarefas_internas" ADD CONSTRAINT "tarefas_internas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_internas_itens" ADD CONSTRAINT "tarefas_internas_itens_tarefaInternaId_fkey" FOREIGN KEY ("tarefaInternaId") REFERENCES "tarefas_internas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
