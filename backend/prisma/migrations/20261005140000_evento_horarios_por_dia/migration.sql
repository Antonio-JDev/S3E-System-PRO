-- Horário efetivo de cada dia da alocação (exceção ao ciclo 07:30–17:30).
ALTER TABLE "eventos_calendario" ADD COLUMN IF NOT EXISTS "horariosPorDia" JSONB;
