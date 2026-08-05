-- Migra OS no estágio VALIDADO (removido do fluxo) para APROVADO
UPDATE "projetos" SET status = 'APROVADO' WHERE status = 'VALIDADO';
