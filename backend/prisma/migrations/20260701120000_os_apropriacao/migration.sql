-- CreateEnum
CREATE TYPE "TipoRecursoApontamento" AS ENUM ('HORA_ENGENHARIA', 'DIARIA_EQUIPE');

-- AlterTable
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "horasEngenhariaOrcadas" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "diariasEquipeOrcadas" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "valorHoraEngenharia" DOUBLE PRECISION;
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "valorDiariaEquipe" DOUBLE PRECISION;
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "iniciadoSemEstoque" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "iniciadoSemEstoqueEm" TIMESTAMP(3);
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "iniciadoSemEstoquePorId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "apontamentos_os" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "dataApontamento" DATE NOT NULL,
    "observacoes" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apontamentos_os_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "apontamentos_os_itens" (
    "id" TEXT NOT NULL,
    "apontamentoId" TEXT NOT NULL,
    "tipoRecurso" "TipoRecursoApontamento" NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "funcionarioId" TEXT,

    CONSTRAINT "apontamentos_os_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "apontamentos_os_projetoId_dataApontamento_idx" ON "apontamentos_os"("projetoId", "dataApontamento");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "apontamentos_os_itens_apontamentoId_idx" ON "apontamentos_os_itens"("apontamentoId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "projetos" ADD CONSTRAINT "projetos_iniciadoSemEstoquePorId_fkey" FOREIGN KEY ("iniciadoSemEstoquePorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "apontamentos_os" ADD CONSTRAINT "apontamentos_os_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "apontamentos_os" ADD CONSTRAINT "apontamentos_os_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "apontamentos_os_itens" ADD CONSTRAINT "apontamentos_os_itens_apontamentoId_fkey" FOREIGN KEY ("apontamentoId") REFERENCES "apontamentos_os"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "apontamentos_os_itens" ADD CONSTRAINT "apontamentos_os_itens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "apontamentos_os_itens" ADD CONSTRAINT "apontamentos_os_itens_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
