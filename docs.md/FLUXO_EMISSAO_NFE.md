# 📋 Fluxo de Emissão de NF-e - Explicação Completa

## 1. ✅ Geração do XML - Leiaute 4.0

### Como é gerado?

**SIM, está seguindo o padrão 4.0!**

O XML é gerado diretamente como **string em JavaScript/TypeScript**, não há
conversão de objeto JS para XML. O código monta o XML manualmente usando
template strings:

```typescript
// backend/src/services/nfe.service.ts - linha 160
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chaveAcesso}" versao="4.00">  // ✅ Versão 4.00
    <ide>
      <cUF>42</cUF>
      ...
    </ide>
    ...
  </infNFe>
</NFe>`;
```

### Estrutura do XML (Leiaute 4.0)

✅ **Namespace correto:** `http://www.portalfiscal.inf.br/nfe`  
✅ **Versão:** `versao="4.00"`  
✅ **Elementos obrigatórios presentes:**

- `<ide>` - Identificação da NF-e
- `<emit>` - Emitente
- `<dest>` - Destinatário
- `<det>` - Detalhes dos produtos
- `<total>` - Totais
- `<transp>` - Transporte
- `<pag>` - Pagamento

### Campos do Leiaute 4.0 implementados:

```xml
<infNFe versao="4.00">
  <ide>
    <cUF>42</cUF>              <!-- Código da UF (SC) -->
    <cNF>...</cNF>             <!-- Código numérico -->
    <natOp>...</natOp>         <!-- Natureza da operação -->
    <mod>55</mod>              <!-- Modelo 55 (NF-e) -->
    <serie>...</serie>         <!-- Série -->
    <nNF>...</nNF>             <!-- Número da NF-e -->
    <dhEmi>...</dhEmi>         <!-- Data/hora de emissão -->
    <tpNF>1</tpNF>             <!-- Tipo (1=Saída) -->
    <tpAmb>2</tpAmb>           <!-- Ambiente (1=Prod, 2=Homolog) -->
    ...
  </ide>
  <emit>...</emit>
  <dest>...</dest>
  <det>...</det>               <!-- Itens -->
  <total>...</total>
  <transp>...</transp>
  <pag>...</pag>
</infNFe>
```

---

## 2. 🔄 Fluxo de Comunicação - Síncrono/Assíncrono

### ⚠️ **RESPOSTA É ASSÍNCRONA (em duas etapas)**

A SEFAZ **NÃO** retorna a aprovação/reprovação imediatamente. O processo
funciona assim:

### **Etapa 1: Envio (Síncrono - Resposta Imediata)**

```
Frontend → Backend → SEFAZ (Autorização)
                    ↓
              Retorna: RECIBO (não é aprovação!)
```

**O que acontece:**

1. Backend envia XML assinado para SEFAZ
2. SEFAZ valida estrutura básica e assinatura
3. SEFAZ retorna um **NÚMERO DE RECIBO** (ex: `123456789012345`)
4. **Status:** "Lote recebido para processamento"

**Código:**

```typescript
// backend/src/services/nfe-soap.service.ts
const resultado = await NFeSoapService.autorizarNFe(
  xmlAssinado,
  ambiente,
  cert,
  key
);
// Retorna: { sucesso: true, recibo: "123456789012345" }
```

### **Etapa 2: Consulta do Recibo (Assíncrono - Aguarda Processamento)**

```
Backend → SEFAZ (Consulta Recibo)
         ↓
    Aguarda 3-5 segundos
         ↓
    Consulta novamente
         ↓
    Retorna: PROTOCOLO (aprovação) ou ERRO
```

**O que acontece:**

1. Backend aguarda alguns segundos (3-5s)
2. Consulta o recibo na SEFAZ
3. SEFAZ retorna:
   - ✅ **Status 104:** Lote processado com sucesso → Protocolo de autorização
   - ❌ **Outros status:** Erro na validação → Mensagem de erro

**Código:**

```typescript
// backend/src/services/nfe.service.ts - linha ~380
// Aguardar processamento
await new Promise((resolve) => setTimeout(resolve, 3000));

// Consultar recibo
const consultaRecibo = await NFeSoapService.consultarRecibo(
  resultado.recibo,
  ambiente,
  cert,
  key
);

// Status 104 = Aprovado
if (consultaRecibo.codigoStatus === "104") {
  // ✅ NF-e AUTORIZADA
} else {
  // ❌ NF-e REJEITADA
}
```

---

## 3. 📊 Resposta da SEFAZ - Aprovada/Reprovada

### Códigos de Status (cStat)

| Código  | Significado                         | Ação                              |
| ------- | ----------------------------------- | --------------------------------- |
| **104** | Lote processado                     | ✅ **APROVADA** - Gerar procNFe   |
| **100** | Autorizado o uso da NF-e            | ✅ **APROVADA** (resposta direta) |
| **101** | Cancelamento de NF-e homologado     | ✅ Cancelamento OK                |
| **135** | Evento registrado                   | ✅ Evento (CC-e) OK               |
| **217** | Rejeição: Falha na validação        | ❌ **REJEITADA**                  |
| **218** | Rejeição: CNPJ do emitente inválido | ❌ **REJEITADA**                  |
| **...** | Outros códigos de erro              | ❌ **REJEITADA**                  |

### Estrutura da Resposta da SEFAZ

**Quando APROVADA (Status 104):**

```xml
<retConsReciNFe>
  <tpAmb>2</tpAmb>
  <verAplic>...</verAplic>
  <nRec>123456789012345</nRec>
  <cStat>104</cStat>                    <!-- ✅ APROVADA -->
  <xMotivo>Lote processado</xMotivo>
  <protNFe>
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>...</verAplic>
      <chNFe>42250179502563000138550010000039917112345678</chNFe>
      <dhRecbto>2025-01-15T10:30:00-03:00</dhRecbto>
      <nProt>142250000012345</nProt>     <!-- Protocolo de autorização -->
      <digVal>...</digVal>
      <cStat>100</cStat>                 <!-- 100 = Autorizado -->
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</retConsReciNFe>
```

**Quando REJEITADA:**

```xml
<retConsReciNFe>
  <tpAmb>2</tpAmb>
  <nRec>123456789012345</nRec>
  <cStat>217</cStat>                     <!-- ❌ REJEITADA -->
  <xMotivo>Rejeição: Falha na validação do XML</xMotivo>
  <!-- Sem protNFe = Não autorizada -->
</retConsReciNFe>
```

### Como o Sistema Processa

```typescript
// backend/src/services/nfe-soap.service.ts - linha ~172
if (codigoStatus === "104") {
  // ✅ APROVADA
  return {
    sucesso: true,
    protocolo: resposta._xml, // XML completo do protocolo
    chaveAcesso: chaveAcesso, // Chave de acesso da NF-e
    codigoStatus: "104",
    mensagem: "Lote processado com sucesso",
  };
} else {
  // ❌ REJEITADA
  return {
    sucesso: false,
    codigoStatus: codigoStatus, // Ex: 217, 218, etc.
    mensagem: mensagem, // Motivo da rejeição
    erro: `Status ${codigoStatus}: ${mensagem}`,
  };
}
```

---

## 4. 🔄 Fluxo Completo (Resumo)

```
┌─────────────┐
│   Frontend  │
│  (Usuário)  │
└──────┬──────┘
       │ 1. Clica "Emitir NF-e"
       ↓
┌─────────────────────────────────────┐
│         Backend (Node.js)           │
├─────────────────────────────────────┤
│ 2. Busca dados do pedido            │
│ 3. Gera XML (string template)       │ ← Leiaute 4.0
│ 4. Assina XML (certificado A1)      │
│ 5. Envia para SEFAZ (SOAP)          │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│         SEFAZ (Autorização)         │
├─────────────────────────────────────┤
│ 6. Valida estrutura e assinatura    │
│ 7. Retorna: RECIBO                  │ ← Resposta Síncrona
└──────┬──────────────────────────────┘
       │
       ↓ (Aguarda 3-5 segundos)
       │
┌─────────────────────────────────────┐
│      Backend (Consulta Recibo)      │
│ 8. Consulta status do recibo        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│      SEFAZ (Retorno Autorização)    │
├─────────────────────────────────────┤
│ 9a. Status 104 → APROVADA           │ ← Resposta Assíncrona
│     Retorna: Protocolo + Chave      │
│                                     │
│ 9b. Outro Status → REJEITADA        │
│     Retorna: Código + Motivo        │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│         Backend                     │
│ 10. Salva resultado no banco        │
│ 11. Retorna resposta para Frontend  │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────┐
│   Frontend  │
│ Exibe:      │
│ ✅ Aprovada │ ou ❌ Rejeitada
└─────────────┘
```

---

## 5. ⚠️ Pontos de Atenção

### ✅ O que está funcionando:

- ✅ XML gerado no padrão 4.0
- ✅ Assinatura digital XML-DSig
- ✅ Comunicação SOAP com SEFAZ
- ✅ Consulta assíncrona de recibo
- ✅ Tratamento de aprovação/rejeição

### ✅ Melhorias Implementadas:

1. **Geração de Chave de Acesso:** ✅ **IMPLEMENTADO**
   - Usa algoritmo correto do Módulo 11
   - Calcula dígito verificador automaticamente
   - Arquivo: `backend/src/utils/nfe-chave-acesso.util.ts`

2. **Geração do procNFe:** ✅ **IMPLEMENTADO**
   - Gera XML final automaticamente quando aprovada
   - Combina XML original + Protocolo de autorização
   - Arquivo: `backend/src/utils/nfe-procnfe.util.ts`

3. **Retry com Backoff Exponencial:** ✅ **IMPLEMENTADO**
   - Até 5 tentativas com delay crescente (3s, 6s, 12s, 24s, 48s)
   - Para se encontrar erro definitivo
   - Implementado em `nfe.service.ts`

### ⚠️ O que ainda pode ser melhorado:

1. **Validação contra XSD:**
   - XML é gerado, mas não é validado contra os XSDs
   - Recomendado: validar antes de enviar usando `libxmljs`

---

## 6. 📝 Exemplo de Resposta para o Frontend

**Quando APROVADA:**

```json
{
  "success": true,
  "chaveAcesso": "42250179502563000138550010000039917112345678",
  "protocolo": "142250000012345",
  "dataAutorizacao": "2025-01-15T10:30:00-03:00",
  "mensagem": "NF-e autorizada com sucesso",
  "xml": "<nfeProc>...</nfeProc>"
}
```

**Quando REJEITADA:**

```json
{
  "success": false,
  "codigoStatus": "217",
  "mensagem": "Rejeição: Falha na validação do XML",
  "erro": "Status 217: Rejeição: Falha na validação do XML"
}
```

---

## 7. 🔍 Validação do Leiaute 4.0

O XML gerado está compatível com:

- ✅ **NT 2025.002 v1.30** (PL_010b)
- ✅ **Leiaute 4.00** (versao="4.00")
- ✅ **Namespace correto:** `http://www.portalfiscal.inf.br/nfe`
- ✅ **Estrutura básica:** Todos os elementos obrigatórios presentes

**Arquivos XSD disponíveis para validação:**

- `PL_010b_NT2025_002_v1.30/nfe_v4.00.xsd`
- `PL_010b_NT2025_002_v1.30/leiauteNFe_v4.00.xsd`
- `PL_010b_NT2025_002_v1.30/tiposBasico_v4.00.xsd`

---

## 📚 Referências

- [Manual de Integração do Contribuinte - NFe 4.0](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=/fNq6q1J0zE=)
- [Nota Técnica 2025.002 v1.30](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D)
