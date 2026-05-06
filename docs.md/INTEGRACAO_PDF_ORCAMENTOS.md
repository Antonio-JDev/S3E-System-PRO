# 🎨 Integração do Sistema de PDF Customization na Página de Orçamentos

## ✅ Implementação Concluída!

O sistema de customização de PDF foi **integrado com sucesso** na página de
orçamentos!

---

## 🎯 O Que Foi Implementado

### 1. **Botão "Personalizar PDF" nos Cards**

- Cada orçamento na listagem agora tem um botão **"PDF"** com ícone de
  customização
- Visual: Gradiente roxo/indigo, destaque visual
- Ação: Abre o modal de customização de PDF

### 2. **Botão "Personalizar PDF" no Modal de Detalhes**

- Ao visualizar um orçamento, há o botão **"🎨 Personalizar PDF"**
- Substitui o antigo botão "Gerar PDF"
- Permite personalização completa antes de gerar

### 3. **Preparação Automática de Dados**

- Função `prepararDadosParaPDF()` converte orçamento para formato do PDF
- Busca dados completos do cliente automaticamente
- Inclui todos os campos:
  - Informações básicas (número, data, validade)
  - Cliente (nome, CPF/CNPJ, endereço, telefone, email)
  - Projeto (título, descrição, endereço da obra, cidade, bairro, CEP)
  - Prazos (previsão início/término)
  - Itens do orçamento (código, nome, descrição, unidade, quantidade, valores)
  - Financeiro (subtotal, BDI, desconto, impostos, valor total, condição
    pagamento)
  - Observações e descrição técnica
  - Fotos anexadas
  - Dados da empresa

### 4. **Modal de Customização Integrado**

- Abre automaticamente quando usuário clica em "PDF"
- Mostra preview do orçamento com todas as customizações
- Permite editar:
  - Marca d'água (logo da empresa, texto, posição, opacidade)
  - Cores e design (templates pré-definidos ou customizados)
  - Conteúdo (o que deve aparecer no PDF)
  - Designs nos cantos
- Salva configurações como templates para reuso

---

## 🚀 Como Usar (Usuário Final)

### Passo 1: Acessar Orçamentos

1. Entre no sistema
2. Navegue para **Orçamentos**
3. Visualize a lista de orçamentos criados

### Passo 2: Escolher Orçamento

Você tem duas opções:

#### Opção A: Diretamente do Card

- Na listagem, clique no botão **"PDF"** (roxo/indigo) no card do orçamento
- O modal de customização abre imediatamente

#### Opção B: Após Visualizar Detalhes

1. Clique em **"Ver"** (azul) para abrir detalhes do orçamento
2. Revise todas as informações
3. Clique em **"🎨 Personalizar PDF"** (roxo, no rodapé)

### Passo 3: Personalizar o PDF

#### 💧 Aba: Marca d'Água

1. **Escolha o tipo**:
   - **Nenhuma**: PDF sem marca d'água
   - **Logo/Imagem**: Faça upload do logo da empresa
   - **Texto**: Digite um texto (ex: "CONFIDENCIAL", "S3E Engenharia")
   - **Design**: Use um design decorativo

2. **Configurações** (se escolheu logo ou texto):
   - **Posição**: Centro, Diagonal, Cabeçalho, Rodapé, etc.
   - **Tamanho**: Pequeno, Médio ou Grande
   - **Opacidade**: Ajuste de 5% a 50% (use o slider)
   - **Rotação**: -45° a 45° (use o slider)
   - **Cor** (se texto): Escolha a cor no seletor

#### 🎨 Aba: Design & Cores

1. **Escolha um template de cores**:
   - **S3E Engenharia**: Indigo/Purple/Green (padrão)
   - **Profissional**: Blue Dark (formal)
   - **Técnico**: Teal/Amber (técnico)
   - **Elegante**: Purple/Rose (elegante)

2. **Ou personalize as cores**:
   - **Primária**: Cor dos títulos e headers
   - **Secundária**: Cor dos subtítulos
   - **Destaque**: Cor dos valores e totais

3. **Designs nos cantos** (opcional):
   - Marque a checkbox "Designs nos Cantos"
   - Escolha: Geométrico, Curvas, Linhas ou Customizado
   - Ajuste a opacidade

#### 📄 Aba: Conteúdo

Marque/desmarque o que deseja no PDF:

- ✅ **Cabeçalho da Empresa**: Logo e nome da empresa no topo
- ✅ **Descrições Técnicas**: Detalhes técnicos dos itens
- ✅ **Imagens dos Itens**: Fotos dos materiais/serviços
- ✅ **Códigos dos Itens**: SKU/código de cada item
- ✅ **Avisos de Segurança**: Normas NBR 5410 e NR-10
- ✅ **Espaço para Assinaturas**: Cliente e empresa
- ✅ **Termos e Condições**: Termos contratuais
- ✅ **Informações de Pagamento**: Condições de pagamento
- ✅ **Rodapé da Empresa**: Contato e CNPJ no rodapé

#### 👁️ Aba: Pré-visualização

- Veja como o PDF ficará em tempo real
- Todas as mudanças aparecem instantaneamente
- **Salvar como Template** (opcional):
  - Clique em "Salvar como Template"
  - Digite um nome (ex: "Orçamento Padrão S3E")
  - Use esse template novamente no futuro

### Passo 4: Gerar o PDF

1. Revise todas as configurações no preview
2. Clique no botão **"📄 Gerar PDF Personalizado"** (roxo, rodapé do modal)
3. Aguarde 5-15 segundos (geração do PDF)
4. O PDF será baixado automaticamente!

---

## 💡 Casos de Uso Práticos

### Caso 1: Orçamento Padrão da Empresa

**Objetivo**: PDF com identidade visual da S3E

**Configurações**:

- **Marca d'água**: Logo da S3E (opacidade 15%, centro)
- **Cores**: Template "S3E Engenharia"
- **Designs nos cantos**: Linhas (opacidade 30%)
- **Conteúdo**: Tudo marcado
- **Salvar como**: "Template Padrão S3E" ✅

**Quando usar**: Orçamentos formais para clientes novos

---

### Caso 2: Orçamento Confidencial

**Objetivo**: PDF com marca "CONFIDENCIAL"

**Configurações**:

- **Marca d'água**: Texto "CONFIDENCIAL" (opacidade 20%, diagonal, vermelho)
- **Cores**: Template "Profissional"
- **Designs nos cantos**: Nenhum
- **Conteúdo**: Sem códigos dos itens, sem imagens
- **Salvar como**: "Template Confidencial" ✅

**Quando usar**: Orçamentos sensíveis, licitações

---

### Caso 3: Proposta Técnica Detalhada

**Objetivo**: PDF completo com todas as informações técnicas

**Configurações**:

- **Marca d'água**: Logo da S3E (pequeno, cabeçalho, opacidade 10%)
- **Cores**: Template "Técnico" (Teal/Amber)
- **Designs nos cantos**: Geométrico (opacidade 20%)
- **Conteúdo**:
  - ✅ Descrições técnicas
  - ✅ Códigos dos itens
  - ✅ Avisos de segurança
  - ✅ Imagens dos itens
  - ✅ Termos e condições
- **Salvar como**: "Proposta Técnica Completa" ✅

**Quando usar**: Projetos complexos, obras grandes

---

### Caso 4: Orçamento Simplificado

**Objetivo**: PDF limpo e minimalista

**Configurações**:

- **Marca d'água**: Nenhuma
- **Cores**: Template "Profissional"
- **Designs nos cantos**: Nenhum
- **Conteúdo**: Apenas essencial
  - ✅ Cabeçalho da empresa
  - ✅ Rodapé da empresa
  - ✅ Informações de pagamento
  - ❌ Resto desabilitado
- **Salvar como**: "Template Simplificado" ✅

**Quando usar**: Orçamentos rápidos, clientes conhecidos

---

## 🔄 Reutilização de Templates

### Salvar um Template

1. Configure o PDF como deseja
2. Vá para aba "Pré-visualização"
3. Clique em **"💾 Salvar como Template"**
4. Digite um nome descritivo
5. Confirme

### Carregar um Template

1. Abra o modal de customização
2. Clique em **"Carregar Template"** (futuro)
3. Escolha o template salvo
4. Todas as configurações são aplicadas automaticamente

---

## 🎨 Personalização Avançada

### Upload de Logo Personalizado

1. Aba "Marca d'Água" → Tipo: Logo/Imagem
2. Clique em "Upload da Imagem"
3. Selecione PNG, JPG, SVG ou WebP (máx. 5MB)
4. Ajuste posição, tamanho e opacidade
5. Preview mostra o logo aplicado

### Cores Totalmente Customizadas

1. Aba "Design & Cores"
2. Seção "Cores Personalizadas"
3. Clique no quadrado de cor
4. Escolha a cor exata no seletor
5. Aplique para Primária, Secundária e Destaque

### Designs de Cantos Customizados

1. Aba "Design & Cores"
2. Marque "Designs nos Cantos"
3. Escolha "Customizado"
4. Faça upload da sua imagem SVG/PNG
5. Ajuste opacidade

---

## ⚙️ Dados Incluídos no PDF

### Informações Básicas

- Número do orçamento
- Data de emissão
- Validade

### Cliente

- Nome completo
- CPF/CNPJ
- Endereço (se cadastrado)
- Telefone
- Email

### Projeto

- Título do projeto
- Descrição resumida
- Endereço da obra
- Cidade, Bairro, CEP

### Prazos

- Previsão de início
- Previsão de término

### Itens

Para cada item do orçamento:

- Código do material (se mostrar códigos)
- Nome
- Descrição técnica (se mostrar descrições)
- Unidade de medida
- Quantidade
- Valor unitário
- Valor total

### Cálculo Financeiro

- Subtotal dos itens
- BDI (%) e valor
- Desconto aplicado
- Impostos (%) e valor
- **Valor Total Final** (destaque)
- Condição de pagamento

### Outros

- Observações gerais
- Descrição técnica do projeto
- Fotos anexadas (se mostrar imagens)
- Avisos de segurança (se habilitado)
- Espaço para assinaturas (se habilitado)
- Termos e condições (se habilitado)

### Empresa

- Nome da empresa (S3E Engenharia)
- CNPJ
- Endereço
- Telefone
- Email
- Logo (se configurado como marca d'água)

---

## 🎯 Dicas e Boas Práticas

### ✅ DO (Faça)

- **Salve templates** para orçamentos recorrentes
- **Use marca d'água** com logo da empresa (opacidade 10-20%)
- **Mantenha consistência** nas cores da empresa
- **Revise o preview** antes de gerar
- **Teste diferentes configurações** para encontrar a melhor

### ❌ DON'T (Não Faça)

- **Não use opacidade muito alta** na marca d'água (dificulta leitura)

- **Não exagere** nos designs de cantos (mantenha profissional)
- **Não desabilite** informações essenciais (cliente, valores)
- **Não use cores** muito contrastantes ou vibrantes
- **Não esqueça** de incluir informações de pagamento

---

## 🔧 Troubleshooting

### PDF não está gerando

**Problema**: Cliquei em "Gerar PDF" mas nada aconteceu **Solução**:

1. Verifique conexão com internet

2. Aguarde até 15 segundos (geração pode demorar)
3. Verifique console do navegador (F12)
4. Tente novamente

### Marca d'água não aparece

**Problema**: Configurei marca d'água mas não aparece no PDF, **Solução**:

1. Verifique se o tipo não está em "Nenhuma"
2. Aumente a opacidade (mín. 10%)
3. Verifique se a imagem foi carregada corretamente
4. Teste com texto simples primeiro

### Cores não aplicadas

**Problema**: Escolhi cores mas o PDF não reflete **Solução**:

1. Confirme que clicou em "Gerar PDF Personalizado"
2. Limpe cache do navegador
3. Tente outro template de cores
4. Recarregue a página e tente novamente

### Upload de logo falha

**Problema**: Não consigo fazer upload do logo **Solução**:

1. Verifique tamanho do arquivo (máx. 5MB)
2. Use formato PNG, JPG, SVG ou WebP
3. Comprima a imagem se necessário
4. Tente renomear o arquivo (sem caracteres especiais)

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

- **Consulte esta documentação** primeiro
- **Teste com orçamento simples** para verificar funcionamento
- **Experimente templates padrão** antes de customizar
- **Documente o erro** (tire print) para reportar

---

## 🎉 Recursos Disponíveis

- ✅ Customização total de marca d'água
- ✅ 4 templates de cores profissionais
- ✅ Cores 100% personalizáveis
- ✅ 4 designs de cantos pré-definidos
- ✅ Upload de designs customizados
- ✅ 9 opções de controle de conteúdo
- ✅ Preview em tempo real
- ✅ Sistema de templates reutilizáveis
- ✅ Compatível com dark mode
- ✅ Geração rápida (5-15s)
- ✅ Download automático
- ✅ Qualidade profissional

---

**Desenvolvido por**: Antonio Júnior  
**Integrado em**: 06/11/2025  
**Status**: ✅ Ativo e Funcional  
**Versão**: 1.0.0  
**Aproveite o sistema e crie orçamentos profissionais e personalizados!** 🚀✨
