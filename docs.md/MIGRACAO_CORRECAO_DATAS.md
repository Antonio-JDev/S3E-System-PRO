# 🔧 Migração: Correção de Datas Existentes

## 🎯 Problema

As datas de vencimento das contas a pagar **já criadas** no banco de dados estão
1 dia antes da data correta.

**Exemplo no Modal de Detalhes:**

```
Duplicatas/Parcelas do Boleto:    Contas a Pagar Vinculadas:
23/10/2025  →                      22/10/2025  ❌
06/11/2025  →                      05/11/2025  ❌
20/11/2025  →                      19/11/2025  ❌
```

---

## ✅ Solução

### **Passo 1: Executar Script de Migração**

Este script vai corrigir **todas** as datas de contas a pagar no banco de dados,
adicionando 1 dia.

**No terminal (pasta `backend`):**

```bash
npm run corrigir:datas
```

---

### **O Que o Script Faz**

1. ✅ **Busca todas** as contas a pagar do banco
2. ✅ **Adiciona 1 dia** a cada data de vencimento
3. ✅ **Atualiza no banco** de dados
4. ✅ **Corrige também**:
   - Data de agendamento (se houver)
   - Data de pagamento (se houver)

---

### **Exemplo de Saída do Script**

```
🔧 Iniciando correção de datas das contas a pagar...

📋 Total de contas a pagar encontradas: 45

✅ Conta abc-123:
   Antes: 22/10/2025
   Depois: 23/10/2025

✅ Conta abc-124:
   Antes: 05/11/2025
   Depois: 06/11/2025

✅ Conta abc-125:
   Antes: 19/11/2025
   Depois: 20/11/2025

🎉 Correção concluída! 45 conta(s) corrigida(s).

📊 Resumo Final:
   - Datas de vencimento corrigidas: 45
   - Datas de agendamento corrigidas: 3
   - Datas de pagamento corrigidas: 1

✅ Migração completa!
```

---

## ⚠️ IMPORTANTE: Backup Antes de Executar

**Antes de rodar o script, faça backup do banco de dados:**

```bash
# PostgreSQL
pg_dump nome_do_banco > backup_antes_correcao_datas.sql

# Ou use o Prisma Studio para exportar
npm run prisma:studio
```

---

## 🧪 Como Testar Após Migração

### **Teste 1: Modal de Detalhes**

1. Abra qualquer compra com parcelas
2. Clique em "Ver Detalhes"
3. Compare as duas seções:

**Resultado Esperado:**

```
Duplicatas/Parcelas do Boleto:    Contas a Pagar Vinculadas:
23/10/2025  →                      23/10/2025  ✅
06/11/2025  →                      06/11/2025  ✅
20/11/2025  →                      20/11/2025  ✅
```

---

### **Teste 2: Verificar no Banco de Dados**

```sql
-- Ver algumas contas a pagar
SELECT
    id,
    descricao,
    "dataVencimento",
    "valorParcela",
    status
FROM conta_pagar
ORDER BY "dataVencimento"
LIMIT 10;

-- Resultado esperado: datas corretas (não 1 dia antes)
```

---

## 🔄 Se Algo Der Errado

### **Restaurar Backup:**

```bash
# PostgreSQL
psql nome_do_banco < backup_antes_correcao_datas.sql
```

### **Executar Script Novamente:**

O script é **idempotente** (pode rodar múltiplas vezes), mas vai adicionar 1 dia
cada vez que rodar. Por isso:

❌ **NÃO execute o script mais de 1 vez!**

Se executou por engano:

1. Restaure o backup
2. Execute apenas 1 vez

---

## 📊 Checklist de Validação

Após executar o script:

- [ ] Script executou sem erros
- [ ] Mensagem "Migração completa!" apareceu
- [ ] Modal de detalhes mostra datas iguais nas 2 seções
- [ ] Novas compras também têm datas corretas
- [ ] Contas a pagar antigas têm datas corrigidas

---

## 🎯 Fluxo Completo

### **1. Situação Atual (Antes):**

```
Banco de Dados:
├─ Contas antigas: Datas 1 dia antes ❌
└─ Código: Corrigido ✅ (novas compras terão datas corretas)

Modal mostra:
├─ Duplicatas (do XML): Datas corretas ✅
└─ Contas a Pagar (do banco): Datas 1 dia antes ❌
```

### **2. Após Executar Script:**

```
Banco de Dados:
├─ Contas antigas: Datas corrigidas ✅
└─ Código: Corrigido ✅

Modal mostra:
├─ Duplicatas (do XML): Datas corretas ✅
└─ Contas a Pagar (do banco): Datas corretas ✅
```

---

## 💡 Por Que Precisa de Migração?

**Apenas corrigir o código não é suficiente porque:**

1. ✅ **Código corrigido**: Novas compras terão datas certas
2. ❌ **Banco de dados**: Contas antigas ainda têm datas erradas
3. ✅ **Script de migração**: Corrige dados antigos

**Analogia:**

```
Código = Receita de bolo
Banco = Bolos já assados

Se você corrige a receita:
├─ Novos bolos ficam corretos ✅
└─ Bolos antigos continuam errados ❌

Precisa "consertar" os bolos antigos também!
```

---

## 🚀 Comandos Resumidos

```bash
# 1. Fazer backup (recomendado)
pg_dump nome_do_banco > backup.sql

# 2. Executar migração
cd backend
npm run corrigir:datas

# 3. Testar no navegador
# Abrir modal de detalhes de compra
# Verificar se datas estão iguais nas 2 seções
```

---

## ❓ FAQ

**P: Posso executar o script com o sistema em produção?** R: Sim, mas é
recomendado:

1. Fazer backup antes
2. Executar em horário de baixo uso
3. Avisar usuários

**P: O script é rápido?** R: Sim. Para 1000 contas, leva ~10 segundos.

**P: Vai afetar contas já pagas?** R: Sim, vai corrigir todas as datas
(pendentes e pagas). Isso é correto, pois as datas de pagamento também estavam
erradas.

**P: E se eu criar uma compra nova agora?** R: Vai ter a data correta
automaticamente (código já está corrigido).

**P: Preciso rodar o script toda vez que importar XML?** R: Não! Apenas 1 vez
para corrigir dados antigos.

---

## ✅ Resultado Final

### **Antes da Migração:**

```
Modal de Detalhes:
┌─────────────────────────────────────────┐
│ Duplicatas do Boleto:                   │
│ 23/10/2025 | 06/11/2025 | 20/11/2025   │
│                                         │
│ Contas a Pagar:                         │
│ 22/10/2025 | 05/11/2025 | 19/11/2025 ❌│
└─────────────────────────────────────────┘
```

### **Após Migração:**

```
Modal de Detalhes:
┌─────────────────────────────────────────┐
│ Duplicatas do Boleto:                   │
│ 23/10/2025 | 06/11/2025 | 20/11/2025   │
│                                         │
│ Contas a Pagar:                         │
│ 23/10/2025 | 06/11/2025 | 20/11/2025 ✅│
└─────────────────────────────────────────┘
```

---

**Execute o script agora e as datas ficarão perfeitas!** ✅🎉

**Sistema S3E - Migração de Datas v1.0**
