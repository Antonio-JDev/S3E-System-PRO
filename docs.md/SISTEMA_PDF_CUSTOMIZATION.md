# 🎨 Sistema Completo de Customização de PDF

## ✅ Implementação Concluída!

Sistema completo de geração de PDFs personalizáveis implementado com sucesso!

---

## 📋 O Que Foi Implementado

### 1. **Frontend (React + TypeScript)**

#### Types e Interfaces

- ✅ `frontend/src/types/pdfCustomization.ts`
  - Interfaces completas para customização
  - Tipos para marca d'água, design, conteúdo
  - Templates de cores pré-definidos
  - Designs de cantos pré-definidos

#### Hook Personalizado

- ✅ `frontend/src/hooks/usePDFCustomization.ts`
  - Gerenciamento completo de estado
  - Persistência em localStorage
  - Handlers para todas as customizações
  - Controle de mudanças não salvas

#### Serviço Frontend

- ✅ `frontend/src/services/pdfCustomizationService.ts`
  - Geração de PDF customizado
  - CRUD de templates
  - Upload de marca d'água
  - Upload de designs de cantos

#### Componente Principal

- ✅ `frontend/src/components/PDFCustomization/PDFCustomizationModal.tsx`
  - Modal completo e integrado
  - 4 abas: Marca d'Água, Design & Cores, Conteúdo, Pré-visualização
  - Preview em tempo real
  - Controles intuitivos

### 2. **Backend (Node.js + Express + TypeScript)**

#### Types Backend

- ✅ `backend/src/types/pdfCustomization.ts`
  - Types compartilhados com frontend

#### Serviço de PDF Dinâmico

- ✅ `backend/src/services/DynamicPDFService.ts`
  - Geração de HTML dinâmico com Handlebars
  - Aplicação de marca d'água (imagem e texto)
  - Designs nos cantos
  - Cores e tipografia customizáveis
  - Geração de PDF com Puppeteer

#### Controller

- ✅ `backend/src/controllers/pdfCustomizationController.ts`
  - Geração de PDF customizado
  - CRUD de templates
  - Upload de imagens (Multer + Sharp)

#### Rotas

- ✅ `backend/src/routes/pdfCustomization.routes.ts`
  - POST `/api/pdf-customization/generate-custom`
  - POST `/api/pdf-customization/templates`
  - GET `/api/pdf-customization/templates`
  - GET `/api/pdf-customization/templates/:id`
  - DELETE `/api/pdf-customization/templates/:id`
  - POST `/api/pdf-customization/upload-watermark`
  - POST `/api/pdf-customization/upload-corner-design`

#### Integração

- ✅ `backend/src/app.ts` - Rotas registradas

---

## 🎯 Funcionalidades Completas

### 💧 Marca d'Água

- **Tipos**: Nenhuma, Logo/Imagem, Texto, Design
- **Upload de imagem**: Suporte a JPG, PNG, SVG, WebP (máx. 5MB)
- **Texto personalizado**: Digite qualquer texto
- **Posições**: Centro, Diagonal, Cabeçalho, Rodapé, Cantos, Página Inteira
- **Tamanhos**: Pequeno, Médio, Grande
- **Opacidade**: Ajustável de 5% a 50%
- **Rotação**: -45° a 45°
- **Cor do texto**: Seletor de cor para marca d'água de texto

### 🎨 Design & Cores

- **Templates pré-definidos**:
  - S3E Engenharia (padrão)
  - Profissional (azul escuro)
  - Técnico (verde/laranja)
  - Elegante (roxo/vermelho)
- **Cores personalizáveis**:
  - Primária (headers, títulos)
  - Secundária (subtítulos, detalhes)
  - Destaque (valores, totais)
- **Designs nos cantos**:
  - Geométrico (triângulos)
  - Curvas (formas arredondadas)
  - Linhas (profissional)
  - Customizado (upload próprio)
  - Nenhum
- **Opacidade dos cantos**: Ajustável

### 📄 Conteúdo do PDF

Checkboxes para controlar o que aparece:

- ✅ Cabeçalho da Empresa
- ✅ Descrições Técnicas
- ✅ Imagens dos Itens
- ✅ Códigos dos Itens
- ✅ Avisos de Segurança (NBR 5410, NR-10)
- ✅ Espaço para Assinaturas
- ✅ Termos e Condições
- ✅ Informações de Pagamento
- ✅ Rodapé da Empresa

### 👁️ Pré-visualização em Tempo Real

- Preview visual do PDF
- Atualização instantânea das mudanças
- Simulação de marca d'água
- Visualização de cores e layout
- Formato A4/Letter

### 💾 Sistema de Templates

- **Salvar templates**: Nome + descrição
- **Carregar templates**: Lista de templates salvos
- **Template padrão**: S3E Engenharia
- **Persistência**: localStorage (temporário) + Backend (permanente)

---

## 🚀 Como Usar

### 1. Na Página de Orçamentos

```typescript
import PDFCustomizationModal from '../components/PDFCustomization/PDFCustomizationModal';
import { OrcamentoPDFData } from '../types/pdfCustomization';

const [showPDFCustomization, setShowPDFCustomization] = useState(false);

// Preparar dados do orçamento
const orcamentoData: OrcamentoPDFData = {
    numero: orcamento.id,
    data: new Date().toLocaleDateString('pt-BR'),
    validade: orcamento.validade,
    cliente: {
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj,
        // ...
    },
    projeto: {
        titulo: orcamento.titulo,
        // ...
    },
    items: orcamento.items.map(item => ({
        codigo: item.sku,
        nome: item.nome,
        unidade: item.unidadeMedida,
        quantidade: item.quantidade,
        valorUnitario: item.precoUnit,
        valorTotal: item.subtotal
    })),
    financeiro: {
        subtotal: calculosOrcamento.subtotalItens,
        bdi: formState.bdi,
        valorComBDI: calculosOrcamento.subtotalItens,
        desconto: formState.descontoValor,
        impostos: formState.impostoPercentual,
        valorTotal: calculosOrcamento.valorTotalFinal,
        condicaoPagamento: formState.condicaoPagamento
    },
    empresa: {
        nome: 'S3E Engenharia',
        cnpj: '00.000.000/0000-00'
    }
};

// Botão para abrir customização
<button
    onClick={() => setShowPDFCustomization(true)}
    className="btn-primary flex items-center gap-2"
>
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
    🎨 Personalizar PDF
</button>

// Modal de customização
{showPDFCustomization && (
    <PDFCustomizationModal
        isOpen={showPDFCustomization}
        onClose={() => setShowPDFCustomization(false)}
        orcamentoData={orcamentoData}
        onGeneratePDF={() => {
            // Callback opcional após gerar
            console.log('PDF gerado com sucesso!');
        }}
    />
)}
```

### 2. Fluxo Completo de Uso

1. **Criar/Editar Orçamento** → Preencher dados
2. **Clicar em "Personalizar PDF"** → Abre modal
3. **Aba Marca d'Água**:
   - Escolher tipo (Logo, Texto, Design, Nenhuma)
   - Se Logo: Fazer upload da imagem
   - Se Texto: Digitar texto e escolher cor
   - Ajustar posição, tamanho, opacidade, rotação
4. **Aba Design & Cores**:
   - Escolher template de cores ou personalizar
   - Ativar designs nos cantos
   - Escolher estilo de canto
   - Ajustar opacidade
5. **Aba Conteúdo**:
   - Marcar/desmarcar checkboxes do que deve aparecer
6. **Aba Pré-visualização**:
   - Revisar todas as customizações
   - Salvar como template (opcional)
7. **Clicar em "Gerar PDF Personalizado"**:
   - Backend gera PDF com Puppeteer
   - Download automático do arquivo

---

## 📁 Estrutura de Arquivos Criados

```
frontend/
├── src/
│   ├── types/
│   │   └── pdfCustomization.ts ✅
│   ├── hooks/
│   │   └── usePDFCustomization.ts ✅
│   ├── services/
│   │   └── pdfCustomizationService.ts ✅
│   └── components/
│       └── PDFCustomization/
│           └── PDFCustomizationModal.tsx ✅

backend/
├── src/
│   ├── types/
│   │   └── pdfCustomization.ts ✅
│   ├── services/
│   │   └── DynamicPDFService.ts ✅
│   ├── controllers/
│   │   └── pdfCustomizationController.ts ✅
│   ├── routes/
│   │   └── pdfCustomization.routes.ts ✅
│   └── app.ts (modificado) ✅
├── uploads/
│   └── pdf-customization/ (criado automaticamente)
└── data/
    └── pdf-templates/ (criado automaticamente)
```

---

## 🔧 Configuração Técnica

### Dependências Instaladas

**Backend:**

- ✅ `puppeteer` - Geração de PDF
- ✅ `handlebars` - Templates HTML
- ✅ `multer` - Upload de arquivos
- ✅ `sharp` - Processamento de imagens

**Frontend:**

- ✅ Usa dependências já existentes (React, TypeScript, Axios)

### Configurações de Upload

- **Tamanho máximo**: 5MB por arquivo
- **Formatos aceitos**: JPG, JPEG, PNG, SVG, WebP
- **Diretório**: `backend/uploads/pdf-customization/`

### Configurações de PDF

- **Formatos**: A4, Letter
- **Margens**: Personalizáveis (padrão: 20mm)
- **Orientação**: Portrait (padrão), Landscape
- **Background**: Sempre impresso

---

## 🎨 Templates de Cores Pré-definidos

### S3E Engenharia (Padrão)

- **Primária**: #6366F1 (Indigo)
- **Secundária**: #8B5CF6 (Purple)
- **Destaque**: #10B981 (Green)

### Profissional

- **Primária**: #1E40AF (Blue Dark)
- **Secundária**: #1F2937 (Gray Dark)
- **Destaque**: #3B82F6 (Blue)

### Técnico

- **Primária**: #0F766E (Teal)
- **Secundária**: #14532D (Green Dark)
- **Destaque**: #F59E0B (Amber)

### Elegante

- **Primária**: #7C3AED (Purple)
- **Secundária**: #BE123C (Rose)
- **Destaque**: #DC2626 (Red)

---

## 🔐 Segurança

- ✅ Todas as rotas requerem autenticação
- ✅ Upload de arquivos validado (tipo e tamanho)
- ✅ Templates isolados por usuário
- ✅ Sanitização de inputs no backend
- ✅ Headers de segurança (Helmet.js)

---

## 📊 Exemplo de Dados do Orçamento

```typescript
const orcamentoData: OrcamentoPDFData = {
  numero: "ORC-2024-001",
  data: "06/11/2024",
  validade: "06/12/2024",
  cliente: {
    nome: "João Silva Ltda",
    cpfCnpj: "12.345.678/0001-99",
    endereco: "Rua das Flores, 123",
    telefone: "(48) 9999-8888",
    email: "contato@joaosilva.com",
  },
  projeto: {
    titulo: "Instalação Elétrica - Edifício Comercial",
    descricao: "Projeto completo de instalação elétrica",
    enderecoObra: "Av. Principal, 456",
    cidade: "Florianópolis",
    bairro: "Centro",
    cep: "88000-000",
  },
  items: [
    {
      codigo: "MAT-001",
      nome: "Disjuntor 32A",
      descricao: "Disjuntor termomagnético tripolar 32A",
      unidade: "UN",
      quantidade: 10,
      valorUnitario: 45.5,
      valorTotal: 455.0,
    },
    // ... mais itens
  ],
  financeiro: {
    subtotal: 15000.0,
    bdi: 20,
    valorComBDI: 18000.0,
    desconto: 500.0,
    impostos: 1500.0,
    valorTotal: 19000.0,
    condicaoPagamento: "30 dias",
  },
  observacoes: "Projeto conforme norma NBR 5410",
  empresa: {
    nome: "S3E Engenharia",
    cnpj: "00.000.000/0000-00",
    logo: "/uploads/logo.png",
  },
};
```

---

## 🐛 Troubleshooting

### PDF não está sendo gerado

1. Verificar se o Puppeteer está instalado corretamente
2. Verificar permissões da pasta `uploads/`
3. Verificar logs do backend

### Marca d'água não aparece

1. Verificar se a imagem foi feita upload corretamente
2. Verificar opacidade (não pode estar em 0)
3. Verificar se o tipo está configurado corretamente

### Cores não aplicadas

1. Verificar se as cores estão no formato hexadecimal (#RRGGBB)
2. Limpar cache do navegador
3. Verificar console para erros

### Upload falha

1. Verificar tamanho do arquivo (máx. 5MB)
2. Verificar formato do arquivo (JPG, PNG, SVG, WebP)
3. Verificar se a pasta `uploads/pdf-customization/` existe

---

## 🚀 Próximas Melhorias Possíveis

- [ ] Adicionar mais templates de design
- [ ] Suporte a fontes customizadas
- [ ] Preview com zoom
- [ ] Exportar em outros formatos (DOCX, HTML)
- [ ] Histórico de PDFs gerados
- [ ] Compartilhar templates entre usuários
- [ ] Assinatura digital integrada
- [ ] QR Code automático
- [ ] Integração com email (enviar PDF automaticamente)

---

## 📝 Notas Importantes

1. **Performance**: Geração de PDF pode levar alguns segundos (5-15s) dependendo
   da complexidade
2. **Puppeteer**: Requer recursos do sistema (Chrome headless)
3. **Armazenamento**: Templates são salvos em arquivos JSON (migrar para DB em
   produção)
4. **Uploads**: Imagens ficam em `uploads/pdf-customization/` (limpar
   periodicamente)

---

## ✅ Status da Implementação

- ✅ Frontend completo e funcional
- ✅ Backend completo e funcional
- ✅ Integração Frontend ↔ Backend
- ✅ Sistema de templates
- ✅ Upload de imagens
- ✅ Customização completa
- ✅ Preview em tempo real
- ✅ Geração de PDF com Puppeteer
- ✅ Dark mode compatível
- ✅ Design System aplicado
- ✅ Documentação completa

---

**🎉 Sistema 100% Implementado e Pronto para Uso!**

**Data**: 06/11/2024  
**Desenvolvedor**: Cursor AI Assistant  
**Status**: ✅ Concluído
