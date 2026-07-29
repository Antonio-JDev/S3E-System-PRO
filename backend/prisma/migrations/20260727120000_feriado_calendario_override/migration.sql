-- Override manual de feriado (admin/RH) — calendário civil da empresa.
CREATE TABLE IF NOT EXISTS "feriado_calendario_overrides" (
  "id" TEXT NOT NULL,
  "dataReferencia" TIMESTAMP(3) NOT NULL,
  "ehFeriado" BOOLEAN NOT NULL,
  "nome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "feriado_calendario_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feriado_calendario_overrides_dataReferencia_key"
  ON "feriado_calendario_overrides"("dataReferencia");
