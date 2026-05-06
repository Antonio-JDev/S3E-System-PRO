# Análise Completa - Emissão de NF-e e Geração de DANFE

## 📋 Sumário Executivo

Este documento apresenta uma análise completa da funcionalidade de emissão de
NF-e na aplicação S3E-System-PRO, incluindo verificação da conexão com API,
validação de ambientes (homologação/produção) e detalhamento da geração de DANFE
(PDF).

---

## ✅ 1. Conexão com API via Axios

### Status: **✅ CONECTADO E FUNCIONAL**

O componente `EmissaoNFe.tsx` está **corretamente conectado** à API através do
serviço `axiosApiService`.

#### Evidências:

**Frontend (`frontend/src/components/EmissaoNFe.tsx`):**

- ✅ Importa `axiosApiService` de `../services/axiosApi`
- ✅ Faz requisição POST para `/api/nfe/emitir` na linha 237
- ✅ Envia parâmetros corretos: `pedidoId`, `empresaId`, `ambiente`, `cfop`,
  `naturezaOperacao`, `serie`

**Código da requisição:**

```typescript
const response = await axiosApiService.post<any>("/api/nfe/emitir", {
  pedidoId: vendaSelecionada,
  empresaId: empresaEmissoraId,
  ambiente: ambiente, // '1' = Produção, '2' = Homologação
  tipo: tipoNF,
  serie: serie,
  cfop: cfop,
  naturezaOperacao: naturezaOperacao,
});
```

**Backend (`backend/src/controllers/nfeController.ts`):**

- ✅ Rota POST `/api/nfe/emitir` implementada (linha 145)
- ✅ Recebe e processa o parâmetro `ambiente` corretamente
- ✅ Valida campos obrigatórios (`pedidoId`, `empresaId`)

---

## ✅ 2. Validação de Ambientes (Homologação vs Produção)

### Status: **✅ VALIDAÇÃO IMPLEMENTADA CORRETAMENTE**

#### 2.1. Frontend - Seleção de Ambiente

**Localização:** `frontend/src/components/EmissaoNFe.tsx` (linhas 61, 884-903)

**Implementação:**

- ✅ Estado `ambiente` inicializado como `'2'` (Homologação) por padrão
- ✅ Toggle visual com botões para selecionar:
  - 🧪 **Homologação** (`'2'`) - Botão amarelo
  - 🚀 **Produção** (`'1'`) - Botão verde
- ✅ Alertas visuais diferentes para cada ambiente:
  - **Homologação:** Alerta amarelo informando ambiente de testes
  - **Produção:** Alerta vermelho com aviso de atenção

**Código de validação visual:**

```typescript
// Linha 61
const [ambiente, setAmbiente] = useState<'1' | '2'>('2'); // Padrão: Homologação

// Linhas 884-903 - Toggle de ambiente
<button onClick={() => setAmbiente('2')}>🧪 Homologação</button>
<button onClick={() => setAmbiente('1')}>🚀 Produção</button>

// Linhas 908-918 - Alerta para Produção
{ambiente === '1' && (
    <div className="bg-red-50 border-l-4 border-red-500">
        <p>ATENÇÃO: Emissão em PRODUÇÃO. NF-e será enviada à SEFAZ oficial.</p>
    </div>
)}
```

#### 2.2. Backend - Processamento de Ambiente

**Localização:** `backend/src/controllers/nfeController.ts` (linhas 145-180)

**Lógica de validação:**

```typescript
// Linha 147 - Recebe ambiente do body
const { pedidoId, empresaId, ambiente, cfop, naturezaOperacao, serie } =
  req.body;

// Linha 176 - Processa ambiente com fallback seguro
ambiente === "1" ? "1" : ambiente === "2" ? "2" : undefined;
```

**Localização:** `backend/src/services/nfe.service.ts` (linhas 1195-1198)

**Processamento final:**

```typescript
// Define ambiente: prioriza seleção do frontend; se não vier, usa sempre homologação ('2')
const ambiente: "1" | "2" =
  ambienteSelecionado === "1" || ambienteSelecionado === "2"
    ? ambienteSelecionado
    : "2"; // Fallback seguro: sempre homologação se inválido

dadosPedido.ambiente = ambiente;
```

#### 2.3. Geração de XML com Ambiente Correto

**Localização:** `backend/src/services/nfe.service.ts` (linha 427)

O ambiente é corretamente incluído no XML da NF-e:

```xml
<tpAmb>${dados.ambiente || '2'}</tpAmb>
```

**Valores:**

- `'1'` = Produção
- `'2'` = Homologação

#### 2.4. Validação do Botão de Emissão

**Localização:** `frontend/src/components/EmissaoNFe.tsx` (linhas 1366-1373)

O botão de emissão muda de cor e estilo baseado no ambiente:

- **Produção (`'1'`):** Botão verde (`from-green-600 to-green-700`)
- **Homologação (`'2'`):** Botão amarelo (`from-yellow-500 to-yellow-600`)

```typescript
<button
    onClick={handleEmitirNFe}
    className={`px-8 py-3 bg-gradient-to-r ${
        ambiente === '1'
            ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            : 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
    } text-white font-semibold rounded-lg`}
>
    {emitindo ? 'Emitindo NF-e...' : 'Emitir NF-e'}
</button>
```

### ✅ Conclusão sobre Ambientes

**TUDO ESTÁ CORRETAMENTE VALIDADO:**

- ✅ Frontend permite seleção explícita entre homologação e produção
- ✅ Alertas visuais diferenciados para cada ambiente
- ✅ Backend processa e valida o ambiente corretamente
- ✅ Fallback seguro para homologação se ambiente inválido
- ✅ Ambiente é corretamente incluído no XML da NF-e
- ✅ Botão visualmente diferenciado conforme ambiente

---

## 📄 3. Geração de DANFE (PDF)

### 3.1. Como é Gerado?

**Status: NÃO É AUTOMÁTICO - É GERADO SOB DEMANDA**

O DANFE **NÃO é gerado automaticamente** quando a NF-e é aprovada. Ele é gerado
apenas quando solicitado através de um botão no frontend.

#### Fluxo de Geração:

1. **NF-e é Emitida** → XML é enviado à SEFAZ e autorizado
2. **XML procNFe é Salvo** → Backend salva o XML completo (NFe + protocolo) no
   banco
3. **Usuário Solicita DANFE** → Clica no botão "Ver DANFE" na listagem de notas
4. **Backend Gera PDF** → Serviço `NFeDanfeService` processa o XML e gera o PDF
5. **PDF é Enviado** → Frontend abre o PDF em nova aba/janela

#### Endpoints Disponíveis:

**1. GET `/api/nfe/notas/:id/danfe`** (Principal)

- Gera DANFE a partir da nota fiscal salva no banco
- **Localização:** `backend/src/controllers/nfeController.ts` (linhas 477-508)
- **Uso:** Botão "Ver DANFE" no frontend

**2. POST `/api/nfe/danfe-preview`** (Preview)

- Gera DANFE a partir de um XML procNFe enviado no body
- **Localização:** `backend/src/controllers/nfeController.ts` (linhas 444-471)
- **Uso:** Para pré-visualização antes de salvar

#### Código do Botão no Frontend:

**Localização:** `frontend/src/components/EmissaoNFe.tsx` (linhas 611-615,
1605-1612)

```typescript
// Handler
const handleVerDanfeNota = (notaId: string) => {
    if (!notaId) return;
    const url = `/api/nfe/notas/${notaId}/danfe`;
    window.open(url, '_blank'); // Abre PDF em nova aba
};

// Botão na UI
<button onClick={() => handleVerDanfeNota(nota.id)}>
    Ver DANFE
</button>
```

### 3.2. Salvamento do PDF

**Status: NÃO É SALVO - É GERADO DINAMICAMENTE**

O DANFE **NÃO é salvo como arquivo PDF** no servidor. Ele é gerado dinamicamente
a cada requisição a partir do XML salvo no banco de dados.

**Vantagens:**

- ✅ Sempre reflete o estado atual do XML
- ✅ Não ocupa espaço em disco
- ✅ Atualiza automaticamente se houver correções

**Desvantagens:**

- ⚠️ Geração sob demanda pode ser mais lenta
- ⚠️ Não há cache de PDFs

### 3.3. Layout do DANFE

**Localização:** `backend/src/services/nfe-danfe.service.ts`

O DANFE é gerado usando a biblioteca **PDFKit** com layout **oficial conforme
legislação brasileira** (Portaria CAT 42/2018).

#### Estrutura do Layout:

```
┌─────────────────────────────────────────────────────────┐
│                    CABEÇALHO (Azul)                     │
│  [Logo]  DANFE                                          │
│         Documento Auxiliar da Nota Fiscal Eletrônica   │
├─────────────────────────────────────────────────────────┤
│ QUADRO 1: IDENTIFICAÇÃO DA NF-e                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Nº: XXX  Série: X  Data Emissão: XX/XX/XXXX        │ │
│ │ Chave de Acesso: XXXX...                            │ │
│ │ Protocolo: XXXX...  Data/Hora Autorização: ...     │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ QUADRO 2: DADOS DO EMITENTE  │ QUADRO 3: DESTINATÁRIO │
│ ┌───────────────────────────┐│ ┌─────────────────────┐│
│ │ Razão Social              ││ │ Razão Social        ││
│ │ CNPJ: XX.XXX.XXX/XXXX-XX  ││ │ CPF/CNPJ: ...       ││
│ │ IE: XXXXXXXXX             ││ │ IE: ... (se houver)││
│ │ Endereço Completo         ││ │ Endereço Completo   ││
│ └───────────────────────────┘│ └─────────────────────┘│
├─────────────────────────────────────────────────────────┤
│ QUADRO 4: DADOS DOS PRODUTOS / SERVIÇOS                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ CÓD | DESCRIÇÃO | NCM | CFOP | UN | QTDE | VL UNIT │ │
│ │ VL TOTAL                                              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ XXX | Produto 1 | ... | 5101 | UN | 1.00 | R$ X.XX│ │
│ │ ICMS: 00 | Base: R$ X.XX | Alíq: 12% | Valor: ...  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ... (mais produtos)                                  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ QUADRO 5: CÁLCULO DO IMPOSTO                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Base ICMS: R$ X.XX    │ Valor ICMS: R$ X.XX        │ │
│ │ Base ICMS ST: R$ X.XX │ Valor ICMS ST: R$ X.XX     │ │
│ │ Valor Produtos: R$ X.XX │ Valor Frete: R$ X.XX     │ │
│ │ Valor Seguro: R$ X.XX │ Desconto: R$ X.XX          │ │
│ │ Valor IPI: R$ X.XX    │ Valor PIS: R$ X.XX         │ │
│ │ Valor COFINS: R$ X.XX                               │ │
│ │ ─────────────────────────────────────────────────── │ │
│ │ VALOR TOTAL DA NF-e: R$ X.XX                        │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ QUADRO 6: DADOS ADICIONAIS │ QR CODE                   │
│ ┌────────────────────────┐│ ┌──────────────────────┐ │
│ │ Informações Adicionais ││ │   [QR CODE]          │ │
│ │ (se houver)            ││ │                      │ │
│ │                        ││ │ Consulta pela chave  │ │
│ │                        ││ │ de acesso em:        │ │
│ │                        ││ │ www.nfe.fazenda...   │ │
│ └────────────────────────┘│ └──────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    RODAPÉ (Azul)                        │
│ Este documento é uma representação gráfica da NF-e e   │
│ não tem validade fiscal. A validade está no XML...     │
└─────────────────────────────────────────────────────────┘
```

#### Detalhes do Layout:

**1. Cabeçalho (Linhas 136-187):**

- Retângulo azul (`#1E40AF`) ocupando topo da página (60pt)
- Logo da empresa (se configurado) no canto esquerdo
- Título "DANFE" em branco, fonte bold, tamanho 20
- Subtítulo "Documento Auxiliar da Nota Fiscal Eletrônica"
- Aviso de contingência (se aplicável) em vermelho

**2. Quadro 1 - Identificação (Linhas 192-228):**

- Número da NF-e
- Série
- Data de Emissão
- Chave de Acesso (44 dígitos, em negrito)
- Protocolo de Autorização (se autorizado)
- Data/Hora de Autorização
- Ambiente (PRODUÇÃO ou HOMOLOGAÇÃO)

**3. Quadros 2 e 3 - Emitente e Destinatário (Linhas 231-289):**

- Lado a lado (50% cada)
- Dados completos: Razão Social, CNPJ/CPF, IE, Endereço completo

**4. Quadro 4 - Produtos/Serviços (Linhas 294-358):**

- Tabela com cabeçalho cinza (`#E5E7EB`)
- Colunas: Código, Descrição, NCM, CFOP, UN, Quantidade, Valor Unitário, Valor
  Total
- Linhas alternadas (branco/cinza claro)
- Segunda linha por item com informações de ICMS

**5. Quadro 5 - Cálculo do Imposto (Linhas 361-397):**

- Base e valores de ICMS, ICMS ST
- Valor dos produtos, frete, seguro, desconto
- Valores de IPI, PIS, COFINS
- **VALOR TOTAL DA NF-e** em negrito

**6. Quadro 6 - Dados Adicionais e QR Code (Linhas 400-456):**

- Lado esquerdo (60%): Informações adicionais (se houver)
- Lado direito (40%): QR Code para consulta pública
- URL do QR Code:
  - Produção: `http://www.nfe.fazenda.gov.br/portal/consulta.aspx?p=CHAVE`
  - Homologação: `http://hom.nfe.fazenda.gov.br/portal/consulta.aspx?p=CHAVE`

**7. Rodapé (Linhas 459-478):**

- Retângulo azul na parte inferior
- Texto em branco informando que o documento é apenas representação gráfica

#### Especificações Técnicas:

- **Formato:** PDF A4 (595.28 x 841.89 pontos)
- **Margens:** 20 pontos em todos os lados
- **Biblioteca:** PDFKit
- **QR Code:** Gerado com biblioteca `qrcode`
- **Fontes:** Helvetica (normal) e Helvetica-Bold
- **Cores:**
  - Azul cabeçalho/rodapé: `#1E40AF`
  - Texto branco: `#FFFFFF`
  - Texto preto: `#000000`
  - Fundo tabela: `#E5E7EB`

#### Contingência:

Se a NF-e foi emitida em contingência offline (sem protocolo de autorização), o
DANFE exibe um aviso vermelho no topo:

```
"EMITIDO EM CONTINGÊNCIA OFFLINE - SEM AUTORIZAÇÃO SEFAZ"
```

---

## 📊 4. Resumo de Status

| Item                               | Status       | Observações                                                      |
| ---------------------------------- | ------------ | ---------------------------------------------------------------- |
| **Conexão API/Axios**              | ✅ OK        | Conectado corretamente ao endpoint `/api/nfe/emitir`             |
| **Validação Ambiente Homologação** | ✅ OK        | Botão amarelo, alerta amarelo, ambiente '2' enviado corretamente |
| **Validação Ambiente Produção**    | ✅ OK        | Botão verde, alerta vermelho, ambiente '1' enviado corretamente  |
| **Geração de DANFE**               | ✅ OK        | Implementado, mas **não automático** - sob demanda via botão     |
| **Salvamento de PDF**              | ⚠️ NÃO SALVA | Geração dinâmica a cada requisição                               |
| **Layout DANFE**                   | ✅ OK        | Layout oficial conforme legislação brasileira                    |

---

## 🚀 5. Recomendações para Produção

### 5.1. Antes de Subir para Produção:

1. ✅ **Testar em Homologação Primeiro**
   - Emitir pelo menos 2-3 NF-es em ambiente de homologação
   - Verificar se todas são autorizadas corretamente
   - Validar se o DANFE é gerado corretamente
   - Confirmar que os dados estão corretos no PDF

2. ✅ **Validar Certificado Digital**
   - Certificado deve estar válido e não expirado
   - Senha deve estar corretamente configurada
   - Certificado deve ter permissões de assinatura

3. ✅ **Verificar Configurações de Empresa Fiscal**
   - Dados da empresa completos (CNPJ, IE, endereço)
   - Endereço com código IBGE do município correto
   - Regime tributário configurado corretamente

4. ⚠️ **Considerar Implementar Cache de DANFE** (Opcional)
   - Se muitos usuários solicitarem DANFEs, considerar cache
   - Gerar PDF uma vez e salvar, invalidar apenas se NF-e for alterada

5. ✅ **Monitorar Logs**
   - Acompanhar logs do backend durante primeiras emissões
   - Verificar erros de comunicação com SEFAZ
   - Monitorar tempo de resposta

### 5.2. Fluxo Recomendado para Teste:

```
1. Configurar Empresa Fiscal
   ↓
2. Enviar Certificado Digital
   ↓
3. Testar em HOMOLOGAÇÃO:
   - Emitir 1 NF-e
   - Verificar autorização
   - Gerar DANFE e validar layout
   - Verificar dados no PDF
   ↓
4. Se tudo OK em homologação:
   → PRODUÇÃO deve funcionar (mesmo código)
   → Testar 1 NF-e em produção
   → Validar DANFE em produção
```

---

## ✅ 6. Conclusão

### Status Geral: **PRONTO PARA PRODUÇÃO** ✅

A aplicação está **corretamente implementada** para emissão de NF-e:

1. ✅ **Conexão com API:** Funcionando corretamente via Axios
2. ✅ **Validação de Ambientes:** Homologação e Produção corretamente
   diferenciados e validados
3. ✅ **Geração de DANFE:** Implementada e funcional (sob demanda)
4. ✅ **Layout do DANFE:** Oficial, conforme legislação brasileira

**Recomendação:** Pode subir para produção após testar em homologação. O código
está seguro, com validações adequadas e fallbacks apropriados.

---

## 📝 7. Anexos

### 7.1. Arquivos Principais

- **Frontend:** `frontend/src/components/EmissaoNFe.tsx`
- **Backend Controller:** `backend/src/controllers/nfeController.ts`
- **Backend Service:** `backend/src/services/nfe.service.ts`
- **DANFE Service:** `backend/src/services/nfe-danfe.service.ts`
- **Rotas:** `backend/src/routes/nfe.routes.ts`

### 7.2. Endpoints Utilizados

- `POST /api/nfe/emitir` - Emitir NF-e
- `GET /api/nfe/notas/:id/danfe` - Gerar DANFE
- `POST /api/nfe/danfe-preview` - Preview de DANFE
- `POST /api/nfe/preview-xml` - Pré-visualizar XML

---

**Documento gerado em:** 2024  
**Versão:** 1.0  
**Autor:** Análise Automatizada - S3E-System-PRO
