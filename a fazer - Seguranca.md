# A Fazer - Segurança (RLS Postgres)

## Objetivo
- Implementar Row-Level Security (RLS) no Postgres para complementar o RBAC da aplicação.
- Garantir proteção em nível de banco mesmo em caso de acesso direto ao DB.

## Fase 1 - Preparação
- [ ] Mapear tabelas sensíveis (prioridade alta):
  - [ ] `users`
  - [ ] `audit_logs`
  - [ ] `notificacoes`
  - [ ] tabelas com `userId`/`owner`/responsável
- [ ] Classificar cada tabela por tipo de acesso:
  - [ ] próprio usuário
  - [ ] admin
  - [ ] desenvolvedor
  - [ ] leitura global
- [ ] Definir estratégia de contexto SQL por request:
  - [ ] `SET LOCAL app.user_id`
  - [ ] `SET LOCAL app.user_role`
  - [ ] (se necessário) `SET LOCAL app.is_admin`

## Fase 2 - Migrações RLS (DB)
- [ ] Criar migration para habilitar RLS nas tabelas priorizadas:
  - [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  - [ ] `ALTER TABLE ... FORCE ROW LEVEL SECURITY` (avaliar tabela a tabela)
- [ ] Criar policies mínimas por operação:
  - [ ] `SELECT`
  - [ ] `INSERT`
  - [ ] `UPDATE`
  - [ ] `DELETE`
- [ ] Adotar princípio de negação por padrão:
  - [ ] sem policy explícita, sem acesso

## Fase 3 - Políticas por papel
- [ ] Usuário comum:
  - [ ] só lê/edita as próprias linhas (`user_id = current_setting('app.user_id')`)
- [ ] Admin:
  - [ ] políticas explícitas de acesso amplo onde fizer sentido
- [ ] Desenvolvedor:
  - [ ] políticas explícitas de acesso técnico/auditoria
- [ ] Contas de serviço:
  - [ ] revisar se precisam bypass controlado

## Fase 4 - Backend/Prisma
- [ ] Garantir transação por request quando necessário para `SET LOCAL`.
- [ ] Validar se todas as queries críticas passam no contexto com RLS ativa.
- [ ] Revisar endpoints com acesso privilegiado para não quebrar fluxo.

## Fase 5 - Testes de Segurança
- [ ] Criar testes automatizados por perfil:
  - [ ] usuário A não acessa dados do usuário B
  - [ ] admin acessa apenas o que foi permitido por policy
  - [ ] dev segue regras definidas
- [ ] Testar cenários negativos (acesso indevido deve falhar).
- [ ] Validar performance após policies (queries principais).

## Fase 6 - Operação e Governança
- [ ] Documentar políticas por tabela (quem lê, altera, exclui).
- [ ] Definir processo para novas tabelas:
  - [ ] sem policy = não sobe para produção
- [ ] Incluir checklist de RLS no code review/PR.
- [ ] Monitorar tentativas negadas em logs de segurança.

## Ordem sugerida de execução
1. `notificacoes` (mais simples, base em `userId`)
2. `audit_logs` (controle de visibilidade)
3. `users` (regras mais sensíveis)
4. Demais tabelas com vínculo por usuário/responsável

## Observações
- RLS não substitui RBAC da API; as duas camadas devem coexistir.
- Implementar em etapas pequenas para reduzir risco de indisponibilidade.

## Pendência técnica (registrada para depois)
- [ ] Zerar erros de tipagem do frontend (`npx tsc --noEmit`), hoje ainda com falhas em `pages/*`, `services/*`, `utils/*` e alguns testes.
