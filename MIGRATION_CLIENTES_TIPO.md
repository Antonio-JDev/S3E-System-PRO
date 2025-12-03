# 🔄 Migration - Adicionar Campo `tipo` em Clientes

## 📋 Resumo da Alteração

Foi adicionado o campo `tipo` na tabela `clientes` para diferenciar entre Pessoa Física (PF) e Pessoa Jurídica (PJ).

## 🗄️ Alteração no Schema

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model Cliente {
  id        String   @id @default(uuid())
  nome      String
  cpfCnpj   String   @unique
  email     String?
  telefone  String?
  endereco  String?
  cidade    String?
  estado    String?
  cep       String?
  tipo      String   @default("PJ") // ✅ NOVO CAMPO
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orcamentos Orcamento[]
  projetos   Projeto[]
  vendas     Venda[]
  obras      Obra[]

  @@map("clientes")
}
```

## 🚀 Comandos para Executar a Migration

### 1️⃣ Gerar a Migration

```bash
cd backend
npx prisma migrate dev --name add_tipo_to_clientes
```

### 2️⃣ Aplicar em Produção

```bash
npx prisma migrate deploy
```

### 3️⃣ Atualizar o Prisma Client

```bash
npx prisma generate
```

## 📝 SQL da Migration

```sql
-- AlterTable
ALTER TABLE "clientes" 
ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'PJ';
```

## ✅ Validações

- **Valores permitidos:** 'PF' ou 'PJ'
- **Valor padrão:** 'PJ'
- **Campo obrigatório:** Sim (com default)
- **Retrocompatibilidade:** Todos os clientes existentes receberão 'PJ' como padrão

## 🔧 Alterações no Backend

### Controllers Atualizados:
- ✅ `backend/src/controllers/clientesController.ts`
  - `createCliente` - aceita campo `tipo`
  - `updateCliente` - aceita campo `tipo`
  - `importarClientes` - processa campo `tipo`
  - `exportarTemplate` - inclui campo `tipo`
  - `exportarClientes` - inclui campo `tipo`

### Rotas Adicionadas:
- ✅ `GET /api/clientes/template/download` - Baixar template JSON
- ✅ `GET /api/clientes/export/all` - Exportar todos os clientes
- ✅ `POST /api/clientes/import/preview` - Preview de importação
- ✅ `POST /api/clientes/import` - Importar clientes

## 🎨 Alterações no Frontend

### Componentes Atualizados:
- ✅ `frontend/src/components/ClientesModerno.tsx`
  - Botões: Template, Exportar, Importar JSON
  - Modal de preview de importação
  - Funções de importação/exportação

### Utilitários:
- ✅ `frontend/src/utils/importExportTemplates.ts`
  - Interface `ClienteTemplate`
  - Validação de importação
  - Geração de template de exemplo

## 📦 Exemplo de Template JSON

```json
{
  "version": "1.0.0",
  "exportDate": "2025-12-02T00:00:00.000Z",
  "instrucoes": "Preencha os campos abaixo com os dados dos clientes. Campos obrigatórios: nome, cpfCnpj, email, telefone. O tipo deve ser 'PF' (Pessoa Física) ou 'PJ' (Pessoa Jurídica).",
  "clientes": [
    {
      "nome": "EMPRESA EXEMPLO LTDA",
      "cpfCnpj": "12.345.678/0001-90",
      "email": "contato@empresaexemplo.com.br",
      "telefone": "(47) 3333-4444",
      "endereco": "Rua Exemplo, 123",
      "cidade": "Itajaí",
      "estado": "SC",
      "cep": "88300-000",
      "tipo": "PJ",
      "ativo": true
    },
    {
      "nome": "João da Silva",
      "cpfCnpj": "123.456.789-00",
      "email": "joao.silva@email.com",
      "telefone": "(47) 99999-8888",
      "endereco": "Avenida Principal, 456",
      "cidade": "Florianópolis",
      "estado": "SC",
      "cep": "88000-000",
      "tipo": "PF",
      "ativo": true
    }
  ]
}
```

## 🐳 Docker - Rebuild Necessário

### Backend
```bash
cd backend
docker build -t s3e-backend:latest .
docker push [seu-usuario]/s3e-backend:latest
```

### Frontend
```bash
cd frontend
docker build -t s3e-frontend:latest .
docker push [seu-usuario]/s3e-frontend:latest
```

## ⚠️ IMPORTANTE - Executar ANTES do Push

1. **Gerar a migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add_tipo_to_clientes
   ```

2. **Verificar se a migration foi criada:**
   ```bash
   ls backend/prisma/migrations/
   ```

3. **Testar localmente:**
   ```bash
   npm run dev
   ```

4. **Rebuild das imagens Docker:**
   ```bash
   # Backend
   cd backend
   docker build -t s3e-backend:latest .
   
   # Frontend
   cd ../frontend
   docker build -t s3e-frontend:latest .
   ```

5. **Push para DockerHub:**
   ```bash
   docker push [seu-usuario]/s3e-backend:latest
   docker push [seu-usuario]/s3e-frontend:latest
   ```

## ✅ Checklist Antes do Deploy

- [ ] Migration gerada e testada localmente
- [ ] Controllers atualizados e testados
- [ ] Frontend testado com importação/exportação
- [ ] Imagem Docker do backend rebuilded
- [ ] Imagem Docker do frontend rebuilded
- [ ] Push para DockerHub realizado
- [ ] Documentação atualizada

## 🎯 Funcionalidades Implementadas

1. ✅ Campo `tipo` (PF/PJ) no modelo Cliente
2. ✅ Botão "Template" - Baixa JSON de exemplo
3. ✅ Botão "Exportar" - Exporta todos os clientes
4. ✅ Botão "Importar JSON" - Importa clientes de arquivo
5. ✅ Modal de preview antes da importação
6. ✅ Validação de dados
7. ✅ Criação e atualização automática baseada em CPF/CNPJ
8. ✅ Feedback visual (novos vs atualizações)

## 📊 Fluxo de Importação

1. Usuário clica em "Template" → Baixa JSON de exemplo
2. Usuário edita o JSON com dados reais
3. Usuário clica em "Importar JSON" → Seleciona arquivo
4. Sistema valida e mostra preview
5. Usuário confirma → Importação executada
6. Sistema retorna resumo: X criados, Y atualizados, Z erros

