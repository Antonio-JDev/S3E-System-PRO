# 🚀 Guia Rápido - Gestão de Equipes e Alocações

## ⚡ Início Rápido

### 1. Aplicar Migrações

```bash
cd backend
npx prisma migrate dev --name add_equipes_alocacoes
npx prisma generate
```

### 2. Criar Equipes Iniciais (Seed)

```bash
npx ts-node prisma/seed-equipes.ts
```

Este script cria automaticamente 3 equipes:

- **Equipe A** (MONTAGEM) - 2 membros
- **Equipe B** (CAMPO) - 2 membros
- **Equipe C** (DISTINTA) - 2 membros

### 3. Iniciar Servidor

```bash
npm run dev
```

---

## 📝 Exemplos Práticos

### Cenário 1: Criar Equipe Manualmente

```bash
curl -X POST http://localhost:3000/api/obras/equipes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "nome": "Equipe D",
    "tipo": "MONTAGEM",
    "membros": ["user-id-1", "user-id-2"]
  }'
```

---

### Cenário 2: Verificar Disponibilidade

**Situação:** Tenho um projeto que começa em 01/03/2025 e dura 15 dias úteis.  
**Pergunta:** Quais equipes estão disponíveis?

```bash
# Calcular data fim: 01/03 + 15 dias úteis ≈ 21/03
curl -X GET "http://localhost:3000/api/obras/equipes/disponiveis?dataInicio=2025-03-01&dataFim=2025-03-21" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "id": "equipe-b-id",
      "nome": "Equipe B",
      "tipo": "CAMPO"
    },
    {
      "id": "equipe-c-id",
      "nome": "Equipe C",
      "tipo": "DISTINTA"
    }
  ]
}
```

---

### Cenário 3: Alocar Equipe

```bash
curl -X POST http://localhost:3000/api/obras/alocar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "equipeId": "equipe-b-id",
    "projetoId": "projeto-subestacao-abc",
    "dataInicio": "2025-03-01T00:00:00Z",
    "duracaoDias": 15,
    "observacoes": "Instalação de subestação 500kVA"
  }'
```

**Resposta:**

```json
{
  "success": true,
  "message": "Equipe alocada com sucesso",
  "data": {
    "id": "alocacao-id",
    "dataInicio": "2025-03-01T00:00:00Z",
    "dataFimPrevisto": "2025-03-21T00:00:00Z",
    "status": "Planejada",
    "equipe": {
      "nome": "Equipe B",
      "tipo": "CAMPO"
    },
    "projeto": {
      "titulo": "Instalação Subestação ABC",
      "cliente": {
        "nome": "Indústria XYZ Ltda"
      }
    }
  }
}
```

---

### Cenário 4: Iniciar Trabalho

Quando a equipe chegar no local e começar o trabalho:

```bash
curl -X PUT http://localhost:3000/api/obras/alocacoes/alocacao-id/iniciar \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Status muda de:** `Planejada` → `EmAndamento`

---

### Cenário 5: Visualizar Calendário

Ver todas as alocações de março/2025:

```bash
curl -X GET "http://localhost:3000/api/obras/alocacoes/calendario?mes=3&ano=2025" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "id": "alocacao-1",
      "equipe": {
        "nome": "Equipe A",
        "tipo": "MONTAGEM"
      },
      "projeto": {
        "titulo": "Quadro Medição Shopping Center",
        "cliente": "Shopping ABC"
      },
      "dataInicio": "2025-03-01",
      "dataFimPrevisto": "2025-03-15",
      "status": "EmAndamento"
    },
    {
      "id": "alocacao-2",
      "equipe": {
        "nome": "Equipe B",
        "tipo": "CAMPO"
      },
      "projeto": {
        "titulo": "Instalação Subestação ABC",
        "cliente": "Indústria XYZ"
      },
      "dataInicio": "2025-03-01",
      "dataFimPrevisto": "2025-03-21",
      "status": "EmAndamento"
    }
  ]
}
```

---

### Cenário 6: Concluir Trabalho

Obra finalizada antes do prazo:

```bash
curl -X PUT http://localhost:3000/api/obras/alocacoes/alocacao-id/concluir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "dataFimReal": "2025-03-18T00:00:00Z"
  }'
```

**Resultado:**

- Status: `EmAndamento` → `Concluida`
- `dataFimReal`: 18/03/2025 (3 dias antes do previsto)

---

### Cenário 7: Cancelar Alocação

Cliente adiou o projeto:

```bash
curl -X PUT http://localhost:3000/api/obras/alocacoes/alocacao-id/cancelar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "motivo": "Cliente adiou obra por 60 dias"
  }'
```

---

### Cenário 8: Dashboard de Estatísticas

```bash
curl -X GET http://localhost:3000/api/obras/estatisticas \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "totalEquipes": 3,
    "equipesOcupadas": 2,
    "equipesDisponiveis": 1,
    "alocacoesAtivas": 2,
    "alocacoesConcluidas": 15
  }
}
```

---

## 🎯 Casos de Uso Comuns

### Planejamento Mensal

**Objetivo:** Planejar alocações para o próximo mês

1. **Ver alocações atuais:**

   ```bash
   GET /api/obras/alocacoes?status=EmAndamento
   ```

2. **Verificar disponibilidade:**

   ```bash
   GET /api/obras/equipes/disponiveis?dataInicio=2025-04-01&dataFim=2025-04-30
   ```

3. **Alocar equipes aos novos projetos:**

   ```bash
   POST /api/obras/alocar
   ```

---

### Acompanhamento Semanal

**Objetivo:** Verificar progresso das equipes

1. **Ver calendário da semana:**

   ```bash
   GET /api/obras/alocacoes/calendario?mes=3&ano=2025
   ```

2. **Atualizar status conforme necessário:**

   ```bash
   PUT /api/obras/alocacoes/{id}/iniciar
   PUT /api/obras/alocacoes/{id}/concluir
   ```

---

### Remanejamento de Emergência

**Situação:** Equipe A precisa ser movida para outro projeto urgente

1. **Cancelar alocação atual:**

   ```bash
   PUT /api/obras/alocacoes/{id}/cancelar
   ```

2. **Verificar nova disponibilidade:**

   ```bash
   GET /api/obras/equipes/disponiveis?dataInicio=...&dataFim=...
   ```

3. **Criar nova alocação:**

   ```bash
   POST /api/obras/alocar
   ```

---

## 🧮 Calculadora de Dias Úteis

Use esta tabela para converter duração em dias úteis:

| Duração   | Dias Úteis | Aproximado          |
| --------- | ---------- | ------------------- |
| 1 semana  | 5 dias     | 7 dias corridos     |
| 2 semanas | 10 dias    | 14 dias corridos    |
| 3 semanas | 15 dias    | 21 dias corridos    |
| 1 mês     | 20 dias    | 28-30 dias corridos |
| 1.5 meses | 30 dias    | 42 dias corridos    |
| 2 meses   | 40 dias    | 56 dias corridos    |

**Exemplo:**

- Projeto de 1 mês → use `duracaoDias: 20`
- Projeto de 2 semanas → use `duracaoDias: 10`

---

## ⚠️ Erros Comuns

### Erro: "Conflito detectado"

**Causa:** Tentativa de alocar equipe já ocupada

**Solução:**

1. Verificar disponibilidade primeiro:

   ```bash
   GET /api/obras/equipes/disponiveis?...
   ```

2. Escolher equipe disponível

---

### Erro: "Equipe não encontrada"

**Causa:** ID da equipe inválido

**Solução:**

1. Listar equipes disponíveis:

   ```bash
   GET /api/obras/equipes
   ```

2. Usar ID correto

---

### Erro: "Projeto não encontrado"

**Causa:** ID do projeto inválido

**Solução:**

1. Verificar se o projeto existe:

   ```bash
   GET /api/orcamentos/{id}
   ```

2. Garantir que o orçamento foi convertido em projeto

---

### Erro: "Acesso negado"

**Causa:** Usuário não tem permissão de admin

**Solução:**

- Fazer login com usuário admin
- Ou solicitar permissões ao administrador do sistema

---

## 📊 Fluxo Completo (Passo a Passo)

### Do Orçamento à Alocação

```
1. ORÇAMENTO APROVADO
   ↓
2. CRIAR PROJETO
   POST /api/orcamentos/{id}/converter-projeto
   ↓
3. VERIFICAR EQUIPES DISPONÍVEIS
   GET /api/obras/equipes/disponiveis?...
   ↓
4. ALOCAR EQUIPE
   POST /api/obras/alocar
   ↓
5. INICIAR TRABALHO
   PUT /api/obras/alocacoes/{id}/iniciar
   ↓
6. ACOMPANHAR (OPCIONAL)
   GET /api/obras/alocacoes/calendario
   ↓
7. CONCLUIR
   PUT /api/obras/alocacoes/{id}/concluir
```

---

## 🔗 Links Úteis

- **Documentação Completa:** `GESTAO_OPERACIONAL_EQUIPES.md`
- **API Base:** `http://localhost:3000/api/obras`
- **Postman Collection:** (criar arquivo separado se necessário)

---

## 💡 Dicas

1. **Use o calendário** para visualização mensal
2. **Verifique sempre a disponibilidade** antes de alocar
3. **Atualize o status** conforme o trabalho progride
4. **Registre a dataFimReal** para análises futuras
5. **Use observações** para documentar detalhes importantes

---

## 🆘 Suporte

**Problemas?**

1. Verifique os logs do servidor
2. Confirme que as migrations foram aplicadas
3. Valide o token JWT
4. Consulte a documentação completa

---

**Última atualização:** 22 de outubro de 2025  
**Versão:** 1.0.0
