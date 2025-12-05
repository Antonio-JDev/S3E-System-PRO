import React from 'react';

// ============================================
// ÍCONES PRINCIPAIS - ENGENHARIA ELÉTRICA S3E
// ============================================

// Logo S3E - Raio dentro de hexágono (Energia Elétrica)
export const S3ELogoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polygon points="13 7 8.5 13 11 13 10 17 14.5 11 12 11 13 7" fill="currentColor"/>
  </svg>
);

// Ícone de Materiais/Estoque (Caixa 3D)
export const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <path d="m3.27 6.96 8.73 5.05 8.73-5.05"/>
    <path d="M12 22.08V12"/>
  </svg>
);

// Ícone de Dashboard Executivo (Painel/Gauge)
export const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
        <circle cx="9" cy="9" r="1"/>
        <circle cx="14" cy="14" r="1"/>
        <circle cx="19" cy="9" r="1"/>
    </svg>
);

// Ícone de Orçamentos (Documento com Cifrão/Calculadora)
export const BudgetIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M12 18v-6"/>
        <path d="M9.5 14.5a2.5 2.5 0 0 1 0-3"/>
        <path d="M14.5 14.5a2.5 2.5 0 0 0 0-3"/>
    </svg>
);

// Ícone de Catálogo (Grid de Produtos)
export const CatalogIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
    </svg>
);

// Ícone de Movimentações (Setas de Transferência)
export const MovementIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.1l4 4-4 4" />
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8" />
        <path d="M7 21.9l-4-4 4-4" />
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
    </svg>
);

// Ícone de Logs (Terminal/Console)
export const LogsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
);

// Ícone de Compras (Sacola de Compras)
export const ShoppingBagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
);

// Ícone de Projetos (Blueprint/Planta)
export const BlueprintIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M8 13h2"/>
        <path d="M8 17h2"/>
        <path d="M14 13h2"/>
        <path d="M14 17h2"/>
    </svg>
);

// Ícone de Obras (Capacete de Segurança/Construção)
export const ConstructionIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2Z"/>
        <path d="M9 21V8"/>
        <path d="M15 21V8"/>
    </svg>
);

// Ícone de Métricas de Equipe (Calendário com Pessoas)
export const TeamCalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
        <circle cx="9" cy="16" r="2"/>
        <circle cx="15" cy="16" r="2"/>
        <path d="M12 12v4"/>
    </svg>
);

// Ícone de Ferramentas (Chave Inglesa)
export const ToolsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
);

// Ícone de Clientes (Pessoas/Usuários)
export const ClientsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

// Ícone de Fornecedores (Caminhão de Entrega)
export const SupplierIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
        <path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
    </svg>
);

// Ícone de Serviços de Engenharia Elétrica (Raio dentro de engrenagem)
export const ElectricalServiceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" opacity="0.3"/>
    </svg>
);

// Ícone de Operações Fiscais (Documento com Selo)
export const FiscalOpsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <circle cx="10" cy="16" r="2"/>
        <path d="m16 16-3.5-3.5"/>
    </svg>
);

// ============================================
// ÍCONES AUXILIARES E DE STATUS
// ============================================

// Ícone de Alerta/Aviso
export const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// Ícone de Moeda (Valores Financeiros)
export const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

// Ícone de Raio Elétrico (Energia)
export const BoltIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

// Ícone de Pasta Padrão (uso geral)
export const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
    </svg>
);

// Ícone de Gráfico de Tendência (Crescimento)
export const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
    </svg>
);

// Ícone de Adicionar (Plus)
export const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
);

// Ícone de Documento/Arquivo
export const DocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
    </svg>
);

// Ícone de Financeiro (Gráfico com Cifrão)
export const FinanceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        <polyline points="22 12 18 8 18 16 22 12"/>
        <polyline points="2 12 6 16 6 8 2 12"/>
    </svg>
);

// Ícone de NF-e (Documento Fiscal)
export const InvoiceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M9 15h6"/>
        <path d="M12 12v6"/>
    </svg>
);

// Ícone de Atualização de Preços (Balança/Comparação)
export const CompareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1"/>
        <circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        <path d="M16 8V4"/>
        <path d="M12 8V4"/>
        <path d="M8 8V4"/>
    </svg>
);

// Ícone de Etiqueta de Preço (Cotações)
export const PriceTagIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
);

// Ícone de Vendas/Financeiro (Nota Fiscal com Cifrão)
export const SalesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
        <path d="M16 21V9"/>
        <path d="M12 21V9"/>
    </svg>
);

// Ícone de Gerenciamento Empresarial (Prédio com Gráfico)
export const ManagementIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        <path d="M9 9h1v1H9z"/>
        <path d="M14 9h1v1h-1z"/>
        <path d="M9 13h1v1H9z"/>
        <path d="M14 13h1v1h-1z"/>
    </svg>
);

// Ícone de Tarefas/Checklist
export const TaskListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" ry="2"/>
        <line x1="7" y1="9" x2="11" y2="9"/>
        <line x1="7" y1="13" x2="11" y2="13"/>
        <line x1="7" y1="17" x2="11" y2="17"/>
        <circle cx="15" cy="9" r="1" fill="currentColor"/>
        <circle cx="15" cy="13" r="1" fill="currentColor"/>
        <circle cx="15" cy="17" r="1" fill="currentColor"/>
    </svg>
);

// ============================================
// NAVEGAÇÃO PRINCIPAL DO SISTEMA
// Organizada por Setores de Negócio com RBAC
// ============================================

import { Permission } from '../utils/permissions';

export interface NavLink {
    name: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    devOnly?: boolean; // Legado: apenas desenvolvedor
    requiredPermission?: Permission; // Nova: permissão específica necessária
}

export const navLinks: NavLink[] = [
    // ========== GERAL / INÍCIO ==========
    // Dashboard não tem permissão específica - aparece para todos
    { name: 'Dashboard', icon: DashboardIcon },
    
    // ========== COMERCIAL / VENDAS ==========
    // Todas as páginas comerciais precisam de permissões (eletricista não vê)
    { name: 'Clientes', icon: ClientsIcon, requiredPermission: 'view_projetos' },
    { name: 'Orçamentos', icon: BudgetIcon, requiredPermission: 'view_projetos' },
    { name: 'Vendas', icon: SalesIcon, requiredPermission: 'view_vendas' },
    { name: 'Cotações', icon: PriceTagIcon, requiredPermission: 'view_projetos' },
    
    // ========== SUPRIMENTOS / ESTOQUE ==========
    // Fornecedores, Compras, Estoque, Catálogo, Comparação precisam de permissões
    { name: 'Fornecedores', icon: SupplierIcon, requiredPermission: 'view_projetos' },
    { name: 'Compras', icon: ShoppingBagIcon, requiredPermission: 'view_projetos' },
    { name: 'Estoque', icon: CubeIcon, requiredPermission: 'view_catalogo' },
    { name: 'Movimentações', icon: MovementIcon, requiredPermission: 'view_movimentacoes' },
    { name: 'Catálogo', icon: CatalogIcon, requiredPermission: 'view_catalogo' },
    { name: 'Atualização de Preços', icon: CompareIcon, requiredPermission: 'view_comparacao_precos' },
    
    // ========== OPERACIONAL / PROJETOS ==========
    { name: 'Projetos', icon: BlueprintIcon, requiredPermission: 'view_projetos' },
    { name: 'Obras', icon: ConstructionIcon, requiredPermission: 'view_obras' },
    { name: 'Tarefas da Obra', icon: TaskListIcon, requiredPermission: 'view_tarefas_obra' },
    { name: 'Ferramentas', icon: ToolsIcon, requiredPermission: 'view_gestao_obras' },
    { name: 'Métricas de Equipe', icon: TeamCalendarIcon, requiredPermission: 'view_gestao_obras' },
    { name: 'Serviços', icon: ElectricalServiceIcon, requiredPermission: 'view_servicos' },
    
    // ========== FINANCEIRO / CONTÁBIL ==========
    { name: 'Financeiro', icon: FinanceIcon, requiredPermission: 'view_financeiro' },
    { name: 'Emissão NF-e', icon: InvoiceIcon, requiredPermission: 'view_nfe' },
    { name: 'Logs', icon: LogsIcon, devOnly: true, requiredPermission: 'view_logs' }, // Desenvolvedor apenas
    
    // ========== GERENCIAMENTO / ADMINISTRATIVO ==========
    { name: 'Gerenciamento Empresarial', icon: ManagementIcon, requiredPermission: 'view_gerenciamento' },
];
