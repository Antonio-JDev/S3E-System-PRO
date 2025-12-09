# 🚀 Importação de Orçamentos Históricos via JSON

## 📋 Descrição

Implementa funcionalidade completa para importação de orçamentos históricos do sistema antigo via arquivo JSON. Esta feature permite migrar dados históricos preservando informações essenciais (número, status, cliente, datas, valor total) para manter o histórico completo no novo sistema.

## 🎯 Objetivo

Permitir a importação em massa de **2143 orçamentos** históricos do sistema antigo, preservando apenas os dados básicos necessários para manter o histórico, sem necessidade de recriar todos os itens detalhados de cada orçamento.

## ✨ Funcionalidades Implementadas

### 1. Template de Importação
- **Endpoint**: `GET /api/orcamentos/import/template`
- Gera arquivo JSON de exemplo com estrutura esperada
- Facilita preparação dos dados do sistema antigo

### 2. Preview de Importação
- **Endpoint**: `POST /api/orcamentos/import/preview`
- Valida arquivo JSON antes de importar
- Mostra estatísticas:
  - Total de orçamentos a importar
  - Clientes novos vs existentes
  - Validação de campos obrigatórios
  - Detecção de erros

### 3. Importação em Lote
- **Endpoint**: `POST /api/orcamentos/import`
- Processa e cria orçamentos no banco de dados
- Criação automática de clientes quando não existem
- Tratamento de erros individual (não para importação inteira)
- Relatório detalhado de sucessos e falhas

## 🔧 Detalhes Técnicos

### Arquivos Modificados

#### `backend/src/controllers/orcamentosController.ts`
- ✅ Adicionada configuração Multer para upload de JSON (até 50MB)
- ✅ `exportarTemplateOrcamentos()` - Gera template JSON
- ✅ `previewImportacaoOrcamentos()` - Valida e mostra preview
- ✅ `importarOrcamentos()` - Processa e cria orçamentos
- ✅ Funções auxiliares:
  - `parseData()` - Suporta múltiplos formatos (ISO, DD/MM/YYYY, Excel serial)
  - `mapearStatus()` - Converte status do sistema antigo
  - `normalizarNome()` - Normaliza nomes de clientes
  - `criarOuEncontrarCliente()` - Cria/encontra clientes automaticamente

#### `backend/src/routes/orcamentos.ts`
- ✅ Adicionadas 3 novas rotas de importação
- ✅ RBAC implementado (`checkPermission('create_orcamento')`)
- ✅ Rotas posicionadas antes das rotas genéricas para evitar conflitos

### Características de Implementação

- ✅ **Não modifica funcionalidades existentes** - `createOrcamento` permanece intacto
- ✅ **Segue padrão existente** - Mesma estrutura de importação de clientes, materiais e cotações
- ✅ **RBAC completo** - Permissões adequadas para importação
- ✅ **Tratamento robusto de erros** - Continua processando mesmo se um orçamento falhar
- ✅ **Limpeza automática** - Remove arquivos temporários após processamento
- ✅ **Logs detalhados** - Facilita debug e monitoramento
- ✅ **Preservação de dados** - Mantém número original, datas e valores

## 📋 Formato JSON Esperado

```json
{
  "orcamentos": [
    {
      "numero": "ORC-001",
      "status": "Aprovado",
      "cliente": "Nome do Cliente",
      "dataEmissao": "2024-01-15",
      "dataValidade": "2024-02-15",
      "valorTotal": 15000.00
    }
  ]
}
```

### Campos Obrigatórios
- `numero` - Número do orçamento no sistema antigo
- `status` - Status (Aprovado, Pendente, Recusado)
- `cliente` - Nome do cliente
- `dataEmissao` - Data de emissão (ISO ou DD/MM/YYYY)
- `dataValidade` - Data de validade (ISO ou DD/MM/YYYY)
- `valorTotal` - Valor total do orçamento

## 🔄 Mapeamento de Dados

### Status
- `Concluído` / `Concluido` / `Aprovado` → `Aprovado`
- `Aberto` / outros → `Pendente`
- `Recusado` / `Cancelado` → `Recusado`

### Clientes
- Busca cliente existente pelo nome (case-insensitive)
- Se não encontrar, cria novo cliente com:
  - CPF/CNPJ temporário (`TEMP-{timestamp}-{random}`)
  - Tipo: "PJ" (padrão)
  - Campos opcionais como `null`

### Orçamentos
- Se `valorTotal > 0`: Cria item genérico tipo "SERVICO"
  - Nome: "Serviço de Engenharia Elétrica"
  - Descrição: "Orçamento migrado do sistema antigo (Número: {numero})"
  - Valor: `valorTotal`
- Se `valorTotal = 0`: Cria orçamento sem itens
- Preserva número original em `observacoes`
- Usa `dataEmissao` para `createdAt` (preserva data original)

## 🧪 Como Testar

### 1. Baixar Template
```bash
curl -X GET http://localhost:3001/api/orcamentos/import/template \
  -H "Authorization: Bearer SEU_TOKEN" \
  -o template-orcamentos.json
```

### 2. Preparar Dados
Edite o arquivo JSON com os dados do sistema antigo seguindo o template.

### 3. Preview (Recomendado)
```bash
curl -X POST http://localhost:3001/api/orcamentos/import/preview \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@dados-orcamentos.json"
```

### 4. Importar
```bash
curl -X POST http://localhost:3001/api/orcamentos/import \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@dados-orcamentos.json"
```

## 📊 Resposta da API

### Preview
```json
{
  "success": true,
  "data": {
    "totalOrcamentos": 2143,
    "criar": 2143,
    "clientesNovos": 150,
    "clientesExistentes": 1993,
    "orcamentos": [...]
  }
}
```

### Importação
```json
{
  "success": true,
  "data": {
    "criados": 2143,
    "erros": 0,
    "clientesCriados": 150,
    "clientesEncontrados": 1993,
    "detalhes": [...]
  }
}
```

## ✅ Checklist

- [x] Implementação completa das 3 funções principais
- [x] Configuração Multer para upload de JSON
- [x] Rotas adicionadas com RBAC adequado
- [x] Validação de campos obrigatórios
- [x] Tratamento de erros individual
- [x] Criação automática de clientes
- [x] Preservação de dados históricos
- [x] Logs detalhados para debug
- [x] Limpeza automática de arquivos temporários
- [x] Não interfere com funcionalidades existentes
- [x] Segue padrão dos outros endpoints de importação

## 🔒 Segurança

- ✅ Autenticação obrigatória (`authenticate` middleware)
- ✅ RBAC implementado (`checkPermission('create_orcamento')`)
- ✅ Validação de tipo de arquivo (apenas JSON)
- ✅ Limite de tamanho de arquivo (50MB)
- ✅ Limpeza automática de arquivos temporários

## 📝 Notas Importantes

1. **Não modifica `createOrcamento` existente** - Funcionalidade completamente isolada
2. **Clientes criados automaticamente** - Recebem CPF/CNPJ temporário que pode ser atualizado depois
3. **Orçamentos sem itens detalhados** - Apenas item genérico "Serviço" com valor total (para histórico)
4. **Preservação de datas** - Usa `dataEmissao` para `createdAt` mantendo cronologia original

## 🚀 Próximos Passos

- [ ] Testar importação com arquivo JSON real do sistema antigo (2143 orçamentos)
- [ ] Validar criação automática de clientes
- [ ] Verificar preservação de dados históricos
- [ ] Atualizar CPF/CNPJ dos clientes criados automaticamente (se necessário)

## 📸 Screenshots

_(Adicionar screenshots da interface quando disponível)_

---

**Tipo**: Feature  
**Impacto**: Baixo (não modifica funcionalidades existentes)  
**Breaking Changes**: Nenhum  
**Requer Migrations**: Não

