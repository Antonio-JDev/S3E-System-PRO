# 📋 Análise do XML de NF-e - Comparação com Sistema Atual

## XML Analisado (Sistema Antigo)

**Chave de Acesso:** `42251216625927000157550010000002151100009462`  
**Protocolo:** `242250499209649`  
**Status:** Autorizada (cStat: 100)  
**Ambiente:** Produção (tpAmb: 1)

---

## 🔍 Comparação: Sistema Antigo vs Sistema Atual

### ✅ **CAMPOS QUE ESTÃO CORRETOS NO NOSSO SISTEMA:**

| Campo | Sistema Antigo | Nosso Sistema | Status |
|-------|----------------|---------------|--------|
| `versao` | 4.00 | 4.00 | ✅ OK |
| `xmlns` | http://www.portalfiscal.inf.br/nfe | http://www.portalfiscal.inf.br/nfe | ✅ OK |
| `cUF` | 42 | 42 | ✅ OK |
| `mod` | 55 | 55 | ✅ OK |
| `tpNF` | 1 | 1 | ✅ OK |
| `idDest` | 1 | 1 | ✅ OK |
| `tpImp` | 1 | 1 | ✅ OK |
| `tpEmis` | 1 | 1 | ✅ OK |
| `finNFe` | 1 | 1 | ✅ OK |
| `procEmi` | 0 | 0 | ✅ OK |

---

## ⚠️ **CAMPOS QUE ESTÃO FALTANDO OU DIFERENTES:**

### 1. **Grupo `<ide>` - Identificação**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `indFinal` | **1** (Consumidor final) | 0 (Não) | ⚠️ **FALTA** |
| `indPres` | **2** (Presencial) | 3 (Não presencial) | ⚠️ **DIFERENTE** |
| `indIntermed` | **0** (Não) | ❌ Não existe | ⚠️ **FALTA** |
| `verProc` | 1.00 | S3E-ERP-1.0 | ⚠️ **DIFERENTE** (OK, mas pode padronizar) |

### 2. **Grupo `<emit>` - Emitente**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `xFant` | ❌ Não tem | ✅ Tem | ✅ OK (opcional) |
| `cPais` | **1058** (Brasil) | ❌ Não tem | ⚠️ **FALTA** |
| `CRT` | **1** (Simples Nacional) | 3 (Regime Normal) | ⚠️ **DIFERENTE** |

### 3. **Grupo `<dest>` - Destinatário**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `cPais` | **1058** (Brasil) | ❌ Não tem | ⚠️ **FALTA** |
| `indIEDest` | **9** (Não contribuinte) | 1 (Contribuinte) | ⚠️ **DIFERENTE** |
| `IE` | ❌ Não tem (indIEDest=9) | ✅ Tem | ✅ OK (condicional) |

### 4. **Grupo `<autXML>` - Autorizados para Download**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `<autXML>` | **✅ Tem** (CNPJ autorizado) | ❌ Não tem | ⚠️ **FALTA** |

### 5. **Grupo `<det>` - Itens**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `cEAN` | **2000065465354** (GTIN) | "SEM GTIN" | ⚠️ **DIFERENTE** |
| `cEANTrib` | **2000065465354** | "SEM GTIN" | ⚠️ **DIFERENTE** |

### 6. **Grupo `<imposto>` - Impostos**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `vTotTrib` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `ICMSSN102` | **✅ Tem** (Simples Nacional) | ICMS00 | ⚠️ **DIFERENTE** |
| `PISOutr` | **✅ Tem** (CST 49) | PISAliq | ⚠️ **DIFERENTE** |
| `COFINSOutr` | **✅ Tem** (CST 49) | COFINSAliq | ⚠️ **DIFERENTE** |
| `IPI` | ❌ Não tem | ✅ Tem | ✅ OK (condicional) |

### 7. **Grupo `<total>` - Totais**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `vFCPUFDest` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vICMSUFDest` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vICMSUFRemet` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vFCP` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vFCPST` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vFCPSTRet` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vIPIDevol` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |
| `vTotTrib` | **0.00** | ❌ Não tem | ⚠️ **FALTA** |

### 8. **Grupo `<transp>` - Transporte**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `modFrete` | **1** (Emitente) | 9 (Sem frete) | ⚠️ **DIFERENTE** |

### 9. **Grupo `<cobr>` - Cobrança**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `<cobr>` | **✅ Tem** (Fatura + Duplicata) | ❌ Não tem | ⚠️ **FALTA** |
| `<fat>` | **✅ Tem** (Dados da fatura) | ❌ Não tem | ⚠️ **FALTA** |
| `<dup>` | **✅ Tem** (Duplicatas) | ❌ Não tem | ⚠️ **FALTA** |

### 10. **Grupo `<pag>` - Pagamento**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `indPag` | **1** (À vista) | ❌ Não tem | ⚠️ **FALTA** |
| `tPag` | **18** (Boleto) | 15 (Boleto bancário) | ⚠️ **DIFERENTE** |

### 11. **Grupo `<infAdic>` - Informações Adicionais**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `<infAdic>` | **✅ Tem** (Observações) | ❌ Não tem | ⚠️ **FALTA** |
| `<infCpl>` | **✅ Tem** (Informações complementares) | ❌ Não tem | ⚠️ **FALTA** |

### 12. **Grupo `<infRespTec>` - Responsável Técnico**

| Campo | Sistema Antigo | Nosso Sistema | Ação |
|-------|----------------|---------------|------|
| `<infRespTec>` | **✅ Tem** (CNPJ, contato, email, fone) | ❌ Não tem | ⚠️ **FALTA** |

---

## 📊 Resumo de Diferenças

### **Campos Obrigatórios Faltando:**
1. ❌ `indFinal` (Consumidor final)
2. ❌ `indPres` (Presença do comprador)
3. ❌ `indIntermed` (Operação com intermediador)
4. ❌ `cPais` (Código do país - Brasil = 1058)
5. ❌ `vTotTrib` (Valor total dos tributos)
6. ❌ `vFCPUFDest`, `vICMSUFDest`, `vICMSUFRemet` (ICMS interestadual)
7. ❌ `vFCP`, `vFCPST`, `vFCPSTRet` (Fundo de Combate à Pobreza)
8. ❌ `vIPIDevol` (IPI devolvido)
9. ❌ `indPag` (Indicador de pagamento)

### **Campos Opcionais Importantes Faltando:**
1. ⚠️ `<autXML>` (Autorizados para download)
2. ⚠️ `<cobr>` (Cobrança - Fatura e Duplicatas)
3. ⚠️ `<infAdic>` (Informações adicionais)
4. ⚠️ `<infRespTec>` (Responsável técnico)

### **Diferenças de Valores:**
1. ⚠️ `CRT` (Regime tributário) - Sistema antigo: 1 (Simples), Nosso: 3 (Normal)
2. ⚠️ `indPres` - Sistema antigo: 2 (Presencial), Nosso: 3 (Não presencial)
3. ⚠️ `modFrete` - Sistema antigo: 1 (Emitente), Nosso: 9 (Sem frete)
4. ⚠️ `tPag` - Sistema antigo: 18 (Boleto), Nosso: 15 (Boleto bancário)
5. ⚠️ Impostos - Sistema antigo usa Simples Nacional (ICMSSN102, PISOutr, COFINSOutr)

---

## 🔧 Ajustes Necessários no Código

### **Prioridade ALTA (Campos Obrigatórios):**
1. Adicionar `indFinal` e `indPres` (baseado no tipo de cliente)
2. Adicionar `indIntermed` (padrão: 0)
3. Adicionar `cPais` = 1058 (Brasil) em emitente e destinatário
4. Adicionar campos de ICMS interestadual no `<total>`
5. Adicionar `vTotTrib` em itens e totais
6. Adicionar `indPag` no grupo `<pag>`

### **Prioridade MÉDIA (Campos Importantes):**
1. Adicionar `<cobr>` (Cobrança) - Fatura e Duplicatas
2. Adicionar `<infAdic>` (Informações adicionais)
3. Adicionar `<infRespTec>` (Responsável técnico)
4. Adicionar `<autXML>` (Autorizados para download)

### **Prioridade BAIXA (Ajustes de Valores):**
1. Ajustar `CRT` baseado no regime tributário da empresa
2. Ajustar `indPres` baseado no tipo de venda
3. Ajustar `modFrete` baseado na forma de entrega
4. Ajustar `tPag` para códigos corretos
5. Ajustar impostos baseado no regime tributário (Simples vs Normal)

---

## 📝 Observações Importantes

1. **Regime Tributário:** O sistema antigo usa **Simples Nacional** (CRT=1), nosso sistema está configurado para **Regime Normal** (CRT=3). Isso afeta os impostos:
   - Simples: `ICMSSN102`, `PISOutr`, `COFINSOutr`
   - Normal: `ICMS00`, `PISAliq`, `COFINSAliq`

2. **Cobrança:** O sistema antigo tem fatura e duplicata, nosso sistema não tem.

3. **Informações Adicionais:** O sistema antigo inclui observações importantes (pedido, termo de fomento, etc.).

4. **Responsável Técnico:** O sistema antigo tem dados do responsável técnico (obrigatório em alguns casos).

---

## ✅ Próximos Passos

1. Atualizar `generateNFeXML()` para incluir campos faltantes
2. Adicionar lógica para determinar `indFinal` e `indPres`
3. Adicionar suporte a cobrança (fatura/duplicatas)
4. Adicionar informações adicionais
5. Adicionar responsável técnico
6. Ajustar impostos baseado no regime tributário

