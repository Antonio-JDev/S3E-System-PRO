# ✅ Checklist de Deployment - Gestão Operacional de Equipes

## 📋 Pré-requisitos

### Ambiente de Desenvolvimento

- [ ] Node.js instalado (v18+)
- [ ] PostgreSQL instalado e rodando
- [ ] Git configurado
- [ ] Variáveis de ambiente configuradas (.env)

### Banco de Dados

- [ ] `DATABASE_URL` configurada no `.env`
- [ ] Conexão com banco testada
- [ ] Prisma CLI instalado globalmente ou localmente

---

## 🗄️ 1. Preparação do Banco de Dados

### 1.1. Aplicar Migrações

```bash
cd backend

# Gerar migration
npx prisma migrate dev --name add_equipes_alocacoes

# Verificar migrations aplicadas
npx prisma migrate status

# Gerar Prisma Client
npx prisma generate
```

**Resultado esperado:**

```
✔ Generated Prisma Client
✔ Migration applied successfully
```

### 1.2. Verificar Modelos

```bash
# Abrir Prisma Studio para verificar
npx prisma studio
```

**Verificar:**

- [ ] Tabela `equipes` criada
- [ ] Tabela `alocacoes_obra` criada
- [ ] Relações com `users` e `projetos` funcionando
- [ ] Enum `TipoEquipe` criado

---

## 🌱 2. Popular Dados Iniciais

### 2.1. Executar Seed de Equipes

```bash
npx ts-node prisma/seed-equipes.ts
```

**Verificar:**

- [ ] 3 equipes criadas (A, B, C)
- [ ] Membros atribuídos corretamente
- [ ] Status `ativa: true`

### 2.2. Validar no Prisma Studio

```bash
npx prisma studio
```

**Conferir:**

- [ ] Equipe A (MONTAGEM) - 2 membros
- [ ] Equipe B (CAMPO) - 2 membros
- [ ] Equipe C (DISTINTA) - 2 membros

---

## 🚀 3. Iniciar Servidor

### 3.1. Desenvolvimento

```bash
cd backend
npm run dev
```

**Verificar logs:**

```
✔ Server running on http://localhost:3000
✔ Environment: development
```

### 3.2. Build para Produção

```bash
npm run build
npm start
```

---

## 🧪 4. Testes de Integração

### 4.1. Health Check

```bash
curl http://localhost:3000/health
```

**Resposta esperada:**

```json
{
  "status": "OK",
  "timestamp": "2025-10-22T..."
}
```

### 4.2. API Info

```bash
curl http://localhost:3000/api
```

**Verificar:**

- [ ] `obras: '/api/obras'` listado nos endpoints

### 4.3. Autenticação

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@s3e.com","password":"senha123"}'
```

**Salvar o token retornado!**

### 4.4. Listar Equipes

```bash
curl -X GET http://localhost:3000/api/obras/equipes \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Verificar:**

- [ ] 3 equipes retornadas
- [ ] Estrutura JSON correta

### 4.5. Criar Alocação de Teste

```bash
# Substitua EQUIPE_ID e PROJETO_ID por IDs reais
curl -X POST http://localhost:3000/api/obras/alocar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipeId": "EQUIPE_ID",
    "projetoId": "PROJETO_ID",
    "dataInicio": "2025-03-01T00:00:00Z",
    "duracaoDias": 20
  }'
```

**Verificar:**

- [ ] Status 201 Created
- [ ] `dataFimPrevisto` calculada corretamente
- [ ] Status inicial: "Planejada"

### 4.6. Testar Calendário

```bash
curl -X GET "http://localhost:3000/api/obras/alocacoes/calendario?mes=3&ano=2025" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Verificar:**

- [ ] Alocação criada aparece
- [ ] Formato otimizado para calendário

### 4.7. Testar Conflito

```bash
# Tentar alocar mesma equipe no mesmo período (deve falhar)
curl -X POST http://localhost:3000/api/obras/alocar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipeId": "MESMA_EQUIPE_ID",
    "projetoId": "OUTRO_PROJETO_ID",
    "dataInicio": "2025-03-10T00:00:00Z",
    "duracaoDias": 10
  }'
```

**Verificar:**

- [ ] Status 409 Conflict
- [ ] Mensagem de erro clara

---

## 🔒 5. Segurança

### 5.1. Testar Autenticação

```bash
# Sem token (deve falhar)
curl -X GET http://localhost:3000/api/obras/equipes
```

**Verificar:**

- [ ] Status 401 Unauthorized

### 5.2. Testar Autorização

```bash
# Com usuário não-admin (deve falhar em rotas admin)
curl -X POST http://localhost:3000/api/obras/equipes \
  -H "Authorization: Bearer TOKEN_USER_COMUM" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Equipe D","tipo":"MONTAGEM","membros":[]}'
```

**Verificar:**

- [ ] Status 403 Forbidden

---

## 📊 6. Validações de Negócio

### 6.1. Cálculo de Dias Úteis

**Teste manual:**

- Data início: 01/03/2025 (sábado)
- Duração: 5 dias úteis
- Data fim esperada: 07/03/2025 (sexta)

**Verificar:**

- [ ] Finais de semana excluídos
- [ ] Contagem correta

### 6.2. Verificação de Disponibilidade

```bash
curl -X GET "http://localhost:3000/api/obras/equipes/disponiveis?dataInicio=2025-03-01&dataFim=2025-03-31" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Verificar:**

- [ ] Equipes ocupadas não aparecem
- [ ] Equipes disponíveis aparecem

### 6.3. Estatísticas

```bash
curl -X GET http://localhost:3000/api/obras/estatisticas \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Verificar:**

- [ ] `totalEquipes` correto
- [ ] `equipesOcupadas` correto
- [ ] `equipesDisponiveis` correto
- [ ] `alocacoesAtivas` correto

---

## 📝 7. Documentação

### 7.1. Arquivos Criados

- [ ] `GESTAO_OPERACIONAL_EQUIPES.md` (documentação completa)
- [ ] `GUIA_RAPIDO_GESTAO_EQUIPES.md` (guia prático)
- [ ] `RESUMO_IMPLEMENTACAO_GESTAO_EQUIPES.md` (resumo executivo)
- [ ] `EXEMPLOS_API_GESTAO_EQUIPES.md` (exemplos de uso)
- [ ] `CHECKLIST_DEPLOYMENT_GESTAO_EQUIPES.md` (este arquivo)

### 7.2. Código

- [ ] `backend/prisma/schema.prisma` (modelos)
- [ ] `backend/src/services/alocacao.service.ts` (lógica)
- [ ] `backend/src/controllers/alocacaoController.ts` (endpoints)
- [ ] `backend/src/routes/alocacao.routes.ts` (rotas)
- [ ] `backend/src/app.ts` (registro de rotas)
- [ ] `backend/prisma/seed-equipes.ts` (seed)

### 7.3. Verificação de Código

```bash
# Verificar erros de TypeScript
cd backend
npx tsc --noEmit

# Verificar linting (se configurado)
npm run lint
```

**Verificar:**

- [ ] Sem erros de TypeScript
- [ ] Sem erros de linting
- [ ] Imports corretos

---

## 🌐 8. Frontend (Futura Integração)

### 8.1. Rotas para Integrar

- [ ] Página de gerenciamento de equipes
- [ ] Página de calendário de alocações
- [ ] Dashboard com estatísticas
- [ ] Formulário de criação de equipe
- [ ] Formulário de alocação

### 8.2. Componentes Sugeridos

- [ ] `EquipesList` - Listar equipes
- [ ] `EquipeForm` - Criar/editar equipe
- [ ] `AlocacaoCalendar` - Calendário visual
- [ ] `AlocacaoForm` - Alocar equipe
- [ ] `DashboardEquipes` - Estatísticas

---

## 🐳 9. Docker (se aplicável)

### 9.1. Build de Imagem

```bash
cd backend
docker build -t s3e-backend .
```

### 9.2. Docker Compose

```bash
docker-compose up -d
```

**Verificar:**

- [ ] Container backend rodando
- [ ] Container PostgreSQL rodando
- [ ] Migrations aplicadas automaticamente

---

## 🚀 10. Deploy em Produção

### 10.1. Checklist Pré-Deploy

- [ ] Todas as migrations testadas
- [ ] Seed executado (se necessário)
- [ ] Variáveis de ambiente configuradas
- [ ] `DATABASE_URL` de produção configurada
- [ ] `JWT_SECRET` configurado
- [ ] CORS configurado corretamente

### 10.2. Aplicar Migrations em Produção

```bash
# Via CLI
npx prisma migrate deploy

# Ou via Docker
docker exec -it backend npx prisma migrate deploy
```

### 10.3. Verificar Deploy

```bash
# Health check
curl https://seu-dominio.com/health

# API info
curl https://seu-dominio.com/api

# Testar endpoint
curl https://seu-dominio.com/api/obras/equipes \
  -H "Authorization: Bearer TOKEN"
```

---

## 📈 11. Monitoramento

### 11.1. Logs

```bash
# Ver logs do servidor
tail -f logs/app.log

# Ou via Docker
docker logs -f backend
```

**Monitorar:**

- [ ] Erros de conexão com banco
- [ ] Erros de autenticação
- [ ] Erros de validação
- [ ] Performance das queries

### 11.2. Métricas

- [ ] Tempo de resposta das APIs
- [ ] Número de alocações criadas
- [ ] Taxa de conflitos
- [ ] Uso de equipes

---

## ✅ 12. Checklist Final

### Backend

- [x] Modelos Prisma criados
- [x] Migrations geradas
- [ ] Migrations aplicadas no banco
- [x] Prisma Client gerado
- [x] Serviço implementado
- [x] Controller implementado
- [x] Rotas configuradas
- [x] Rotas registradas no app
- [x] Seed script criado
- [ ] Seed executado
- [ ] Testes de API realizados
- [ ] Segurança validada

### Documentação

- [x] Documentação técnica completa
- [x] Guia rápido criado
- [x] Exemplos de API documentados
- [x] Resumo executivo criado
- [x] Checklist de deployment criado

### Deployment

- [ ] Servidor rodando
- [ ] Banco configurado
- [ ] Dados iniciais populados
- [ ] Endpoints testados
- [ ] Segurança validada
- [ ] Logs funcionando

---

## 🎉 Conclusão

Quando todos os itens acima estiverem marcados ✅, o módulo de **Gestão
Operacional de Equipes** estará **totalmente implementado e pronto para uso em
produção**!

---

## 📞 Suporte Pós-Deploy

### Em caso de problemas:

1. **Verificar logs do servidor**

   ```bash
   docker logs backend
   # ou
   tail -f logs/app.log
   ```

2. **Verificar conexão com banco**

   ```bash
   npx prisma studio
   ```

3. **Verificar migrations**

   ```bash
   npx prisma migrate status
   ```

4. **Recriar Prisma Client**

   ```bash
   npx prisma generate
   ```

5. **Reiniciar servidor**

   ```bash
   npm run dev
   # ou
   docker-compose restart backend
   ```

---

## 🔄 Rollback (se necessário)

```bash
# Reverter última migration
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Aplicar migration anterior
npx prisma migrate deploy
```

---

**Data:** 22 de outubro de 2025  
**Versão:** 1.0.0  
**Status:** Pronto para deployment

---

**Próximos Passos Recomendados:**

1. ✅ Aplicar migrations
2. ✅ Executar seed
3. ✅ Testar endpoints
4. ✅ Integrar com frontend (futura sprint)
5. ✅ Treinar usuários
6. ✅ Monitorar uso em produção
