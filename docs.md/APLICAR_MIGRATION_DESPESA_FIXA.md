# 🔧 Como Aplicar a Migração de Cascade Delete (Despesa Fixa)

## 📋 Problema

Quando você deleta uma despesa fixa, as contas a pagar relacionadas não são
excluídas automaticamente da página de "Contas a Pagar".

## ✅ Solução Implementada

Foi adicionada uma relação de **CASCADE DELETE** no banco de dados entre
`DespesaFixa` e `ContaPagar`, para que quando uma despesa fixa for deletada,
todas as contas a pagar relacionadas sejam removidas automaticamente.

---

## 🐳 Aplicando a Migração no Docker

### **Opção 1: Reiniciar os Containers (MAIS SIMPLES) ⭐**

O `docker-compose.yml` já está configurado para aplicar migrações
automaticamente ao iniciar.

```bash
# Para ambiente de DESENVOLVIMENTO:
docker-compose down
docker-compose up -d

# Para ambiente de PRODUÇÃO:
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

Após reiniciar, a migração será aplicada automaticamente! 🎉

---

### **Opção 2: Aplicar Migração no Container em Execução**

Se não quiser reiniciar os containers, execute a migração manualmente:

```bash
# Para DESENVOLVIMENTO:
docker exec -it s3e-backend-dev npx prisma migrate deploy

# Para PRODUÇÃO:
docker exec -it s3e-backend-prod npx prisma migrate deploy
```

---

### **Opção 3: Executar SQL Direto no PostgreSQL**

Conecte-se ao banco de dados e execute o SQL manualmente:

```bash
# 1. Conectar ao PostgreSQL no Docker
docker exec -it s3e-postgres psql -U s3e_prod -d s3e_producao

# OU para produção:
docker exec -it s3e-postgres-prod psql -U s3e_prod -d s3e_producao

# 2. Copie e cole o SQL abaixo:
```

```sql
-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS "ContaPagar_despesaFixaId_idx" ON "contas_pagar"("despesaFixaId");

-- Remover constraint antiga se existir
ALTER TABLE "contas_pagar"
DROP CONSTRAINT IF EXISTS "ContaPagar_despesaFixaId_fkey";

-- Adicionar constraint de foreign key com cascade delete
ALTER TABLE "contas_pagar"
ADD CONSTRAINT "ContaPagar_despesaFixaId_fkey"
FOREIGN KEY ("despesaFixaId")
REFERENCES "despesas_fixas"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Verificar se funcionou
SELECT
    conname AS constraint_name,
    confdeltype AS delete_action,
    confupdtype AS update_action
FROM pg_constraint
WHERE conname = 'ContaPagar_despesaFixaId_fkey';
```

**Resultado esperado:**

- `delete_action: 'c'` (cascade)
- `update_action: 'c'` (cascade)

Para sair do psql: `\q`

---

### **Opção 4: Executar SQL via Arquivo**

```bash
# 1. Copiar o arquivo SQL para dentro do container
docker cp fix-despesa-fixa-cascade.sql s3e-postgres:/tmp/

# 2. Executar o arquivo SQL
docker exec -it s3e-postgres psql -U s3e_prod -d s3e_producao -f /tmp/fix-despesa-fixa-cascade.sql
```

---

## 🧪 Testando a Correção

Após aplicar a migração:

1. ✅ Acesse a página de **Gerenciamento Empresarial**
2. ✅ Vá para a aba **Despesas Fixas**
3. ✅ Delete uma despesa fixa (use uma de teste)
4. ✅ Verifique no **Financeiro > Contas a Pagar** que as contas relacionadas
   foram excluídas automaticamente

### Logs do Backend

Você deve ver no console do backend:

```
🗑️ Iniciando exclusão da despesa fixa: [id]
✅ X conta(s) a pagar deletada(s)
✅ Despesa fixa deletada com sucesso
```

Para ver os logs:

```bash
# Desenvolvimento:
docker logs -f s3e-backend-dev

# Produção:
docker logs -f s3e-backend-prod
```

---

## 📁 Arquivos Criados

- `backend/prisma/migrations/20260122000000_add_despesa_fixa_cascade_delete/migration.sql` -
  Migração do Prisma
- `fix-despesa-fixa-cascade.sql` - Script SQL para execução manual
- `APLICAR_MIGRATION_DESPESA_FIXA.md` - Este guia

---

## 🎯 O Que Foi Alterado

### Schema do Prisma (`backend/prisma/schema.prisma`)

```prisma
model ContaPagar {
  // ... outros campos ...
  despesaFixa  DespesaFixa?  @relation(fields: [despesaFixaId], references: [id], onDelete: Cascade)

  @@index([despesaFixaId])
}

model DespesaFixa {
  // ... outros campos ...
  pagamentos   PagamentoDespesaFixa[]
  contasPagar  ContaPagar[]  // Nova relação
}
```

### Service (`backend/src/services/despesasFixas.service.ts`)

Adicionado logs detalhados para rastrear a exclusão:

```typescript
async deletarDespesa(id: string) {
    console.log(`🗑️ Iniciando exclusão da despesa fixa: ${id}`);

    // Deletar contas a pagar (redundante com CASCADE, mas mantido para compatibilidade)
    const contasDeleted = await prisma.contaPagar.deleteMany({
        where: { despesaFixaId: id }
    });
    console.log(`✅ ${contasDeleted.count} conta(s) a pagar deletada(s)`);

    // Deletar despesa fixa
    const despesaDeleted = await prisma.despesaFixa.delete({
        where: { id }
    });
    console.log(`✅ Despesa fixa deletada com sucesso`);

    return despesaDeleted;
}
```

---

## ⚠️ Importante

- ✅ A migração é **SEGURA** e não afeta dados existentes
- ✅ Apenas adiciona uma constraint de foreign key com cascade delete
- ✅ O código do service continua fazendo a exclusão manual (redundante, mas
  seguro)
- ✅ Funciona tanto em desenvolvimento quanto em produção

---

## 🆘 Problemas?

Se encontrar algum erro:

1. Verifique se o container PostgreSQL está rodando: `docker ps`
2. Verifique os logs: `docker logs s3e-postgres` ou
   `docker logs s3e-postgres-prod`
3. Verifique se o usuário tem permissões:
   `GRANT ALL ON SCHEMA public TO s3e_prod;`
4. Execute o SQL manualmente (Opção 3)

---

**Data da Correção:** 22/01/2026  
**Migração:** `20260122000000_add_despesa_fixa_cascade_delete`
