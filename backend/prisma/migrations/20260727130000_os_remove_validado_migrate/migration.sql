-- Migra OS no estágio VALIDADO (removido do fluxo) para APROVADO
UPDATE "Projeto" SET status = 'APROVADO' WHERE status = 'VALIDADO';
