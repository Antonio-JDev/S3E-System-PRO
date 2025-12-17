# 📋 Guia Completo de Testes - Sistema NF-e

Este documento contém exemplos práticos de como testar todas as operações de NF-e implementadas no sistema.

## 📌 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Testes de Emissão](#testes-de-emissão)
4. [Testes de Consulta](#testes-de-consulta)
5. [Testes de Cancelamento](#testes-de-cancelamento)
6. [Testes de Carta de Correção (CC-e)](#testes-de-carta-de-correção-cc-e)
7. [Testes de Inutilização](#testes-de-inutilização)
8. [Testes de Manifestação do Destinatário](#testes-de-manifestação-do-destinatário)
9. [Testes de Histórico e DANFE](#testes-de-histórico-e-danfe)
10. [Testes de Contingência](#testes-de-contingência)

---

## 🔧 Pré-requisitos

- Backend rodando em `http://localhost:3001` (ou URL configurada)
- Token de autenticação válido (role: `admin` ou `gerente`)
- Empresa fiscal cadastrada com certificado digital configurado
- Ambiente de homologação configurado (recomendado para testes)

---

## ⚙️ Configuração Inicial

### 1. Obter Token de Autenticação

```bash
# Login no sistema
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@exemplo.com",
    "password": "senha123"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**⚠️ IMPORTANTE:** Guarde o token retornado. Você precisará dele em todas as requisições abaixo.

### 2. Obter ID da Empresa Fiscal

```bash
# Listar empresas fiscais cadastradas
curl -X GET http://localhost:3001/api/empresas-fiscais \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-da-empresa",
      "cnpj": "12345678000190",
      "razaoSocial": "Empresa Teste LTDA",
      ...
    }
  ]
}
```

**⚠️ IMPORTANTE:** Guarde o `id` da empresa. Você precisará dele em todas as operações abaixo.

---

## 📤 Testes de Emissão

### Emitir NF-e a partir de um pedido

```bash
curl -X POST http://localhost:3001/api/nfe/emitir \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "pedidoId": "id-do-pedido-de-venda",
    "empresaId": "uuid-da-empresa-fiscal",
    "ambiente": "2"
  }'
```

**Resposta esperada (sucesso):**
```json
{
  "success": true,
  "data": {
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "protocolo": "142000000000000",
    "dataAutorizacao": "2025-01-15T10:30:00Z",
    "mensagem": "NF-e autorizada com sucesso",
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>..."
  }
}
```

**Resposta esperada (contingência):**
```json
{
  "success": false,
  "contingencia": true,
  "mensagem": "SEFAZ indisponível. NF-e foi emitida em contingência offline e será reenviada automaticamente quando o serviço voltar.",
  "erroOriginal": "Erro ao comunicar com SEFAZ: ..."
}
```

### Pré-visualizar XML (sem enviar para SEFAZ)

```bash
curl -X POST http://localhost:3001/api/nfe/preview-xml \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "pedidoId": "id-do-pedido-de-venda",
    "empresaId": "uuid-da-empresa-fiscal",
    "ambiente": "2"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "validacao": {
      "valido": true,
      "erros": []
    }
  }
}
```

---

## 🔍 Testes de Consulta

### Consultar status de uma NF-e na SEFAZ

```bash
curl -X GET "http://localhost:3001/api/nfe/consultar/42191234567890123456789012345678901234567890?empresaId=uuid-da-empresa-fiscal&ambiente=2" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "situacao": "Autorizada",
    "protocolo": "<?xml version=\"1.0\"?>...",
    "codigoStatus": "100",
    "mensagem": "Autorizado o uso da NF-e"
  }
}
```

---

## 🚫 Testes de Cancelamento

### Cancelar NF-e autorizada

```bash
curl -X POST http://localhost:3001/api/nfe/cancelar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "justificativa": "Erro na digitação dos dados do cliente. Necessário cancelar e reemitir.",
    "empresaId": "uuid-da-empresa-fiscal",
    "ambiente": "2"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "status": "sucesso",
    "protocolo": "<?xml version=\"1.0\"?>...",
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "mensagem": "Cancelamento de NF-e registrado",
    "codigoStatus": "135"
  }
}
```

**⚠️ VALIDAÇÕES:**
- Justificativa deve ter no mínimo 15 caracteres
- Chave de acesso deve ter 44 dígitos
- NF-e deve estar autorizada (não pode estar cancelada)

---

## 📝 Testes de Carta de Correção (CC-e)

### Enviar Carta de Correção

```bash
curl -X POST http://localhost:3001/api/nfe/corrigir \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "textoCorrecao": "Correção do endereço do destinatário. O correto é Rua Nova, 123.",
    "sequencia": 1,
    "empresaId": "uuid-da-empresa-fiscal",
    "ambiente": "2"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "status": "sucesso",
    "protocolo": "<?xml version=\"1.0\"?>...",
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "sequencia": 1,
    "mensagem": "Carta de Correção registrada",
    "codigoStatus": "135"
  }
}
```

**⚠️ VALIDAÇÕES:**
- Texto da correção deve ter no mínimo 15 caracteres
- Sequência deve ser incremental (1, 2, 3...)
- NF-e deve estar autorizada

---

## 🚫 Testes de Inutilização

### Inutilizar faixa de numeração

```bash
curl -X POST http://localhost:3001/api/nfe/inutilizar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "empresaId": "uuid-da-empresa-fiscal",
    "ano": "2025",
    "modelo": "55",
    "serie": "1",
    "numeroInicial": "100",
    "numeroFinal": "150",
    "justificativa": "Faixa de numeração não utilizada por erro de configuração do sistema. Necessário inutilizar para evitar problemas futuros.",
    "ambiente": "2"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "status": "sucesso",
    "protocolo": "<?xml version=\"1.0\"?>...",
    "codigoStatus": "102",
    "mensagem": "Inutilização de numeração homologada"
  }
}
```

**⚠️ VALIDAÇÕES:**
- Justificativa deve ter no mínimo 15 caracteres
- Número inicial deve ser menor ou igual ao número final
- Faixa não pode estar já inutilizada
- Modelo padrão é "55" (NF-e)

---

## ✅ Testes de Manifestação do Destinatário

### Manifestar ciência/confirmação de NF-e

#### 1. Confirmar Operação (210200)

```bash
curl -X POST http://localhost:3001/api/nfe/manifestar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "empresaId": "uuid-da-empresa-fiscal",
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "tipoEvento": "210200",
    "ambiente": "2"
  }'
```

#### 2. Ciência da Operação (210210)

```bash
curl -X POST http://localhost:3001/api/nfe/manifestar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "empresaId": "uuid-da-empresa-fiscal",
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "tipoEvento": "210210",
    "ambiente": "2"
  }'
```

#### 3. Desconhecimento (210220)

```bash
curl -X POST http://localhost:3001/api/nfe/manifestar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "empresaId": "uuid-da-empresa-fiscal",
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "tipoEvento": "210220",
    "ambiente": "2"
  }'
```

#### 4. Operação não Realizada (210240) - Requer justificativa

```bash
curl -X POST http://localhost:3001/api/nfe/manifestar \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "empresaId": "uuid-da-empresa-fiscal",
    "chaveAcesso": "42191234567890123456789012345678901234567890",
    "tipoEvento": "210240",
    "justificativa": "Mercadoria não foi recebida pelo destinatário. Operação não pode ser realizada conforme combinado.",
    "ambiente": "2"
  }'
```

**Resposta esperada (todos os tipos):**
```json
{
  "success": true,
  "data": {
    "status": "sucesso",
    "protocolo": "<?xml version=\"1.0\"?>...",
    "codigoStatus": "135",
    "mensagem": "Manifestação registrada com sucesso"
  }
}
```

**⚠️ VALIDAÇÕES:**
- Chave de acesso deve ter 44 dígitos
- Para tipo "210240" (Operação não Realizada), justificativa é obrigatória (mínimo 15 caracteres)

---

## 📊 Testes de Histórico e DANFE

### Listar todas as NF-es emitidas

```bash
curl -X GET http://localhost:3001/api/nfe/notas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-da-nota",
      "numero": "100",
      "serie": "1",
      "chaveAcesso": "42191234567890123456789012345678901234567890",
      "tipo": "PRODUTO",
      "valorTotal": 1500.00,
      "status": "Autorizada",
      "dataEmissao": "2025-01-15T10:30:00Z",
      ...
    }
  ]
}
```

### Buscar NF-e específica

```bash
curl -X GET http://localhost:3001/api/nfe/notas/uuid-da-nota \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Gerar DANFE em PDF

```bash
# Abrir no navegador ou usar curl para download
curl -X GET http://localhost:3001/api/nfe/notas/uuid-da-nota/danfe \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  --output danfe.pdf
```

**Resposta esperada:** Arquivo PDF com o DANFE da NF-e.

---

## 🔄 Testes de Contingência

### Verificar status do serviço SEFAZ

O sistema verifica automaticamente o status da SEFAZ antes de enviar a NF-e. Se a SEFAZ estiver offline, a NF-e é automaticamente enfileirada para reenvio.

### Listar NF-es na fila de contingência

```bash
# Acessar diretamente no banco de dados ou criar endpoint admin
# Por enquanto, verifique os logs do worker de fila
```

### Processar fila de contingência manualmente

```bash
# No servidor, executar:
cd backend
npm run nfe:fila
```

**Log esperado:**
```
🔄 Processando fila de NF-e...
📦 Itens pendentes: 2
✅ NF-e reenviada com sucesso: chave-123
❌ Erro ao reenviar NF-e: chave-456 (tentativa 1/3)
```

---

## 🧪 Testes com Postman / Insomnia

### Coleção Postman

Você pode importar a seguinte coleção no Postman:

```json
{
  "info": {
    "name": "NF-e API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    },
    {
      "key": "empresaId",
      "value": "",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Emitir NF-e",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"pedidoId\": \"\",\n  \"empresaId\": \"{{empresaId}}\",\n  \"ambiente\": \"2\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/nfe/emitir",
          "host": ["{{baseUrl}}"],
          "path": ["api", "nfe", "emitir"]
        }
      }
    }
  ]
}
```

---

## ⚠️ Códigos de Status Comuns

| Código | Significado |
|--------|-------------|
| **100** | Autorizado o uso da NF-e |
| **102** | Inutilização de numeração homologada |
| **135** | Evento registrado e vinculado à NF-e (cancelamento/CC-e/manifestação) |
| **107** | Serviço em Operação (SEFAZ online) |
| **108** | Serviço Paralisado Momentaneamente (SEFAZ offline) |

---

## 🐛 Troubleshooting

### Erro: "Certificado digital não configurado"

**Solução:** Certifique-se de que a empresa fiscal tem um certificado digital válido cadastrado.

### Erro: "Chave de acesso inválida"

**Solução:** Verifique se a chave tem exatamente 44 dígitos numéricos.

### Erro: "Justificativa muito curta"

**Solução:** A justificativa deve ter no mínimo 15 caracteres.

### Erro: "SEFAZ indisponível"

**Solução:** 
- Verifique sua conexão com a internet
- Verifique se o ambiente está correto (homologação vs produção)
- A NF-e será automaticamente enfileirada para reenvio quando a SEFAZ voltar

---

## 📚 Referências

- [Manual de Integração do Contribuinte - NF-e 4.00](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/W8FZqJkzJs=)
- [NT 2024.001 - Contingência SVC-AN/SVC-RS](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/W8FZqJkzJs=)
- [MOC 7.0 - Modelo de Certificação](http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/W8FZqJkzJs=)

---

**Última atualização:** Janeiro 2025  
**Versão do Sistema:** 1.0.0

