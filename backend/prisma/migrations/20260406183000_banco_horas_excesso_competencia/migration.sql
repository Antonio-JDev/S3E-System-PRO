-- CreateTable
CREATE TABLE "banco_horas_excesso_competencia" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "referenciaAno" INTEGER NOT NULL,
    "referenciaMes" INTEGER NOT NULL,
    "excessoHoras" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banco_horas_excesso_competencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banco_horas_excesso_competencia_funcionarioId_referenciaAno_referenciaMes_key" ON "banco_horas_excesso_competencia"("funcionarioId", "referenciaAno", "referenciaMes");

-- AddForeignKey
ALTER TABLE "banco_horas_excesso_competencia" ADD CONSTRAINT "banco_horas_excesso_competencia_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
