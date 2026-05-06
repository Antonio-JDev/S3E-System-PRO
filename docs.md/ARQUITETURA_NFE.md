# 📋 Arquitetura de Emissão de NF-e - Análise Completa

## 🏗️ Visão Geral da Arquitetura

A arquitetura de emissão de NF-e foi implementada seguindo o padrão **MVC
(Model-View-Controller)** com separação de responsabilidades em camadas:

```
Frontend (React/TypeScript)
    ↓ HTTP/REST
Backend (Express/TypeScript)
    ├── Routes (Rotas HTTP)
    ├── Controllers (Lógica de requisições)
    ├── Services (Lógica de negócio)
    └── Models (Prisma ORM)
        ↓
    PostgreSQL Database
```

---

## 📦 Bibliotecas Utilizadas

### Backend - Dependências Principais

#### 1. **XML Processing**

- **`fast-xml-parser`** (v5.3.2)
  - **Uso:** Parsing e geração de XML da NF-e
  - **Localização:** `backend/src/controllers/comprasController.ts` (para
    parsing de XML recebido)
  - **Função:** Converter XML string para objeto JavaScript e vice-versa

- **`xml2js`** (v0.6.2)
  - **Uso:** Alternativa para parsing de XML (comentado/backup)
  - **Status:** Instalado mas não utilizado ativamente

#### 2. **Assinatura Digital (Planejado/Mock)**

- **`xml-crypto`** (comentado)
  - **Uso previsto:** Assinatura digital do XML com certificado A1
  - **Status:** Não instalado, apenas referenciado em comentários
  - **Necessário para produção:** Sim

- **`node-forge`** (comentado)
  - **Uso previsto:** Extrair chave privada do certificado PFX
  - **Status:** Não instalado, apenas referenciado em comentários
  - **Necessário para produção:** Sim

#### 3. **Comunicação SOAP (Planejado/Mock)**

- **`soap`** (comentado)
  - **Uso previsto:** Comunicação com webservices da SEFAZ via SOAP
  - **Status:** Não instalado, apenas referenciado em comentários
  - **Necessário para produção:** Sim

#### 4. **Criptografia**

- **`bcryptjs`** (v3.0.2)
  - **Uso:** Criptografar senha do certificado digital antes de salvar no banco
  - **Localização:** `backend/src/controllers/configFiscalController.ts`
  - **Função:** Hash da senha do certificado com salt rounds = 10

#### 5. **ORM e Banco de Dados**

- **`@prisma/client`** (v6.17.1)
  - **Uso:** Acesso ao banco de dados PostgreSQL
  - **Modelos relacionados:**
    - `NotaFiscal` - Armazena dados da NF-e emitida
    - `EmpresaFiscal` - Armazena configurações fiscais e certificados

#### 6. **Framework Web**

- **`express`** (v4.18.2)
  - **Uso:** Servidor HTTP e rotas REST
  - **Middleware:** Autenticação JWT e autorização RBAC

---

## 🗂️ Estrutura de Arquivos

### Backend

```
backend/
├── src/
│   ├── controllers/
│   │   ├── nfeController.ts          # Controladores HTTP
│   │   └── configFiscalController.ts  # Configurações fiscais
│   ├── services/
│   │   └── nfe.service.ts             # Lógica de negócio NF-e
│   ├── routes/
│   │   ├── nfe.routes.ts              # Rotas específicas (emitir, cancelar, etc)
│   │   └── nfe.ts                     # Rotas CRUD básicas
│   └── app.ts                         # Registro de rotas
├── prisma/
│   └── schema.prisma                   # Modelos: NotaFiscal, EmpresaFiscal
└── data/
    └── certificados/                   # Armazenamento seguro de .pfx
```

### Frontend

```
frontend/
├── src/
│   ├── services/
│   │   ├── nfeService.ts              # Cliente HTTP para APIs NF-e
│   │   └── nfeFiscalService.ts        # Serviços fiscais
│   └── components/
│       └── [Componentes de UI para NF-e]
```

---

## 🔄 Fluxo de Emissão de NF-e

### 1. **Preparação (Configuração Inicial)**

```
Usuário Admin
    ↓
Frontend: Upload certificado .pfx
    ↓
POST /api/configuracoes-fiscais
    ↓
Backend:
  - Recebe certificado em Base64
  - Decodifica e salva em /data/certificados/
  - Criptografa senha com bcrypt
  - Salva no banco (EmpresaFiscal)
```

### 2. **Processo de Emissão**

```
POST /api/nfe/emitir
{
  pedidoId: "uuid",
  empresaId: "uuid"
}
    ↓
NFeController.emitirNFe()
    ↓
NFeService.processarEmissao()
    ↓
[1] Buscar dados da empresa (EmpresaFiscal)
[2] Buscar dados do pedido (mockSalesOrder)
[3] Gerar XML da NF-e (generateNFeXML)
[4] Assinar XML (signXML) - MOCK
[5] Enviar para SEFAZ (emitirNFe) - MOCK
[6] Salvar no banco (NotaFiscal)
    ↓
Retorna: chaveAcesso, protocolo, XML
```

---

## 📄 Geração do XML da NF-e

### Estrutura do XML (NF-e 4.0)

O XML é gerado manualmente como string no método `generateNFeXML()`:

```typescript
// Estrutura básica:
<NFe>
  <infNFe>
    <ide>          // Identificação
    <emit>         // Emitente (empresa)
    <dest>         // Destinatário (cliente)
    <det>          // Itens (produtos)
    <total>        // Totais e impostos
    <transp>       // Transporte
    <pag>          // Pagamento
  </infNFe>
  <Signature>     // Assinatura digital (XML-DSig)
</NFe>
```

### Componentes do XML:

1. **Identificação (ide)**
   - UF, modelo (55), série, número
   - Data/hora de emissão
   - Tipo de operação, ambiente (homologação/produção)

2. **Emitente (emit)**
   - CNPJ, razão social, nome fantasia
   - Endereço completo
   - Inscrição estadual
   - Regime tributário (CRT)

3. **Destinatário (dest)**
   - CNPJ, razão social
   - Endereço completo
   - Inscrição estadual

4. **Itens (det)**
   - Código do produto, descrição, NCM, CFOP
   - Quantidade, unidade, valores
   - Impostos (ICMS, IPI, PIS, COFINS)

5. **Totais (total)**
   - Valor dos produtos
   - Valores de impostos
   - Valor total da NF

6. **Assinatura (Signature)**
   - XML-DSig padrão W3C
   - Atualmente MOCK (não assinado de verdade)

---

## 🔐 Segurança e Certificado Digital

### Armazenamento do Certificado

**Localização:**

```
backend/data/certificados/
├── 12345678000190_1697398400000.pfx
└── 98765432000100_1697398500000.pfx
```

**Segurança:**

- ✅ Arquivo salvo com nome único: `CNPJ_timestamp.pfx`
- ✅ Senha criptografada com bcrypt (hash no banco)
- ✅ Path do arquivo salvo no banco (não o arquivo em si)
- ✅ Diretório não versionado (`.gitignore`)

### Modelo de Dados (EmpresaFiscal)

```prisma
model EmpresaFiscal {
  id                  String    @id
  cnpj                String    @unique
  certificadoPath     String?   // Path do .pfx
  certificadoSenha    String?   // Hash bcrypt
  certificadoValidade DateTime? // Data de expiração
  // ... outros campos
}
```

---

## 🌐 Integração com SEFAZ

### Status Atual: MOCK

A integração com SEFAZ está **mockada** (simulada). Em produção, seria
necessário:

1. **Biblioteca SOAP:**

   ```typescript
   import * as soap from "soap";

   const client = await soap.createClient(wsdlUrl, {
     wsdl_options: {
       // Configurações de certificado para mTLS
     },
   });
   ```

2. **URLs dos WebServices:**
   - **Homologação:** `https://nfe-homologacao.svrs.rs.gov.br/ws/...`
   - **Produção:** `https://nfe.svrs.rs.gov.br/ws/...`

3. **Métodos SOAP:**
   - `NFeAutorizacao4` - Autorizar NF-e
   - `NFeRetAutorizacao4` - Consultar status
   - `RecepcaoEvento4` - Cancelar/CC-e

### Processo Real (Planejado):

```
XML Assinado
    ↓
SOAP Request (mTLS com certificado)
    ↓
SEFAZ WebService
    ↓
Resposta: Protocolo de autorização
    ↓
Salvar protocolo no banco
```

---

## 📊 Modelo de Dados - NotaFiscal

```prisma
model NotaFiscal {
  id              String   @id
  projetoId       String?  // Relacionamento com projeto
  empresaFiscalId String?  // CNPJ emissor
  numero          String   @unique
  serie           String
  chaveAcesso     String?  @unique  // 44 dígitos
  tipo            String   // PRODUTO, SERVICO
  natureza        String   // Natureza da operação
  cfop            String   // Código Fiscal de Operação
  valorProdutos   Float
  valorServicos   Float
  valorTotal      Float
  dataEmissao     DateTime
  status          String   // Pendente, Autorizada, Cancelada
  xmlNFe          String?  // XML completo (gerado/autorizado)
  observacoes     String?
}
```

---

## 🛣️ Rotas da API

### Rotas de NF-e (`/api/nfe`)

| Método | Rota                        | Descrição              | Autenticação     |
| ------ | --------------------------- | ---------------------- | ---------------- |
| GET    | `/api/nfe`                  | Listar NF-es           | ✅ Auth          |
| GET    | `/api/nfe/:id`              | Buscar NF-e            | ✅ Auth          |
| POST   | `/api/nfe/emitir`           | Emitir NF-e (SEFAZ)    | ✅ Admin/Gerente |
| POST   | `/api/nfe/cancelar`         | Cancelar NF-e          | ✅ Admin/Gerente |
| POST   | `/api/nfe/corrigir`         | Carta de Correção      | ✅ Admin/Gerente |
| GET    | `/api/nfe/consultar/:chave` | Consultar na SEFAZ     | ✅ Admin/Gerente |
| POST   | `/api/nfe/config`           | Configurar certificado | ✅ Admin         |

### Rotas de Configuração Fiscal (`/api/configuracoes-fiscais`)

| Método | Rota                             | Descrição       | Autenticação     |
| ------ | -------------------------------- | --------------- | ---------------- |
| GET    | `/api/configuracoes-fiscais`     | Listar empresas | ✅ Admin/Gerente |
| POST   | `/api/configuracoes-fiscais`     | Criar empresa   | ✅ Admin         |
| PUT    | `/api/configuracoes-fiscais/:id` | Atualizar       | ✅ Admin         |
| DELETE | `/api/configuracoes-fiscais/:id` | Deletar         | ✅ Admin         |

---

## 🔧 Funcionalidades Implementadas

### ✅ Implementado (Funcional)

1. **Geração de XML NF-e 4.0**
   - Estrutura completa conforme layout
   - Emitente, destinatário, produtos
   - Cálculo de impostos (ICMS, IPI, PIS, COFINS)
   - Geração de chave de acesso (simplificada)

2. **Gestão de Empresas Fiscais**
   - CRUD completo de empresas
   - Upload e armazenamento seguro de certificados
   - Criptografia de senhas

3. **Estrutura de Cancelamento**
   - Geração de XML de cancelamento
   - Validação de justificativa (mín. 15 caracteres)

4. **Estrutura de Carta de Correção**
   - Geração de XML de CC-e
   - Suporte a múltiplas sequências

### ⚠️ Mockado (Não Funcional em Produção)

1. **Assinatura Digital**
   - XML assinado com valores MOCK
   - Não usa certificado real
   - Não valida contra SEFAZ

2. **Comunicação SEFAZ**
   - Respostas mockadas
   - Não envia realmente para SEFAZ
   - Não valida XML

3. **Validação de Certificado**
   - Não valida se .pfx é válido
   - Não extrai data de validade real
   - Não verifica CNPJ do certificado

---

## 📚 Bibliotecas Necessárias para Produção

### Para Implementar em Produção:

1. **`xml-crypto`** ou **`xmldom` + `node-forge`**

   ```bash
   npm install xml-crypto xmldom node-forge
   ```

   - **Uso:** Assinar XML com certificado A1
   - **Função:** Implementar XML-DSig corretamente

2. **`soap`** ou **`axios` com SOAP**

   ```bash
   npm install soap
   ```

   - **Uso:** Comunicação com webservices SEFAZ
   - **Função:** Enviar XML assinado e receber protocolo

3. **`node-forge`**

   ```bash
   npm install node-forge @types/node-forge
   ```

   - **Uso:** Extrair chave privada do PFX
   - **Função:** Ler certificado .pfx e extrair dados

4. **`moment`** ou **`date-fns`**

   ```bash
   npm install moment
   ```

   - **Uso:** Formatação de datas no formato SEFAZ
   - **Função:** Garantir formato correto de datas

---

## 🎯 Arquitetura de Camadas

### 1. **Camada de Apresentação (Frontend)**

- React/TypeScript
- Componentes de UI para emissão
- Formulários de configuração fiscal
- Visualização de NF-es emitidas

### 2. **Camada de API (Backend - Routes)**

- Express Router
- Middleware de autenticação
- Middleware de autorização (RBAC)
- Validação de entrada

### 3. **Camada de Controle (Controllers)**

- `NFeController` - Lógica de requisições HTTP
- Validação de parâmetros
- Tratamento de erros
- Respostas formatadas

### 4. **Camada de Serviço (Services)**

- `NFeService` - Lógica de negócio
- Geração de XML
- Assinatura digital
- Comunicação SEFAZ
- Validações fiscais

### 5. **Camada de Dados (Models)**

- Prisma ORM
- Modelos: `NotaFiscal`, `EmpresaFiscal`
- Queries e transações
- Validações de schema

---

## 🔄 Fluxo de Dados Completo

```
[Frontend]
  ↓ POST /api/nfe/emitir
[Routes] → Autenticação → Autorização
  ↓
[Controller] → Validação de entrada
  ↓
[Service] → Buscar empresa fiscal
  ↓
[Service] → Buscar dados do pedido
  ↓
[Service] → Gerar XML NF-e
  ↓
[Service] → Assinar XML (MOCK)
  ↓
[Service] → Enviar SEFAZ (MOCK)
  ↓
[Service] → Salvar no banco
  ↓
[Controller] → Retornar resposta
  ↓
[Frontend] → Exibir resultado
```

---

## 🚧 O que Precisa ser Implementado para Produção

### 1. **Assinatura Digital Real**

```typescript
// Substituir mock por implementação real
import * as xmlCrypto from 'xml-crypto';
import * as forge from 'node-forge';

async signXML(xml: string, pfxPath: string, password: string) {
  // 1. Ler arquivo PFX
  // 2. Extrair chave privada com node-forge
  // 3. Assinar XML com xml-crypto
  // 4. Retornar XML assinado
}
```

### 2. **Comunicação SOAP Real**

```typescript
// Substituir mock por SOAP real
import * as soap from 'soap';

async emitirNFe(xmlAssinado: string, certificado: Certificado) {
  const client = await soap.createClient(wsdlUrl, {
    wsdl_options: {
      // Configurar certificado para mTLS
    }
  });

  const resultado = await client.NFeAutorizacao4({
    nfeDadosMsg: xmlAssinado
  });

  return resultado;
}
```

### 3. **Validação de Certificado**

```typescript
// Validar certificado ao fazer upload
import * as forge from 'node-forge';

async validarCertificado(pfxBase64: string, senha: string, cnpj: string) {
  // 1. Decodificar Base64
  // 2. Ler PFX com node-forge
  // 3. Verificar senha
  // 4. Extrair CNPJ do certificado
  // 5. Comparar com CNPJ informado
  // 6. Extrair data de validade
  // 7. Retornar validação
}
```

### 4. **Geração Correta de Chave de Acesso**

```typescript
// Implementar algoritmo completo com dígito verificador
private gerarChaveAcesso(...): string {
  // 1. Montar chave de 43 dígitos
  // 2. Calcular dígito verificador (módulo 11)
  // 3. Retornar chave de 44 dígitos
}
```

---

## 📝 Resumo das Bibliotecas

### ✅ Instaladas e Usadas:

- `fast-xml-parser` - Parsing de XML
- `bcryptjs` - Criptografia de senhas
- `@prisma/client` - ORM
- `express` - Framework web

### ⚠️ Comentadas (Não Instaladas):

- `xml-crypto` - Assinatura digital
- `soap` - Comunicação SEFAZ
- `node-forge` - Manipulação de certificados

### 📦 Necessárias para Produção:

1. `xml-crypto` ou `xmldom` + `node-forge`
2. `soap` ou `axios` com SOAP
3. `node-forge` (obrigatório)
4. `moment` ou `date-fns` (opcional, mas recomendado)

---

## 🎓 Conclusão

A arquitetura está **bem estruturada** e **preparada para evolução**, mas
atualmente está em **modo MOCK** para desenvolvimento. Para produção, é
necessário:

1. ✅ Instalar bibliotecas de assinatura e SOAP
2. ✅ Implementar assinatura digital real
3. ✅ Implementar comunicação SOAP com SEFAZ
4. ✅ Validar certificados digitalmente
5. ✅ Implementar tratamento de erros da SEFAZ
6. ✅ Adicionar logs e auditoria completos

A base está sólida e a estrutura permite essa evolução sem grandes refatorações!
🚀
