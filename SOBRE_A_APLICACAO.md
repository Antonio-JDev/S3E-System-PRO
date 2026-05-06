# S3E System PRO - Sistema de Gestão para Engenharia Elétrica

## 📋 Visão Geral

O **S3E System PRO** é um sistema ERP (Enterprise Resource Planning) completo e
profissional desenvolvido especificamente para empresas de engenharia elétrica.
A aplicação oferece uma solução integrada para gerenciar todo o ciclo de vida de
projetos elétricos, desde a criação de orçamentos até a execução de obras e
controle financeiro.

## 🎯 Objetivo

O sistema foi desenvolvido para centralizar e automatizar os processos
operacionais, administrativos e financeiros de empresas de engenharia elétrica,
proporcionando:

- **Gestão completa de orçamentos** com geração automática de PDFs profissionais
- **Controle de projetos e obras** com acompanhamento em tempo real
- **Gestão de estoque e materiais** elétricos
- **Controle financeiro** (contas a pagar, receber, vendas)
- **Gestão de equipes e alocações** de técnicos
- **Emissão de notas fiscais eletrônicas**
- **Relatórios e dashboards** analíticos

## 🏗️ Arquitetura

A aplicação segue uma arquitetura **full-stack** moderna:

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: JWT (JSON Web Tokens)
- **Geração de PDFs**: Puppeteer
- **Containerização**: Docker e Docker Compose

## 📦 Módulos Principais

### 1. **Dashboard**

Visão geral do sistema com métricas em tempo real:

- Estatísticas de projetos, orçamentos e vendas
- Alertas críticos (estoque baixo, contas vencidas)
- Projetos em andamento
- Movimentações recentes
- Ações rápidas

### 2. **Orçamentos**

Sistema completo de criação e gestão de orçamentos:

- Criação de orçamentos com materiais, kits, serviços e cotações
- Cálculo automático de custos e margens (BDI)
- Geração de PDFs profissionais com folha timbrada personalizável
- Templates de PDF customizáveis por usuário
- Histórico de alterações
- Importação/exportação de templates
- Fotos e descrições técnicas avançadas

### 3. **Catálogo de Materiais**

Gestão completa do catálogo de produtos:

- Cadastro de materiais elétricos com SKU, preços e estoque
- Categorização (Material Elétrico, Insumo, Ferramenta)
- Controle de estoque mínimo
- Histórico de preços
- Atualização em massa via CSV/JSON
- Vinculação com fornecedores

### 4. **Kits e Quadros Elétricos**

Sistema de composição de kits:

- Criação de kits modulares (medidores, comando, quadros elétricos, subestações)
- Controle de estoque para kits
- Identificação de itens faltantes
- Quadros elétricos prontos com componentes pré-configurados

### 5. **Serviços**

Cadastro de serviços oferecidos:

- Tipos: Instalação, Manutenção, Consultoria, Laudo Técnico
- Preços e unidades de medida (unidade, hora, m²)
- Integração com orçamentos

### 6. **Projetos**

Gestão completa do ciclo de vida de projetos:

- Criação a partir de orçamentos aprovados
- Status: Proposta, Validado, Aprovado, Execução, Concluído, Cancelado
- Kanban board para acompanhamento visual
- Tarefas e responsáveis
- Etapas administrativas (Abertura SR, Emissão ART, etc.)
- Tarefas de campo com status e progresso

### 7. **Obras**

Controle operacional de obras em execução:

- Status: Backlog, A Fazer, Andamento, Concluído
- Tarefas de obra com atribuição de equipes ou eletricistas
- Registros de atividades diárias com fotos
- Acompanhamento de progresso
- Gestão de equipes e alocações

### 8. **Gestão de Obras e Equipes**

Sistema avançado de alocação de recursos:

- Criação e gestão de equipes (Montagem, Campo, Distinta)
- Calendário de alocações
- Gráfico de Gantt para visualização de cronogramas
- Alocação de equipes ou eletricistas individuais
- Controle de disponibilidade

### 9. **Clientes**

CRM básico para gestão de clientes:

- Cadastro completo (CPF/CNPJ, contatos, endereço)
- Histórico de orçamentos e projetos
- Status ativo/inativo

### 10. **Fornecedores**

Gestão de fornecedores:

- Cadastro com CNPJ e dados de contato
- Vinculação com materiais
- Histórico de compras e cotações

### 11. **Compras**

Controle de compras e entrada de materiais:

- Registro de notas fiscais de compra
- Importação de XML de NFe
- Itens de compra vinculados a materiais
- Controle de recebimento
- Atualização automática de estoque

### 12. **Estoque e Movimentações**

Controle detalhado de estoque:

- Movimentações (Entrada, Saída, Ajuste)
- Histórico completo de movimentações
- Rastreamento por material
- Alertas de estoque mínimo

### 13. **Cotações (Banco Frio)**

Sistema de banco de cotações:

- Armazenamento de cotações de materiais
- Data de atualização
- Uso em orçamentos quando material não está em estoque
- Vinculação com fornecedores

### 14. **Vendas**

Gestão de vendas:

- Criação a partir de orçamentos aprovados
- Controle de parcelas e formas de pagamento
- Geração automática de contas a receber
- Status de venda

### 15. **Financeiro**

Módulo financeiro completo:

#### Contas a Receber

- Parcelas de vendas
- Controle de vencimentos
- Status de pagamento

#### Contas a Pagar

- Contas de fornecedores
- Despesas fixas (aluguel, energia, etc.)
- Despesas de RH (salários)
- Controle de vencimentos e pagamentos

#### Despesas Fixas

- Cadastro de despesas recorrentes
- Controle mensal de pagamentos
- Categorização (Aluguel, Energia, Água, Internet, etc.)

### 16. **Notas Fiscais Eletrônicas (NFe)**

Emissão e gestão de NFes:

- Integração com certificado digital
- Emissão de NFe de produtos e serviços
- Vinculação com projetos
- Controle de status (Pendente, Autorizada, Cancelada)

### 17. **Gerenciamento Empresarial**

#### Funcionários

- Cadastro de funcionários
- Controle de salários e admissões
- Status (Ativo, Inativo, Férias, Afastado)

#### Vales

- Vale transporte
- Vale alimentação
- Adiantamentos
- Controle por funcionário

#### Frota de Veículos

- Cadastro de veículos
- Controle de quilometragem
- Gastos (combustível, manutenção, seguro, IPVA, multas)
- Vinculação com obras

#### Planos Estratégicos

- Gestão de planos e metas da empresa
- Controle de prazos e responsáveis
- Categorização e priorização

### 18. **Relatórios**

Sistema de relatórios e análises:

- Relatórios financeiros
- Relatórios de estoque
- Relatórios de projetos
- Exportação em Excel/PDF

### 19. **Configurações**

Personalização do sistema:

- Configurações da empresa (logo, nome, contatos)
- Tema claro/escuro
- Templates de PDF personalizados
- Configurações fiscais (empresas, certificados)

### 20. **Auditoria e Logs**

Sistema completo de auditoria:

- Logs de todas as ações dos usuários
- Rastreamento de alterações
- Histórico de acessos
- Logs de sistema

## 🔐 Segurança e Permissões

O sistema implementa **RBAC (Role-Based Access Control)** com os seguintes
perfis:

- **Admin**: Acesso total ao sistema
- **Orçamentista**: Criação e gestão de orçamentos
- **Compras**: Gestão de compras e fornecedores
- **Gerente**: Acesso a relatórios e gestão operacional
- **Técnico**: Acesso a obras e tarefas de campo
- **Desenvolvedor**: Acesso técnico ao sistema

## 🚀 Funcionalidades Técnicas

### Geração de PDFs

- Geração automática de PDFs de orçamentos
- Folha timbrada personalizável
- Marca d'água configurável
- Templates salvos por usuário
- Exportação profissional

### Importação/Exportação

- Importação de materiais via CSV/JSON
- Exportação de templates de orçamento
- Importação de XML de NFe
- Exportação de relatórios

### Integrações

- API REST completa
- Integração com sistemas fiscais
- Suporte a certificados digitais

### Performance

- Dashboard com dados em tempo real
- Cache de dados frequentes
- Otimização de consultas ao banco
- Paginação em listagens grandes

## 📊 Banco de Dados

O sistema utiliza **PostgreSQL** com **Prisma ORM** e possui mais de 30 modelos
principais:

- Usuários e Autenticação
- Clientes e Fornecedores
- Materiais, Kits e Serviços
- Orçamentos e Itens
- Projetos e Tarefas
- Obras e Alocações
- Equipes e Eletricistas
- Compras e Movimentações
- Vendas e Financeiro
- Notas Fiscais
- Funcionários, Veículos e Despesas
- Logs e Auditoria

## 🎨 Interface do Usuário

- **Design Moderno**: Interface limpa e intuitiva
- **Responsivo**: Funciona em desktop, tablet e mobile
- **Tema Escuro/Claro**: Suporte a ambos os temas
- **Componentes Reutilizáveis**: Biblioteca de componentes UI
- **Feedback Visual**: Notificações e alertas em tempo real

## 📱 Tecnologias Utilizadas

### Frontend

- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Axios
- Sonner (notificações)
- Jodit Editor (editor de texto rico)
- Lucide React (ícones)

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (autenticação)
- Puppeteer (PDFs)
- Zod (validação)
- Multer (upload de arquivos)

### DevOps

- Docker
- Docker Compose
- Nginx (proxy reverso)
- Git

## 🔄 Fluxo de Trabalho Típico

1. **Orçamento**: Criação de orçamento com materiais, kits e serviços
2. **Aprovação**: Cliente aprova o orçamento
3. **Venda**: Conversão do orçamento em venda
4. **Projeto**: Criação de projeto a partir do orçamento aprovado
5. **Obra**: Início da execução da obra
6. **Alocação**: Alocação de equipes e eletricistas
7. **Execução**: Acompanhamento de tarefas e registros de atividades
8. **Conclusão**: Finalização da obra e emissão de NFe
9. **Financeiro**: Controle de recebimentos e pagamentos

## 📈 Benefícios

- **Centralização**: Todas as informações em um único sistema
- **Automação**: Redução de trabalho manual e erros
- **Rastreabilidade**: Histórico completo de todas as operações
- **Eficiência**: Otimização de processos operacionais
- **Controle**: Visão completa do negócio em tempo real
- **Profissionalismo**: Documentos e relatórios de alta qualidade

## 🎯 Público-Alvo

Empresas de engenharia elétrica que necessitam:

- Gerenciar múltiplos projetos simultaneamente
- Controlar estoque de materiais elétricos
- Gerar orçamentos profissionais
- Acompanhar execução de obras
- Controlar aspectos financeiros e fiscais
- Gerenciar equipes técnicas

---

**Desenvolvido por**: Antonio Junior dos Santos  
**Versão**: 1.0.0  
**Licença**: Proprietária
