-- CreateEnum: Tipo de contrato do funcionário (CLT ou Autônomo)
DO $$ BEGIN
  CREATE TYPE "TipoContratoFuncionario" AS ENUM ('REGISTRADO', 'AUTONOMO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Funcionário - campos para folha (salário base, tipo contrato, valor hora)
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "salarioBase" DECIMAL(10,2);
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "valorHora" DECIMAL(10,2);
ALTER TABLE "funcionarios" ADD COLUMN IF NOT EXISTS "tipoContrato" "TipoContratoFuncionario" NOT NULL DEFAULT 'REGISTRADO';

-- CreateTable: Benefícios (Alimentação, Bonificação, Assiduidade, Transporte, etc.)
CREATE TABLE IF NOT EXISTS "beneficios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorPadrao" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficios_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Configuração de ponto por funcionário
CREATE TABLE IF NOT EXISTS "configuracoes_ponto" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "trabalhaFimDeSemana" BOOLEAN NOT NULL DEFAULT false,
    "valorHoraFimDeSemana" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_ponto_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Registro de ponto diário
CREATE TABLE IF NOT EXISTS "registros_ponto" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "dataReferencia" TIMESTAMP(3) NOT NULL,
    "entrada" TIMESTAMP(3) NOT NULL,
    "saida" TIMESTAMP(3) NOT NULL,
    "horasNormais" DOUBLE PRECISION NOT NULL,
    "horasExtras50" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtras100" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ehFimDeSemana" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_ponto_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Join table Beneficio <-> Funcionario (N:N)
CREATE TABLE IF NOT EXISTS "_BeneficioToFuncionario" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_BeneficioToFuncionario_AB_unique" ON "_BeneficioToFuncionario"("A", "B");
CREATE INDEX IF NOT EXISTS "_BeneficioToFuncionario_B_index" ON "_BeneficioToFuncionario"("B");

-- Unique constraint ConfiguracaoPonto.funcionarioId
CREATE UNIQUE INDEX IF NOT EXISTS "configuracoes_ponto_funcionarioId_key" ON "configuracoes_ponto"("funcionarioId");

-- Index registros_ponto por funcionário e data
CREATE INDEX IF NOT EXISTS "registros_ponto_funcionarioId_dataReferencia_idx" ON "registros_ponto"("funcionarioId", "dataReferencia");

-- AddForeignKey: configuracoes_ponto -> funcionarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_ponto_funcionarioId_fkey'
  ) THEN
    ALTER TABLE "configuracoes_ponto" ADD CONSTRAINT "configuracoes_ponto_funcionarioId_fkey"
      FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: registros_ponto -> funcionarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'registros_ponto_funcionarioId_fkey'
  ) THEN
    ALTER TABLE "registros_ponto" ADD CONSTRAINT "registros_ponto_funcionarioId_fkey"
      FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: _BeneficioToFuncionario -> beneficios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_BeneficioToFuncionario_A_fkey'
  ) THEN
    ALTER TABLE "_BeneficioToFuncionario" ADD CONSTRAINT "_BeneficioToFuncionario_A_fkey"
      FOREIGN KEY ("A") REFERENCES "beneficios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: _BeneficioToFuncionario -> funcionarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_BeneficioToFuncionario_B_fkey'
  ) THEN
    ALTER TABLE "_BeneficioToFuncionario" ADD CONSTRAINT "_BeneficioToFuncionario_B_fkey"
      FOREIGN KEY ("B") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
