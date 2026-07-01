-- CreateEnum
CREATE TYPE "EventoStatus" AS ENUM ('PREVISAO', 'VALIDO');

-- CreateTable
CREATE TABLE "eventos_calendario" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "status" "EventoStatus" NOT NULL DEFAULT 'PREVISAO',
    "tipo" TEXT NOT NULL DEFAULT 'REUNIAO',
    "orcamentoId" TEXT,
    "custoVeiculo" DECIMAL(12,2) DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_calendario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventoCalendarioToFuncionario" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "eventos_calendario_dataInicio_dataFim_idx" ON "eventos_calendario"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "eventos_calendario_status_idx" ON "eventos_calendario"("status");

-- CreateIndex
CREATE INDEX "eventos_calendario_tipo_idx" ON "eventos_calendario"("tipo");

-- CreateIndex
CREATE INDEX "eventos_calendario_orcamentoId_idx" ON "eventos_calendario"("orcamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "_EventoCalendarioToFuncionario_AB_unique" ON "_EventoCalendarioToFuncionario"("A", "B");

-- CreateIndex
CREATE INDEX "_EventoCalendarioToFuncionario_B_index" ON "_EventoCalendarioToFuncionario"("B");

-- AddForeignKey
ALTER TABLE "eventos_calendario" ADD CONSTRAINT "eventos_calendario_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventoCalendarioToFuncionario" ADD CONSTRAINT "_EventoCalendarioToFuncionario_A_fkey" FOREIGN KEY ("A") REFERENCES "eventos_calendario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventoCalendarioToFuncionario" ADD CONSTRAINT "_EventoCalendarioToFuncionario_B_fkey" FOREIGN KEY ("B") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
