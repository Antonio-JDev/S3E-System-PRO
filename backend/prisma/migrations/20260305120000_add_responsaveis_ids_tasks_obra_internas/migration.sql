-- AlterTable: tasks (ordem de serviço) - múltiplos responsáveis
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "responsaveisIds" JSONB;

-- AlterTable: tarefas_obra - múltiplos atribuídos
ALTER TABLE "tarefas_obra" ADD COLUMN IF NOT EXISTS "atribuidosIds" JSONB;

-- AlterTable: tarefas_internas - múltiplos responsáveis
ALTER TABLE "tarefas_internas" ADD COLUMN IF NOT EXISTS "userIds" JSONB;
