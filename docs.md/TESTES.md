# 📋 Documentação de Testes - S3E System PRO

Este documento descreve a estrutura de testes do projeto, incluindo testes para
Backend (Jest) e Frontend (Vitest).

## 🧪 Estrutura de Testes

### Backend (Jest)

- **Configuração**: `backend/jest.config.js`
- **Framework**: Jest com ts-jest
- **Ambiente**: Node.js

### Frontend (Vitest)

- **Configuração**: `frontend/vitest.config.ts`
- **Framework**: Vitest com React Testing Library
- **Ambiente**: jsdom (simula DOM do navegador)

---

## 📁 Arquivos de Teste Criados

### Backend (Jest)

#### 1. `backend/src/controllers/pdfOrcamentoController.test.ts`

**Testes para**: `PDFOrcamentoController`

**Cobertura**:

- ✅ Geração de nome de arquivo (`gerarNomeArquivo`)
- ✅ Formato correto: `Orcamento-[número] -[nome do cliente].pdf`
- ✅ Remoção de caracteres especiais
- ✅ Limitação de tamanho do nome
- ✅ Fallbacks quando dados não estão disponíveis
- ✅ Validação de nomes para Windows

#### 2. `backend/src/services/pdfOrcamento.service.test.ts`

**Testes para**: `PDFOrcamentoService`

**Cobertura**:

- ✅ Geração de HTML do orçamento (`gerarHTMLOrcamento`)
- ✅ Estrutura de página A4 com `.page-content`
- ✅ Aplicação de margens (95px top, 100px bottom)
- ✅ Formato do número do orçamento (ORÇAMENTO: [número] em 14px)
- ✅ Inclusão de dados do cliente
- ✅ Folha timbrada quando fornecida
- ✅ Descrições técnicas
- ✅ CSS para impressão (@media print)
- ✅ Paginação automática

### Frontend (Vitest)

#### 3. `frontend/src/components/PDFCustomization/__tests__/PDFCustomizationModal.test.tsx`

**Testes para**: `PDFCustomizationModal`

**Cobertura**:

- ✅ Renderização do modal
- ✅ Abas Design e Pré-visualização (sem aba Conteúdo)
- ✅ Abertura padrão na aba Pré-visualização
- ✅ Botões do footer (Cancelar, Imprimir, Salvar PDF)
- ✅ Ausência do botão "Visualizar Preview"
- ✅ Largura reduzida da lateral (`w-[calc(40%-10px)]`)

#### 4. `frontend/src/components/PDFCustomization/__tests__/OrcamentoPrintable.test.tsx`

**Testes para**: `OrcamentoPrintable`

**Cobertura**:

- ✅ Renderização do número do orçamento no formato: `ORÇAMENTO: [número]`
  (14px)
- ✅ Uso de `numeroSequencial` com fallback para `numero`
- ✅ Estrutura de páginas A4 com `.pdf-page` e `.page-content`
- ✅ Aplicação de margens CSS (95px top, 100px bottom)
- ✅ Folha timbrada e marca d'água
- ✅ Renderização de conteúdo (cliente, itens, totais)
- ✅ Paginação automática de conteúdo longo
- ✅ CSS para impressão (@media print, @page)
- ✅ Numeração de páginas

#### 5. `frontend/src/components/PDFCustomization/__tests__/PDFViewer.test.tsx`

**Testes para**: `PDFViewer`

**Cobertura**:

- ✅ Renderização do toolbar com controles de zoom
- ✅ Botões de zoom (-) e (+)
- ✅ Contador de páginas dinâmico
- ✅ Aumento/diminuição de zoom
- ✅ Limites de zoom (50% - 200%)
- ✅ Reset de zoom
- ✅ Aplicação de transform scale no preview
- ✅ Layout e estilos (background escuro, toolbar)

#### 6. `frontend/src/services/__tests__/pdfCustomizationService.test.ts`

**Testes para**: `pdfCustomizationService`

**Cobertura**:

- ✅ Extração de nome do arquivo do header `Content-Disposition`
- ✅ Decodificação de nomes codificados em UTF-8
- ✅ Fallback quando header não está presente
- ✅ Download do PDF com nome correto

---

## 🚀 Como Rodar os Testes

### Backend (Jest)

```bash
# Entrar no diretório do backend
cd backend

# Rodar todos os testes
npm test

# Rodar testes de um arquivo específico
npm test -- pdfOrcamentoController.test.ts
npm test -- pdfOrcamento.service.test.ts

# Rodar testes em modo watch
npm test -- --watch

# Rodar testes com cobertura
npm test -- --coverage
```

### Frontend (Vitest)

```bash
# Entrar no diretório do frontend
cd frontend

# Rodar todos os testes
npm test

# Rodar testes de um arquivo específico
npm test PDFCustomizationModal.test.tsx
npm test OrcamentoPrintable.test.tsx
npm test PDFViewer.test.tsx

# Rodar testes em modo watch
npm test -- --watch

# Rodar testes com cobertura
npm test -- --coverage
```

---

## ✅ Checklist de Funcionalidades Testadas

### Geração de PDF

- [x] Nome do arquivo no formato: `Orcamento-[número] -[nome do cliente].pdf`
- [x] Número sequencial do orçamento (não ID)
- [x] Margens 95px (top) e 100px (bottom) em todas as páginas
- [x] Folha timbrada fixa em todas as páginas
- [x] Formato do número: `ORÇAMENTO: [número]` em 14px
- [x] Paginação automática para conteúdo longo
- [x] CSS para impressão correto

### Modal de Personalização

- [x] Abre na aba Pré-visualização por padrão
- [x] Preview sempre visível no lado direito
- [x] Apenas abas Design e Pré-visualização
- [x] Largura da lateral reduzida em 10px
- [x] Sem botão "Salvar como Template"
- [x] Sem botão "Visualizar Preview"
- [x] Controles de zoom funcionando (50% - 200%)

### Componentes

- [x] OrcamentoPrintable renderiza corretamente
- [x] PDFViewer com controles de zoom
- [x] Extração de nome do arquivo do header HTTP

---

## 📝 Notas Importantes

1. **Mocks**: Os testes usam mocks para:
   - Prisma Client (backend)
   - Puppeteer (backend)
   - react-to-print (frontend)
   - axiosApiService (frontend)
   - fetch API (frontend)

2. **Setup Files**: O frontend usa `src/test/setup.ts` para configurações
   globais dos testes.

3. **Coverage**: Execute `npm test -- --coverage` para ver relatório de
   cobertura.

4. **Watch Mode**: Use `--watch` durante desenvolvimento para testes
   automáticos.

---

## 🔍 Exemplo de Saída dos Testes

### Backend (Jest)

```
PASS  src/controllers/pdfOrcamentoController.test.ts
  PDFOrcamentoController
    gerarNomeArquivo
      ✓ deve gerar nome do arquivo no formato correto
      ✓ deve remover caracteres especiais
      ✓ deve limitar tamanho do nome
      ✓ deve usar fallback quando necessário

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

### Frontend (Vitest)

```
✓ PDFCustomizationModal.test.tsx (15)
  ✓ Renderização (4)
  ✓ Comportamento das Abas (2)
  ✓ Botões do Footer (5)
  ✓ Largura da Lateral (1)
  ✓ Zoom (3)

Test Files  1 passed (1)
     Tests  15 passed (15)
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

**Solução**: Instale as dependências de desenvolvimento:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Erro: "ReferenceError: document is not defined" (Frontend)

**Solução**: O Vitest está configurado para usar `jsdom`. Verifique
`vitest.config.ts`.

### Erro: Mocks não funcionando

**Solução**: Limpe o cache:

```bash
# Backend
npm test -- --clearCache

# Frontend
npm test -- --clearCache
```

---

## 📚 Referências

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [ts-jest](https://kulshekhar.github.io/ts-jest/)
