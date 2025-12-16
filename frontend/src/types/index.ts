export interface Membro {
    id: string;
    nome: string;
    email: string;
    role: string;
}

export interface Equipe {
    id: string;
    nome: string;
    tipo: 'MONTAGEM' | 'CAMPO' | 'DISTINTA';
    membros: Membro[];
    ativa: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Alocacao {
    id: string;
    equipeId?: string | null;
    eletricistaId?: string | null;
    projetoId: string;
    dataInicio: string;
    dataFim: string;
    dataFimPrevisto?: string;
    status: 'Planejada' | 'EmAndamento' | 'Concluida' | 'Cancelada';
    observacoes?: string;
    equipe?: Equipe | null;
    eletricista?: {
        id: string;
        nome: string;
        email: string;
        role: string;
    } | null;
    projeto?: any;
}

export interface Obra {
    id: string;
    nomeObra: string;
    status: 'BACKLOG' | 'A_FAZER' | 'ANDAMENTO' | 'CONCLUIDO';
    dataPrevistaInicio?: string;
    dataPrevistaFim?: string;
    dataInicioReal?: string;
    projeto?: {
        titulo: string;
        cliente?: {
            nome: string;
        };
    };
    cliente?: {
        nome: string;
    };
}

// Tipos para Catálogo
export enum CatalogItemType {
    Produto = 'Produto',
    Kit = 'Kit',
    Servico = 'Servico'
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    type: CatalogItemType.Produto;
    createdAt?: string;
    updatedAt?: string;
}

export interface Kit {
    id: string;
    nome: string;
    descricao?: string;
    preco?: number;
    tipo?: string;
    ativo?: boolean;
    items?: KitProduct[];
    itensFaltantes?: any[];
    temItensCotacao?: boolean;
    statusEstoque?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface KitProduct {
    id?: string;
    materialId: string;
    quantidade: number;
    material?: any;
}

export interface Service {
    id: string;
    nome: string;
    codigo?: string; // Código interno do serviço
    descricao?: string;
    preco?: number;
    tipo?: ServiceType;
    unidade?: string; // Unidade de medida: un, m², m³, m, diaria
    ativo?: boolean;
    createdAt?: string;
    updatedAt?: string;
    // Aliases para compatibilidade com código legado
    name?: string;
    internalCode?: string;
    description?: string;
    price?: number;
    type?: ServiceType;
}

export enum ServiceType {
    Instalacao = 'Instalacao',
    Manutencao = 'Manutencao',
    Consultoria = 'Consultoria',
    LaudoTecnico = 'LaudoTecnico',
    Outro = 'Outro'
}

export interface ServiceCatalogItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    type: CatalogItemType.Servico;
    serviceType?: ServiceType;
    createdAt?: string;
    updatedAt?: string;
}

export interface KitService {
    id?: string;
    servicoId: string;
    quantidade: number;
    servico?: any;
}

export interface KitConfiguration {
    nome: string;
    descricao?: string;
    items: KitProduct[];
    servicos?: KitService[];
    precoSugerido?: number;
}

export interface MaterialItem {
    id: string;
    nome: string;
    name: string; // Alias para compatibilidade
    sku?: string;
    tipo?: string;
    type?: string; // Alias para compatibilidade
    categoria?: string;
    category?: string | MaterialCategory; // Alias para compatibilidade
    descricao?: string;
    description?: string; // Alias para compatibilidade
    ncm?: string;
    unidadeMedida?: string; // Unidade de estoque/compra
    unitOfMeasure?: string; // Alias para compatibilidade
    unidadeVenda?: string; // Unidade de venda (pode ser diferente da unidade de estoque)
    tipoMaterial?: 'BARRAMENTO_COBRE' | 'TRILHO_DIN' | 'CABO' | 'PADRAO'; // Tipo especial para conversão de unidades
    preco?: number;
    price?: number; // Alias para compatibilidade
    valorVenda?: number;
    porcentagemLucro?: number;
    estoque?: number;
    stock?: number; // Alias para compatibilidade
    estoqueMinimo?: number;
    minStock?: number; // Alias para compatibilidade
    localizacao?: string;
    location?: string; // Alias para compatibilidade
    imagemUrl?: string;
    imageUrl?: string; // Alias para compatibilidade
    fornecedorId?: string;
    supplierId?: string; // Alias para compatibilidade
    fornecedor?: {
        id: string;
        nome: string;
    };
    supplier?: { // Alias para compatibilidade
        id: string;
        nome: string;
        name?: string;
    };
    supplierName?: string; // Alias para compatibilidade
    ativo?: boolean;
}

// Materiais vinculados a projetos (BOM)
export enum ProjectMaterialStatus {
    Alocado = 'Alocado',
    Pendente = 'Pendente',
    EmFalta = 'Em falta'
}

export interface ProjectMaterial {
    id: string;
    materialId: string;
    requiredQuantity: number;
    status: ProjectMaterialStatus;
    material?: MaterialItem;
}

export interface CatalogItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    type: CatalogItemType;
    createdAt?: string;
    updatedAt?: string;
    temItensCotacao?: boolean;
    itensFaltantes?: any[];
    statusEstoque?: string;
    isActive?: boolean;
}

// Tipos para Movimentações
export enum MovementType {
    Entrada = 'ENTRADA',
    Saida = 'SAIDA',
    Ajuste = 'AJUSTE'
}

export interface StockMovement {
    id: string;
    materialId: string;
    tipo: MovementType;
    quantidade: number;
    motivo?: string;
    motivoMovimentacao?: string;
    referencia?: string;
    observacoes?: string;
    data?: string;
    createdAt: string;
    material?: MaterialItem;
    usuarioId?: string;
}

export enum StockLevel {
    CRITICO = 'CRITICO',
    BAIXO = 'BAIXO',
    NORMAL = 'NORMAL',
    ALTO = 'ALTO'
}

// Tipos para Compras
export enum PurchaseStatus {
    Pendente = 'Pendente',
    Recebido = 'Recebido',
    Cancelado = 'Cancelado'
}

export interface PurchaseOrderItem {
    id?: string;
    // Campos usados no modelo antigo de compra
    materialId?: string;
    quantidade?: number;
    precoUnitario?: number;
    subtotal?: number;
    material?: MaterialItem;
    // Campos usados nas telas/serviços atuais de compras
    productId?: string;
    productName?: string;
    quantity?: number;
    unitCost?: number;
    totalCost?: number;
    ncm?: string;
    sku?: string;
    unidadeMedida?: string; // Unidade de medida do material (ex: un, m, cm, kg, etc)
}

export interface PurchaseOrder {
    obraId?: string; // ✅ NOVO: Obra vinculada (para compras avulsas)
    obra?: { // ✅ NOVO: Dados da obra (quando carregada)
        id: string;
        nomeObra: string;
        status: string;
    };
    id: string;
    // Campos originais
    fornecedorId?: string;
    numero?: string;
    data?: string;
    status: PurchaseStatus;
    valorTotal?: number;
    observacoes?: string;
    items: PurchaseOrderItem[];
    fornecedor?: Supplier;
    createdAt?: string;
    updatedAt?: string;
    // Campos usados pelas telas/serviços atuais (compatíveis com backend modernizado)
    supplierId?: string;
    supplierName?: string;
    orderDate?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    notes?: string;
    // Data efetiva de recebimento da remessa
    dataRecebimento?: string | null;
}

export interface Supplier {
    id: string;
    nome: string;
    razaoSocial?: string;
    cnpj?: string;
    cpf?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    categoria?: SupplierCategory;
    ativo?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export enum SupplierCategory {
    ELETRICO = 'ELETRICO',
    CONSTRUCAO = 'CONSTRUCAO',
    GERAL = 'GERAL'
}

// Tipos para Materiais
export enum MaterialCategory {
    ELETRICO = 'ELETRICO',
    FERRAMENTA = 'FERRAMENTA',
    SEGURANCA = 'SEGURANCA',
    OUTRO = 'OUTRO'
}

// Tipo de Serviço
export enum TipoServico {
    MAO_DE_OBRA = 'MAO_DE_OBRA',
    MONTAGEM = 'MONTAGEM',
    ENGENHARIA = 'ENGENHARIA',
    PROJETOS = 'PROJETOS',
    ADMINISTRATIVO = 'ADMINISTRATIVO'
}

// Tipos para Projetos
export enum ProjectStatus {
    PLANEJAMENTO = 'PLANEJAMENTO',
    ANDAMENTO = 'ANDAMENTO',
    CONCLUIDO = 'CONCLUIDO',
    CANCELADO = 'CANCELADO'
}

export interface Project {
    id: string;
    titulo: string;
    descricao?: string;
    clienteId: string;
    status: ProjectStatus;
    dataInicio?: string;
    dataFim?: string;
    cliente?: {
        id: string;
        nome: string;
    };
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectStage {
    id: string;
    projetoId: string;
    nome: string;
    descricao?: string;
    ordem: number;
    status: ProjectStageStatus;
    dataInicio?: string;
    dataFim?: string;
}

export enum ProjectStageStatus {
    NAO_INICIADO = 'NAO_INICIADO',
    EM_ANDAMENTO = 'EM_ANDAMENTO',
    CONCLUIDO = 'CONCLUIDO'
}

// Etapas administrativas do projeto (checklist interno)
export enum AdminStageStatus {
    Pending = 'Pending',
    InProgress = 'InProgress',
    Completed = 'Completed'
}

export interface AdminStage {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    order: number;
    status: AdminStageStatus;
    completedAt?: string | null;
}

// Itens de controle de qualidade em projetos
export enum QCCheckStatus {
    Pendente = 'Pendente',
    Aprovado = 'Aprovado',
    Reprovado = 'Reprovado'
}

export interface QualityCheckItem {
    id: string;
    projectId: string;
    description: string;
    status: QCCheckStatus;
    createdAt?: string;
    updatedAt?: string;
}

// Tipos para Usuários
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt?: string;
    updatedAt?: string;
}

export enum UserRole {
    ADMIN = 'admin',
    GERENTE = 'gerente',
    ENGENHEIRO = 'engenheiro',
    ELETRICISTA = 'eletricista',
    DESENVOLVEDOR = 'desenvolvedor'
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

// Tipos para Orçamentos/Vendas
export enum BudgetStatus {
    RASCUNHO = 'RASCUNHO',
    ENVIADO = 'ENVIADO',
    APROVADO = 'APROVADO',
    REJEITADO = 'REJEITADO',
    CONVERTIDO = 'CONVERTIDO',
    // Status usados no módulo de CRM/Clientes
    Aprovado = 'Aprovado',
    Pendente = 'Pendente',
    Recusado = 'Recusado'
}

// Tipos para Clientes (módulo legado simples)
export interface Cliente {
    id: string;
    nome: string;
    razaoSocial?: string;
    cpfCnpj?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    ativo?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// ================= CRM / Clientes Modernos =================

export enum ClientType {
    PessoaFisica = 'Pessoa Física',
    PessoaJuridica = 'Pessoa Jurídica'
}

export enum ClientStatus {
    Ativo = 'Ativo',
    Inativo = 'Inativo',
    Potencial = 'Potencial',
    Retroativo = 'Retroativo'
}

export enum ContactPreference {
    Telefone = 'Telefone',
    Email = 'Email',
    WhatsApp = 'WhatsApp',
    Nenhuma = 'Nenhuma'
}

export enum ClientSource {
    Indicacao = 'Indicação',
    Google = 'Google',
    RedesSociais = 'Redes sociais',
    Site = 'Site',
    Outro = 'Outro'
}

export enum OpportunityStatus {
    Qualificacao = 'Qualificação',
    Proposta = 'Proposta',
    Negociacao = 'Negociação',
    Ganha = 'Ganha',
    Perdida = 'Perdida'
}

export enum InteractionType {
    Reuniao = 'Reunião',
    Ligacao = 'Ligação',
    Email = 'E-mail',
    Visita = 'Visita',
    Outro = 'Outro'
}

export enum ProjectType {
    Obra = 'Obra',
    Manutencao = 'Manutenção',
    Consultoria = 'Consultoria',
    Outro = 'Outro'
}

export interface Opportunity {
    id: string;
    clientId: string;
    title: string;
    value: number;
    status: OpportunityStatus;
    createdDate: string;
}

export interface Interaction {
    id: string;
    clientId: string;
    date: string;
    type: InteractionType;
    summary: string;
    user: string;
}

export interface Budget {
    id: string;
    clientId: string;
    projectName: string;
    total: number;
    status: BudgetStatus;
}

export interface ProjectHistoryItem {
    projectId: string;
    projectName: string;
    date: string;
    type?: ProjectType;
}

export interface Client {
    id: string;
    name: string;
    type: ClientType;
    document?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    status: ClientStatus;
    contactPreference: ContactPreference;
    source: ClientSource;
    createdAt?: string;
    updatedAt?: string;
    opportunities: Opportunity[];
    salesOrders?: any[];
    interactions: Interaction[];
    projectHistory: ProjectHistoryItem[];
}

// Tipos para Dashboard
export interface StatCardData {
    title: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
}

// Tipos para Atualização de Preços
export enum PriceComparisonStatus {
    PENDENTE = 'PENDENTE',
    ATUALIZADO = 'ATUALIZADO',
    ERRO = 'ERRO'
}

export interface PriceComparisonItem {
    id: string;
    materialId: string;
    materialNome: string;
    precoAtual: number;
    precoNovo: number;
    diferenca: number;
    percentualDiferenca: number;
    status: PriceComparisonStatus;
    fornecedor?: string;
    dataAtualizacao?: string;
}

export interface PriceComparisonImport {
    items: PriceComparisonItem[];
    totalItens: number;
    itensAtualizados: number;
    itensComErro: number;
    dataImportacao: string;
}
