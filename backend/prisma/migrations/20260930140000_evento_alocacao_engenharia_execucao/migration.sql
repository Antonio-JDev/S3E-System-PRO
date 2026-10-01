-- Alocação engenharia/execução, custo/hora manual e confirmação que preserva a previsão.
ALTER TABLE "eventos_calendario"
ADD COLUMN "equipeEngenhariaIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "equipeExecucaoIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "valorHoraEngenharia" DECIMAL(12,2),
ADD COLUMN "valorHoraExecucao" DECIMAL(12,2),
ADD COLUMN "eventoOrigemId" TEXT;

CREATE UNIQUE INDEX "eventos_calendario_eventoOrigemId_key" ON "eventos_calendario"("eventoOrigemId");

ALTER TABLE "eventos_calendario"
ADD CONSTRAINT "eventos_calendario_eventoOrigemId_fkey"
FOREIGN KEY ("eventoOrigemId") REFERENCES "eventos_calendario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
