# Diagnóstico e correção: "FATAL: sorry, too many clients already"

## Causa

O erro ocorria porque **cada controller, service, worker e rota** instanciava seu próprio `new PrismaClient()`. Cada instância abre um pool de conexões com o PostgreSQL; com dezenas de arquivos, o limite de conexões do servidor era estourado.

## Solução implementada

### 1. Singleton central: `backend/src/lib/prisma.ts`

Foi criado um único ponto de instanciação do PrismaClient:

- **Arquivo:** `backend/src/lib/prisma.ts`
- **Padrão:** Singleton com `globalThis` para evitar múltiplas instâncias em dev (hot reload).
- **Uso:** Em todo o backend, importar `prisma` desse módulo em vez de criar `new PrismaClient()`.

### 2. Arquivos alterados (conexão centralizada)

Todos os arquivos abaixo passaram a usar `import { prisma } from '../lib/prisma'` (ou `./lib/prisma` quando em `src/`) e **não** instanciam mais PrismaClient.

#### App

- `backend/src/app.ts`

#### Controllers

- `backend/src/controllers/authController.ts`
- `backend/src/controllers/vendasController.ts`
- `backend/src/controllers/orcamentosController.ts`
- `backend/src/controllers/atendimentoCrmController.ts`
- `backend/src/controllers/kitsFerramentaController.ts`
- `backend/src/controllers/clientesController.ts`
- `backend/src/controllers/configFiscalController.ts`
- `backend/src/controllers/cotacoesController.ts`
- `backend/src/controllers/ferramentasController.ts`
- `backend/src/controllers/materiaisController.ts`
- `backend/src/controllers/projetoDocumentosController.ts`
- `backend/src/controllers/nfeController.ts`
- `backend/src/controllers/alocacoesController.ts`
- `backend/src/controllers/tarefasObraController.ts`
- `backend/src/controllers/tasksController.ts`
- `backend/src/controllers/obraController.ts`
- `backend/src/controllers/pdfCustomizationController.ts`
- `backend/src/controllers/logsController.ts`
- `backend/src/controllers/pdfOrcamentoController.ts`
- `backend/src/controllers/nfseController.ts`
- `backend/src/controllers/diagnosticoTarefasController.ts`
- `backend/src/controllers/movimentacoesController.ts`
- `backend/src/controllers/comprasController.ts`
- `backend/src/controllers/configuracaoController.ts`
- `backend/src/controllers/empresasController.ts`
- `backend/src/controllers/historicoController.ts`
- `backend/src/controllers/dashboardController.ts`
- `backend/src/controllers/fornecedoresController.ts`
- `backend/src/controllers/projetosController.ts`
- `backend/src/controllers/servicosController.ts`
- `backend/src/controllers/obrasController.ts`
- `backend/src/controllers/alocacaoMateriaisController.ts`
- `backend/src/controllers/quadrosController.ts`

#### Services

- `backend/src/services/notificacoes.service.ts`
- `backend/src/services/relatorios.service.ts`
- `backend/src/services/atendimentoCrm.service.ts`
- `backend/src/services/tarefasInternas.service.ts`
- `backend/src/services/equipes.service.ts`
- `backend/src/services/recalculoCustoUnitario.service.ts`
- `backend/src/services/sincronizacaoOrcamentoPV.service.ts`
- `backend/src/services/recursosHumanos.service.ts`
- `backend/src/services/funcionarios.service.ts`
- `backend/src/services/nfe-fila.service.ts`
- `backend/src/services/planos.service.ts`
- `backend/src/services/fracionamentoEstoque.service.ts`
- `backend/src/services/resumoAdministrativo.service.ts`
- `backend/src/services/contasReceber.service.ts`
- `backend/src/services/ferramentasService.ts`
- `backend/src/services/alocacao.service.ts`
- `backend/src/services/nfe.service.ts`
- `backend/src/services/dre.service.ts`
- `backend/src/services/vales.service.ts`
- `backend/src/services/bi.service.ts`
- `backend/src/services/estoque.service.ts`
- `backend/src/services/movimentacoesCaixa.service.ts`
- `backend/src/services/nfse.service.ts`
- `backend/src/services/despesasFixas.service.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/services/pessoa.service.ts`
- `backend/src/services/nfse-fila.service.ts`
- `backend/src/services/pdfNfse.service.ts`
- `backend/src/services/pdfOrcamento.service.ts`
- `backend/src/services/fluxoCaixa.service.ts`
- `backend/src/services/pdfNfsePuppeteer.service.ts`
- `backend/src/services/vendas.service.ts`
- `backend/src/services/kits.service.ts`
- `backend/src/services/gastosVeiculo.service.ts`
- `backend/src/services/compras.service.ts`
- `backend/src/services/obra.service.ts`
- `backend/src/services/qualidade.service.ts`
- `backend/src/services/contasPagar.service.ts`
- `backend/src/services/nfe-audit.service.ts`
- `backend/src/services/configuracao.service.ts`
- `backend/src/services/projetos.service.ts`
- `backend/src/services/quadros.service.ts`
- `backend/src/services/veiculos.service.ts`
- `backend/src/services/lucroReal.service.ts`

#### Workers

- `backend/src/workers/nfe-fila.worker.ts`
- `backend/src/workers/nfse-fila.worker.ts`

#### Routes

- `backend/src/routes/orcamentos.ts` (rotas inline que usavam `new PrismaClient()` e `$disconnect()` passaram a usar o singleton; não chamar `$disconnect()` no singleton.)

#### Utils

- `backend/src/utils/skuGenerator.ts`

### 3. Arquivos que não foram alterados (opcional)

- **Testes** (`*.test.ts`): continuam podendo mockar `PrismaClient` ou usar instância própria conforme a estratégia de teste.
- **Scripts** em `backend/scripts/` e `backend/src/scripts/`: são executados de forma pontual (ex.: migrações, seeds, one-off). Podem continuar com `new PrismaClient()` ou, se preferir, importar o singleton (ex.: `import { prisma } from '../lib/prisma'` em scripts dentro de `src/scripts/`).
- **Seed** `backend/prisma/seed.ts`: pode manter instância própria ou importar do singleton, conforme padrão do projeto.

### 4. Onde está o DATABASE_URL e onde mudar

O `DATABASE_URL` **não** fica guardado em um único lugar; ele é montado assim:

| Onde | Arquivo | O que fazer |
|------|---------|-------------|
| **Produção (Docker / TrueNAS Scale)** | `docker-compose.prod.yml` | A URL é montada na linha do serviço `backend` em `environment.DATABASE_URL`, usando `DB_USER`, `DB_PASSWORD` e `DB_NAME` do seu `.env`. Já foi adicionado `?connection_limit=10` nessa URL. Para mudar o limite, edite essa linha (ex.: `connection_limit=15`). |
| **Desenvolvimento** | `docker-compose.yml` | Mesma ideia: `DATABASE_URL` no serviço `backend`; já inclui `connection_limit=10`. |
| **Arquivo de ambiente** | `.env` ou `.env.production` | Você **não** define `DATABASE_URL` aqui no fluxo normal: o Compose monta a URL a partir de `DB_USER`, `DB_PASSWORD` e `DB_NAME`. Se quiser URL fixa (ex.: banco externo), defina `DATABASE_URL=postgresql://...?connection_limit=10` no `.env` e no `docker-compose.prod.yml` troque para `DATABASE_URL: ${DATABASE_URL}`. |
| **Exemplo / referência** | `.env.example` | Só documentação; mostra formato com `connection_limit=10`. |

Resumo: para **produção no TrueNAS Scale** você só precisa manter o `.env` (ou o arquivo que o Compose usa) com `DB_USER`, `DB_PASSWORD` e `DB_NAME` corretos. O `connection_limit=10` já está na URL dentro do `docker-compose.prod.yml`.

### 5. Múltiplas instâncias e limite de conexões

- **Múltiplas réplicas do backend:** divida o limite total do PostgreSQL entre as instâncias. Ex.: limite 20 no servidor e 2 réplicas → use `connection_limit=10` por instância (já é o padrão no compose).
- O **schema do Prisma** não define `connection_limit`; ele é passado apenas na URL.

## Resumo

| Antes | Depois |
|-------|--------|
| Dezenas de `new PrismaClient()` em controllers, services, routes e workers | Uma única instância em `src/lib/prisma.ts` |
| Várias rotas/controllers criando cliente e chamando `$disconnect()` | Uso do singleton; não chamar `$disconnect()` no cliente compartilhado |
| Fácil estourar `max_connections` do PostgreSQL | Um pool por processo; controle via `connection_limit` na URL |

Sempre que precisar de acesso ao banco no backend (controllers, services, workers, routes), importe:

```ts
import { prisma } from '../lib/prisma';  // ou path relativo adequado
```

e use `prisma` normalmente. Não instancie `new PrismaClient()` nesses módulos.

---

## TrueNAS Scale: subir os containers

**Essas mudanças não quebram nada ao subir os containers no TrueNAS Scale.**

- O backend continua sendo um **único processo** por container (Node/Express). Só mudou o fato de existir **uma instância de PrismaClient** por processo (singleton) em vez de dezenas.
- O TrueNAS Scale usa Docker/Kubernetes; o que sobe é o mesmo tipo de stack (postgres + backend + frontend, conforme seu compose). Nenhuma variável nova é obrigatória: o `connection_limit=10` já está na URL dentro do `docker-compose.prod.yml`.
- O que você precisa no TrueNAS:
  1. **Arquivo de ambiente** (ex.: `.env` ou o que o seu app do Compose usa) com `DB_USER`, `DB_PASSWORD`, `DB_NAME` (e demais variáveis que você já usava).
  2. Subir com o mesmo comando/compose que você usa hoje (ex.: `docker-compose -f docker-compose.prod.yml --env-file .env up -d`).

**Possível “problema” só em um caso:** se você tiver **várias réplicas do backend** (mais de um container backend ao mesmo tempo), cada uma terá seu próprio pool de conexões. Aí vale manter `connection_limit=10` (ou menor) por instância para não estourar o `max_connections` do PostgreSQL. Com uma única instância do backend, o comportamento é só melhor (menos conexões, sem “too many clients”).
