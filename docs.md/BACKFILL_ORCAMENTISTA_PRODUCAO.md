# Backfill do nome do orçamentista em produção

## Objetivo

Garantir que, ao subir a nova versão em produção:

- O sistema **mostra e salva o nome real** do usuário que criou o orçamento (`orcamentistaNome`).
- O **PDF do orçamento** exibe o campo "Orçamentista" com esse nome.
- O **Pedido de Venda (PV)** mostra o vendedor como o usuário que gerou o orçamento (`vendedorNome` herdado de `orcamentistaNome`).
- **Orçamentos já existentes** não percam a informação: o script preenche o nome quando possível e usa "Não identificado" quando não houver histórico.

## O que já está implementado

- **Criação**: ao criar um orçamento, o backend grava o primeiro nome do usuário logado em `orcamentistaNome`.
- **Edição**: ao editar um orçamento que ainda não tinha orçamentista, o backend preenche com o usuário que está editando (primeira edição após o deploy).
- **PDF**: o PDF do orçamento exibe "Orçamentista: [nome]".
- **Vendas**: ao gerar o PV a partir do orçamento, o campo `vendedorNome` da venda é preenchido com o `orcamentistaNome` do orçamento.

## Script de backfill (executar após o deploy)

O script preenche `orcamentistaNome` nos orçamentos que ainda estão vazios e atualiza `vendedorNome` nas vendas correspondentes.

### Em produção (recomendado)

1. Fazer backup do banco (ex.: dump) antes de rodar.
2. Na pasta do **backend** (onde está o `package.json` do backend):

```bash
# Com variáveis de ambiente de produção (ex.: .env.production)
# Linux/macOS:
export NODE_ENV=production
npm run backfill:orcamentista

# Ou com dotenv:
npx dotenv -e .env.production -- npm run backfill:orcamentista
```

3. O script:
   - Busca orçamentos com `orcamentistaNome` NULL.
   - Tenta obter o criador em `audit_logs` (se existir registro de CREATE do orçamento), usando `userName` ou o nome do `User` pelo `userId`.
   - Para os que não tiverem registro, define **"Não identificado"**.
   - Atualiza vendas com `vendedorNome` NULL para herdar o `orcamentistaNome` do orçamento vinculado.

### Desenvolvimento

```bash
cd backend
npm run backfill:orcamentista
```

Ou com ts-node direto:

```bash
cd backend
npx tsx src/scripts/backfill-orcamentista-nome.ts
```

## Resumo

| Ação                         | Quando usar |
|-----------------------------|-------------|
| Deploy da nova versão       | Migrations já existem para as colunas; não é necessário migration extra. |
| Rodar o script de backfill  | **Uma vez**, após o deploy em produção, para preencher orçamentos e vendas antigos. |
| Novos orçamentos             | Passam a ter orçamentista preenchido automaticamente na criação. |

Assim, o sistema não perde a informação do orçamentista e o PV continua exibindo o vendedor como o usuário que gerou o orçamento.
