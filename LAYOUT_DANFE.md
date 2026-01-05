# Layout Visual do DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)

## 📄 Estrutura Completa do PDF

Este documento descreve o layout visual do DANFE gerado pelo sistema, conforme implementado em `backend/src/services/nfe-danfe.service.ts`.

---

## 🎨 Desenho Visual do Layout

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                          CABEÇALHO (Fundo Azul #1E40AF)                      ║
║                                                                               ║
║  [LOGO]     DANFE                                                             ║
║  EMPRESA    Documento Auxiliar da Nota Fiscal Eletrônica                    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────────────────────┐
│ QUADRO 1: IDENTIFICAÇÃO DA NF-e                                              │
├───────────────────────────────────────────────────────────────────────────────┤
│ Nº: 001234     │ Série: 1    │ Data Emissão: 15/01/2024 10:30                │
│ Ambiente: PRODUÇÃO                                                           │
│                                                                               │
│ Chave de Acesso: 42201412345678000123550010000123451234567890                │
│                                                                               │
│ Protocolo de Autorização: 142240000000123                                    │
│ Data/Hora Autorização: 15/01/2024 10:31:45                                   │
└───────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┬────────────────────────────────────┐
│ QUADRO 2: DADOS DO EMITENTE              │ QUADRO 3: DADOS DO DESTINATÁRIO    │
├──────────────────────────────────────────┼────────────────────────────────────┤
│ EMPRESA EXEMPLO LTDA                     │ CLIENTE EXEMPLO LTDA               │
│ CNPJ: 12.345.678/0001-23                 │ CNPJ: 98.765.432/0001-10           │
│ Inscrição Estadual: 123.456.789          │ Inscrição Estadual: 987.654.321   │
│                                          │                                    │
│ Rua Exemplo, 123                         │ Avenida Cliente, 456               │
│ Bairro Centro                            │ Bairro Jardim                      │
│ Itajaí/SC - CEP: 88.301-000              │ São Paulo/SP - CEP: 01.234-567    │
│                                          │                                    │
└──────────────────────────────────────────┴────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│ QUADRO 4: DADOS DOS PRODUTOS / SERVIÇOS                                     │
├──────┬──────────────────────────┬──────┬──────┬────┬───────┬────────┬────────┤
│ CÓD. │ DESCRIÇÃO                │ NCM  │ CFOP │ UN │ QTDE  │ VL.UNIT│VL.TOTAL│
├──────┼──────────────────────────┼──────┼──────┼────┼───────┼────────┼────────┤
│ PROD1│ Produto Exemplo 1        │850440│ 5101 │ UN │ 10.00 │ R$ 50.00│R$ 500.00│
│      │ ICMS: 00 | Base: R$ 500.00 | Alíq: 12.00% | Valor: R$ 60.00 │
├──────┼──────────────────────────┼──────┼──────┼────┼───────┼────────┼────────┤
│ PROD2│ Produto Exemplo 2        │847130│ 5101 │ UN │  5.00 │ R$ 80.00│R$ 400.00│
│      │ ICMS: 00 | Base: R$ 400.00 | Alíq: 12.00% | Valor: R$ 48.00 │
├──────┼──────────────────────────┼──────┼──────┼────┼───────┼────────┼────────┤
│ PROD3│ Produto Exemplo 3        │851712│ 5101 │ UN │  2.00 │R$ 150.00│R$ 300.00│
│      │ ICMS: 00 | Base: R$ 300.00 | Alíq: 12.00% | Valor: R$ 36.00 │
└──────┴──────────────────────────┴──────┴──────┴────┴───────┴────────┴────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│ QUADRO 5: CÁLCULO DO IMPOSTO                                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│ Base de Cálculo do ICMS: R$ 1,200.00   │ Valor do ICMS: R$ 144.00            │
│ Base de Cálculo do ICMS ST: R$ 0.00    │ Valor do ICMS ST: R$ 0.00           │
│                                          │                                    │
│ Valor Total dos Produtos: R$ 1,200.00  │ Valor do Frete: R$ 0.00             │
│ Valor do Seguro: R$ 0.00                │ Desconto: R$ 0.00                  │
│ Valor do II: R$ 0.00                    │                                    │
│                                          │                                    │
│ Valor do IPI: R$ 0.00                   │ Valor do PIS: R$ 19.80             │
│ Valor da COFINS: R$ 91.20               │                                    │
│                                          │                                    │
│ ═══════════════════════════════════════════════════════════════════════════  │
│ VALOR TOTAL DA NF-e: R$ 1,200.00                                             │
│ ═══════════════════════════════════════════════════════════════════════════  │
└───────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┬─────────────────────────────────┐
│ QUADRO 6: DADOS ADICIONAIS                  │ CONSULTA PELA CHAVE DE ACESSO   │
├─────────────────────────────────────────────┼─────────────────────────────────┤
│ Informações complementares adicionadas     │ ┌─────────────────────────────┐  │
│ pela empresa, se houver alguma observação │ │                             │  │
│ relevante sobre a operação ou produtos.   │ │      [QR CODE IMAGE]        │  │
│                                            │ │                             │  │
│                                            │ │                             │  │
│                                            │ │                             │  │
│                                            │ └─────────────────────────────┘  │
│                                            │                                 │
│                                            │ Consulte pela chave de acesso  │
│                                            │ em:                             │
│                                            │ www.nfe.fazenda.gov.br/portal  │
│                                            │                                 │
└─────────────────────────────────────────────┴─────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║                           RODAPÉ (Fundo Azul #1E40AF)                        ║
║                                                                               ║
║  Este documento é uma representação gráfica da NF-e e não tem validade      ║
║  fiscal. A validade da NF-e está no XML assinado digitalmente.               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📐 Especificações Técnicas Detalhadas

### Dimensões e Formato

- **Formato:** A4 (210mm x 297mm)
- **Tamanho em Pontos:** 595.28pt (largura) x 841.89pt (altura)
- **Margens:** 20 pontos (7.06mm) em todos os lados
- **Largura útil:** 555.28 pontos (196mm)

### Cores Utilizadas

| Elemento | Cor Hex | RGB | Uso |
|----------|---------|-----|-----|
| Cabeçalho/Rodapé | `#1E40AF` | rgb(30, 64, 175) | Fundo azul oficial |
| Texto Cabeçalho/Rodapé | `#FFFFFF` | rgb(255, 255, 255) | Texto branco |
| Texto Principal | `#000000` | rgb(0, 0, 0) | Texto preto |
| Fundo Tabela (Header) | `#E5E7EB` | rgb(229, 231, 235) | Cabeçalho da tabela |
| Fundo Tabela (Linhas) | `#FFFFFF` / `#F9FAFB` | rgb(255,255,255) / rgb(249,250,251) | Alternância |
| Bordas | `#000000` | rgb(0, 0, 0) | Bordas pretas |
| Alerta Contingência | `#DC2626` | rgb(220, 38, 38) | Fundo vermelho aviso |

### Tipografia

| Elemento | Fonte | Tamanho | Peso | Estilo |
|----------|-------|---------|------|--------|
| Título "DANFE" | Helvetica-Bold | 20pt | Bold | - |
| Subtítulo | Helvetica | 10pt | Regular | - |
| Títulos de Quadros | Helvetica-Bold | 8pt | Bold | - |
| Texto Principal | Helvetica | 7pt | Regular | - |
| Texto Tabela | Helvetica | 6pt | Regular | - |
| Cabeçalho Tabela | Helvetica-Bold | 6pt | Bold | - |
| Valor Total | Helvetica-Bold | 8pt | Bold | - |
| Rodapé | Helvetica | 7pt | Regular | - |

### Estrutura de Quadros

#### Quadro 1: Identificação da NF-e
- **Altura:** 40 pontos
- **Conteúdo:**
  - Linha 1: Número, Série, Data Emissão, Ambiente
  - Linha 2: Chave de Acesso (44 dígitos, negrito)
  - Linha 3: Protocolo e Data/Hora de Autorização

#### Quadro 2: Dados do Emitente
- **Largura:** 50% da página (277.64pt)
- **Altura:** 50 pontos
- **Conteúdo:** Razão Social, CNPJ, IE, Endereço completo

#### Quadro 3: Dados do Destinatário
- **Largura:** 50% da página (277.64pt)
- **Altura:** 50 pontos
- **Conteúdo:** Razão Social, CPF/CNPJ, IE (se houver), Endereço completo

#### Quadro 4: Produtos/Serviços
- **Altura:** Variável (mínimo 15pt para cabeçalho + 18pt por item)
- **Cabeçalho da Tabela:** 15 pontos, fundo cinza
- **Linhas de Itens:** 18 pontos cada
  - Primeira linha: Dados do produto
  - Segunda linha: Informações de ICMS (CST, Base, Alíquota, Valor)

**Colunas da Tabela:**
| Coluna | Largura | Alinhamento |
|--------|---------|-------------|
| Código | 50pt | Esquerda |
| Descrição | 180pt | Esquerda |
| NCM | 50pt | Esquerda |
| CFOP | 40pt | Esquerda |
| UN | 25pt | Esquerda |
| Quantidade | 50pt | Direita |
| Valor Unit. | 60pt | Direita |
| Valor Total | 60pt | Direita |

#### Quadro 5: Cálculo do Imposto
- **Altura:** 70 pontos
- **Layout:** 3 colunas de informações
- **Última linha:** Valor Total da NF-e em negrito, tamanho maior

#### Quadro 6: Dados Adicionais e QR Code
- **Altura:** 100 pontos
- **Esquerda (60%):** Dados adicionais (informações complementares)
- **Direita (40%):** QR Code (100x100pt) e texto de consulta

#### Cabeçalho
- **Altura:** 60 pontos
- **Logo:** Máximo 80x40 pontos (se disponível)
- **Alerta Contingência:** 20 pontos adicionais (se aplicável)

#### Rodapé
- **Altura:** 30 pontos
- **Texto:** Aviso sobre validade fiscal

---

## 🔍 Detalhes de Implementação

### Geração de QR Code

O QR Code é gerado com as seguintes especificações:
- **Biblioteca:** `qrcode` (Node.js)
- **Tamanho:** 150x150 pixels
- **Correção de Erro:** Nível M (15%)
- **Tipo:** PNG
- **Conteúdo:** URL de consulta da NF-e

**URLs por Ambiente:**
- **Produção:** `http://www.nfe.fazenda.gov.br/portal/consulta.aspx?p={CHAVE_ACESSO}`
- **Homologação:** `http://hom.nfe.fazenda.gov.br/portal/consulta.aspx?p={CHAVE_ACESSO}`

### Tratamento de Contingência

Se a NF-e foi emitida em contingência offline (sem protocolo de autorização):
- Exibe faixa vermelha de 20 pontos de altura abaixo do cabeçalho
- Texto: "EMITIDO EM CONTINGÊNCIA OFFLINE - SEM AUTORIZAÇÃO SEFAZ"
- Texto branco, fonte bold, tamanho 12pt
- Fundo vermelho `#DC2626`

### Quebra de Página

O PDF suporta múltiplas páginas automaticamente:
- Verifica espaço necessário antes de cada quadro
- Adiciona nova página se necessário
- Mantém margens consistentes
- Cabeçalho e rodapé apenas na primeira e última página respectivamente

### Logo da Empresa

- Busca logo configurada em `Configuracao.logoDanfeUrl` ou `Configuracao.logoUrl`
- Localização esperada: `uploads/logos/{nome_arquivo}`
- Tamanho máximo: 80x40 pontos
- Se não encontrar, omite a logo (texto "DANFE" ocupa toda a largura)

---

## 📋 Validações e Regras

### Formatação de Dados

1. **CPF/CNPJ:** Formatados com máscara (XXX.XXX.XXX-XX / XX.XXX.XXX/XXXX-XX)
2. **CEP:** Formatado com máscara (XXXXX-XXX)
3. **Datas:** Formato brasileiro (DD/MM/AAAA HH:MM)
4. **Valores Monetários:** Formato brasileiro (R$ X.XXX,XX)
5. **Chave de Acesso:** Sem formatação (44 dígitos contínuos)

### Campos Opcionais

- **Inscrição Estadual do Destinatário:** Exibido apenas se presente
- **Informações Adicionais:** Quadro só aparece se houver conteúdo
- **Logo:** Omitida se não configurada
- **QR Code:** Gerado sempre (exceto em caso de erro)

### Limites de Caracteres

- **Descrição do Produto:** Máximo 120 caracteres no XML, exibido truncado se necessário
- **Chave de Acesso:** Exatamente 44 dígitos
- **Protocolo:** Variável, conforme retorno da SEFAZ

---

## ✅ Conformidade Legal

O layout implementado segue as especificações:
- **Portaria CAT 42/2018** (Santa Catarina)
- **Normas da Receita Federal do Brasil**
- **Layout Padrão Nacional de DANFE**

**Elementos Obrigatórios Presentes:**
- ✅ Identificação completa da NF-e
- ✅ Dados do emitente e destinatário
- ✅ Listagem detalhada de produtos/serviços
- ✅ Cálculo completo de impostos
- ✅ QR Code para consulta pública
- ✅ Avisos legais no rodapé
- ✅ Indicação de ambiente (Produção/Homologação)
- ✅ Informações de contingência (se aplicável)

---

**Documento gerado em:** 2024  
**Versão:** 1.0  
**Baseado em:** `backend/src/services/nfe-danfe.service.ts`
