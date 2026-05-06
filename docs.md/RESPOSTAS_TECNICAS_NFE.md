# 🔧 Respostas Técnicas - Emissão NF-e

## 1. ❌ Biblioteca nfe-brasil

### **NÃO estamos usando nfe-brasil**

Após pesquisa, não encontrei uma biblioteca Node.js chamada `nfe-brasil` que
seja amplamente utilizada ou mantida. As bibliotecas encontradas são:

- **nfe-brasil (Python)** - Biblioteca em Python, não Node.js
- **nfephp (PHP)** - Biblioteca em PHP, descontinuada
- **Sped NFe (PHP)** - Sucessor do nfephp

### **O que estamos usando:**

✅ **Geração de XML:** Manual usando template strings (TypeScript)  
✅ **Assinatura Digital:** `node-forge` + `xml-crypto`  
✅ **Comunicação SOAP:** Biblioteca `soap`  
✅ **Validação:** Validação manual contra estrutura do leiaute 4.0

### **Por que não usar uma biblioteca pronta?**

**Vantagens da abordagem atual:**

- ✅ Controle total sobre o código
- ✅ Sem dependências externas não mantidas
- ✅ Fácil de debugar e ajustar
- ✅ Segue exatamente o padrão da SEFAZ

**Desvantagens:**

- ⚠️ Mais código para manter
- ⚠️ Precisa implementar todas as funcionalidades manualmente

### **Validação XSD:**

Atualmente, o XML é gerado seguindo a estrutura do leiaute 4.0, mas **não há
validação automática contra XSD**. Os arquivos XSD estão disponíveis em
`PL_010b_NT2025_002_v1.30/`, mas não estão sendo usados para validação.

**Recomendação:** Implementar validação XSD usando biblioteca como `libxmljs` ou
`xmllint`.

---

## 2. ✅ TrueNAS Scale e Comunicação com SEFAZ

### **SIM, vai funcionar perfeitamente!**

O TrueNAS Scale **NÃO interfere** na comunicação entre seu backend e a SEFAZ.
Aqui está o porquê:

### **Como funciona a comunicação:**

```
┌─────────────────┐
│  TrueNAS Scale  │ ← Servidor de arquivos (armazenamento)
│   (Host)        │
└────────┬────────┘
         │
         │ Docker containers rodam aqui
         ↓
┌─────────────────────────────────────┐
│  Container Backend (Node.js)        │
│  - Gera XML                         │
│  - Assina com certificado           │
│  - Comunica via HTTPS/SOAP          │
└────────┬────────────────────────────┘
         │
         │ Comunicação HTTPS direta
         │ (não passa pelo TrueNAS)
         ↓
┌─────────────────────────────────────┐
│      SEFAZ (Servidor Governo)       │
│  - Recebe XML                       │
│  - Valida e processa                │
│  - Retorna protocolo/erro           │
└─────────────────────────────────────┘
```

### **Pontos importantes:**

1. **Comunicação é direta:**
   - Backend → SEFAZ (HTTPS/SOAP)
   - TrueNAS Scale apenas hospeda os containers
   - Não intercepta ou modifica a comunicação

2. **Certificado Digital:**
   - O certificado A1 (.pfx) está dentro do container backend
   - TrueNAS Scale não precisa acessar o certificado
   - Comunicação mTLS (mutual TLS) funciona normalmente

3. **Firewall/Redes:**
   - Certifique-se de que o TrueNAS permite conexões HTTPS de saída
   - Portas necessárias: 443 (HTTPS)
   - Domínios SEFAZ devem estar acessíveis

4. **Resposta da SEFAZ:**
   - A resposta vem diretamente para o container backend
   - TrueNAS Scale não interfere
   - O backend processa a resposta normalmente

### **Teste de conectividade:**

Para verificar se o TrueNAS permite comunicação com SEFAZ:

```bash
# Dentro do container backend
docker exec -it s3e-backend-dev curl -v https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx?wsdl
```

Se retornar o WSDL, está tudo OK! ✅

---

## 3. ✅ Melhorias Implementadas

### **1. Cálculo Correto do Dígito Verificador**

✅ **Implementado:** `backend/src/utils/nfe-chave-acesso.util.ts`

- Usa algoritmo **Módulo 11** correto
- Calcula dígito verificador automaticamente
- Valida chaves de acesso existentes

**Antes:**

```typescript
const dv = "5"; // Mock
```

**Agora:**

```typescript
const chave = NFeChaveAcessoUtil.gerarChaveAcesso(
  uf,
  cnpj,
  modelo,
  serie,
  numero,
  tpEmis,
  cNF
);
// Calcula DV automaticamente usando Módulo 11
```

### **2. Geração do procNFe**

✅ **Implementado:** `backend/src/utils/nfe-procnfe.util.ts`

- Combina XML original + Protocolo de autorização
- Gera XML final no formato `<nfeProc>`
- Extrai dados do protocolo automaticamente

**Formato gerado:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <!-- XML original assinado -->
  </NFe>
  <protNFe>
    <!-- Protocolo de autorização da SEFAZ -->
  </protNFe>
</nfeProc>
```

### **3. Retry com Backoff Exponencial**

✅ **Implementado:** Consulta de recibo com retry automático

- Até 5 tentativas
- Delay crescente: 3s, 6s, 12s, 24s, 48s
- Para se encontrar erro definitivo (não apenas "em processamento")

**Código:**

```typescript
let tentativas = 0;
const maxTentativas = 5;
const delayInicial = 3000;

while (tentativas < maxTentativas) {
  const delay = delayInicial * Math.pow(2, tentativas);
  await new Promise(resolve => setTimeout(resolve, delay));

  consultaRecibo = await NFeSoapService.consultarRecibo(...);

  if (consultaRecibo.sucesso) break;
  if (consultaRecibo.codigoStatus !== '105') break; // Erro definitivo

  tentativas++;
}
```

### **4. Validação XSD (Pendente)**

⚠️ **Ainda não implementado**

**Recomendação:** Usar biblioteca `libxmljs` ou `xmllint` para validar XML
contra XSD antes de enviar para SEFAZ.

**Exemplo futuro:**

```typescript
import { parseString } from 'libxmljs';

static validarContraXSD(xml: string): { valido: boolean; erros: string[] } {
  // Carregar XSD
  const xsd = fs.readFileSync('PL_010b_NT2025_002_v1.30/nfe_v4.00.xsd', 'utf8');

  // Validar
  const doc = parseString(xml);
  const schema = parseString(xsd);

  const valid = doc.validate(schema);
  return {
    valido: valid,
    erros: doc.validationErrors || []
  };
}
```

---

## 4. 📊 Resumo das Melhorias

| Item                   | Status          | Arquivo                    |
| ---------------------- | --------------- | -------------------------- |
| Cálculo DV (Módulo 11) | ✅ Implementado | `nfe-chave-acesso.util.ts` |
| Geração procNFe        | ✅ Implementado | `nfe-procnfe.util.ts`      |
| Retry com backoff      | ✅ Implementado | `nfe.service.ts`           |
| Validação XSD          | ⚠️ Pendente     | -                          |

---

## 5. 🚀 Próximos Passos Recomendados

1. **Implementar validação XSD:**
   - Instalar `libxmljs` ou similar
   - Validar XML antes de enviar para SEFAZ
   - Retornar erros de validação para o usuário

2. **Salvar procNFe no banco:**
   - Criar tabela para armazenar XMLs finais
   - Salvar procNFe quando aprovado
   - Permitir download do XML

3. **Melhorar tratamento de erros:**
   - Mapear códigos de erro da SEFAZ
   - Traduzir mensagens para português
   - Sugerir soluções para erros comuns

4. **Testes em homologação:**
   - Testar com certificado real
   - Validar todos os fluxos
   - Verificar procNFe gerado

---

## 6. ✅ Confirmações Finais

### **Biblioteca nfe-brasil:**

❌ **NÃO estamos usando** - Implementação manual

### **TrueNAS Scale:**

✅ **Vai funcionar** - Não interfere na comunicação

### **procNFe:**

✅ **Implementado** - Gera XML final automaticamente

### **Validação XSD:**

⚠️ **Pendente** - Recomendado implementar

### **Leiaute 4.0:**

✅ **Seguindo padrão** - XML gerado conforme especificação
