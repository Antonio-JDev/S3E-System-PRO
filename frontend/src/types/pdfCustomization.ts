/**
 * Types e Interfaces para Customização de PDF
 * Sistema completo de personalização de orçamentos em PDF
 */

export type WatermarkType = 'logo' | 'text' | 'design' | 'none';
export type WatermarkPosition = 'center' | 'corners' | 'full-page' | 'header' | 'footer' | 'diagonal';
export type WatermarkSize = 'small' | 'medium' | 'large';

export type TemplateType = 'modern' | 'classic' | 'technical' | 'minimal';
export type CornerDesignType = 'geometric' | 'curves' | 'lines' | 'custom' | 'none';
export type FontFamily = 'arial' | 'times' | 'helvetica' | 'roboto' | 'custom';
export type FontSize = 'small' | 'medium' | 'large';

export interface WatermarkConfig {
    type: WatermarkType;
    content: string; // URL da imagem ou texto
    position: WatermarkPosition;
    opacity: number; // 0.1 a 1.0
    size: WatermarkSize;
    rotation: number; // -45 a 45 graus
    color?: string; // Para marca d'água de texto
}

export interface CornerDesignConfig {
    enabled: boolean;
    design: CornerDesignType;
    image?: string; // URL para designs customizados
    opacity: number; // 0.1 a 1.0
    size: number; // Tamanho em pixels (50-200)
}

export interface DesignColors {
    primary: string; // Cor principal (headers, títulos)
    secondary: string; // Cor secundária (subtítulos, detalhes)
    accent: string; // Cor de destaque (valores, destaques)
    background: string; // Cor de fundo
    text: string; // Cor do texto principal
}

export interface TypographyConfig {
    fontFamily: FontFamily;
    fontSize: FontSize;
    customFontUrl?: string; // Para fontes customizadas
}

export interface DesignConfig {
    template: TemplateType;
    colors: DesignColors;
    corners: CornerDesignConfig;
    typography: TypographyConfig;
    // Layout
    orientation: 'portrait' | 'landscape';
    pageSize: 'A4' | 'Letter';
    margins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface ContentConfig {
    showTechnicalDescriptions: boolean;
    showImages: boolean;
    includeSafetyWarnings: boolean;
    showCompanyHeader: boolean;
    showCompanyFooter: boolean;
    showSignatures: boolean;
    showTermsAndConditions: boolean;
    showPaymentInfo: boolean;
    showItemCodes: boolean;
    showItemImages: boolean;
}

export interface TemplateMetadata {
    templateName: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt?: Date;
    userId?: string;
    description?: string;
}

export interface PDFCustomization {
    watermark: WatermarkConfig;
    design: DesignConfig;
    content: ContentConfig;
    metadata: TemplateMetadata;
}

// Template salvo no banco de dados
export interface SavedPDFTemplate {
    id: string;
    userId: string;
    templateName: string;
    description?: string;
    customization: PDFCustomization;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Dados do orçamento para geração de PDF
export interface OrcamentoPDFData {
    // Informações básicas
    numero: string;
    data: string;
    validade: string;
    
    // Cliente
    cliente: {
        nome: string;
        cpfCnpj: string;
        endereco?: string;
        telefone?: string;
        email?: string;
    };
    
    // Projeto
    projeto: {
        titulo: string;
        descricao?: string;
        enderecoObra?: string;
        cidade?: string;
        bairro?: string;
        cep?: string;
        responsavelObra?: string;
    };
    
    // Prazos
    prazos?: {
        previsaoInicio?: string;
        previsaoTermino?: string;
        prazoExecucao?: string;
    };
    
    // Itens
    items: {
        codigo?: string;
        nome: string;
        descricao?: string;
        unidade: string;
        quantidade: number;
        valorUnitario: number;
        valorTotal: number;
        imagem?: string;
    }[];
    
    // Cálculos financeiros
    financeiro: {
        subtotal: number;
        bdi: number;
        valorComBDI: number;
        desconto: number;
        impostos: number;
        valorTotal: number;
        condicaoPagamento: string;
    };
    
    // Observações e termos
    observacoes?: string;
    descricaoTecnica?: string;
    fotos?: {
        url: string;
        legenda: string;
    }[];
    termosCondicoes?: string;
    
    // Empresa
    empresa?: {
        nome: string;
        cnpj: string;
        endereco: string;
        telefone: string;
        email: string;
        logo?: string;
    };
}

// Dados do kit de ferramentas para geração de PDF
export interface KitFerramentasPDFData {
    // Informações básicas
    numero: string;
    data: string;
    
    // Kit
    kit: {
        nome: string;
        descricao?: string;
        observacoes?: string;
    };
    
    // Eletricista
    eletricista: {
        nome: string;
        email?: string;
    };
    
    // Ferramentas
    ferramentas: {
        codigo: string;
        nome: string;
        categoria: string;
        marca?: string;
        modelo?: string;
        quantidade: number;
        estadoEntrega: string;
        observacoes?: string;
    }[];
    
    // Data de entrega
    dataEntrega: string;
    
    // Empresa
    empresa?: {
        nome: string;
        cnpj: string;
        endereco: string;
        telefone: string;
        email: string;
        logo?: string;
    };
}

// Request para geração de PDF
export interface GeneratePDFRequest {
    orcamentoData: OrcamentoPDFData;
    customization: PDFCustomization;
    saveAsTemplate?: boolean;
    templateName?: string;
}

// Request para geração de PDF de Kit
export interface GenerateKitPDFRequest {
    kitData: KitFerramentasPDFData;
    customization: PDFCustomization;
    saveAsTemplate?: boolean;
    templateName?: string;
}

// Response da geração
export interface GeneratePDFResponse {
    success: boolean;
    pdfUrl?: string;
    pdfBase64?: string;
    fileName: string;
    error?: string;
}

// Defaults
export const DEFAULT_PDF_CUSTOMIZATION: PDFCustomization = {
    watermark: {
        type: 'none',
        content: '',
        position: 'center',
        opacity: 0.1,
        size: 'medium',
        rotation: -45,
        color: '#cccccc'
    },
    design: {
        template: 'modern',
        colors: {
            primary: '#6366F1', // Indigo
            secondary: '#8B5CF6', // Purple
            accent: '#10B981', // Green
            background: '#FFFFFF',
            text: '#1F2937'
        },
        corners: {
            enabled: false,
            design: 'none',
            opacity: 0.3,
            size: 100
        },
        typography: {
            fontFamily: 'helvetica',
            fontSize: 'medium'
        },
        orientation: 'portrait',
        pageSize: 'A4',
        margins: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        }
    },
    content: {
        showTechnicalDescriptions: true,
        showImages: true,
        includeSafetyWarnings: false,
        showCompanyHeader: true,
        showCompanyFooter: true,
        showSignatures: true,
        showTermsAndConditions: false,
        showPaymentInfo: true,
        showItemCodes: true,
        showItemImages: false
    },
    metadata: {
        templateName: 'Padrão',
        isDefault: true,
        createdAt: new Date()
    }
};

// Designs de cantos pré-definidos
export const CORNER_DESIGNS = {
    geometric: {
        name: 'Geométrico',
        svg: '<svg viewBox="0 0 100 100"><path d="M0,0 L100,0 L0,100 Z" fill="currentColor"/></svg>',
        description: 'Triângulo geométrico moderno'
    },
    curves: {
        name: 'Curvas',
        svg: '<svg viewBox="0 0 100 100"><path d="M0,0 Q100,0 100,100 L0,100 Z" fill="currentColor"/></svg>',
        description: 'Curvas suaves e elegantes'
    },
    lines: {
        name: 'Linhas',
        svg: '<svg viewBox="0 0 100 100"><g><line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" stroke-width="3"/><line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" stroke-width="3"/></g></svg>',
        description: 'Linhas simples e profissionais'
    },
    custom: {
        name: 'Personalizado',
        svg: '',
        description: 'Imagem de fundo personalizada'
    },
    none: {
        name: 'Nenhum',
        svg: '',
        description: 'Sem design nos cantos'
    }
};

// Templates de cores pré-definidos
export const COLOR_TEMPLATES = {
    s3e: {
        name: 'S3E Engenharia',
        colors: {
            primary: '#6366F1',
            secondary: '#8B5CF6',
            accent: '#10B981',
            background: '#FFFFFF',
            text: '#1F2937'
        }
    },
    professional: {
        name: 'Profissional',
        colors: {
            primary: '#1E40AF',
            secondary: '#1F2937',
            accent: '#3B82F6',
            background: '#FFFFFF',
            text: '#111827'
        }
    },
    technical: {
        name: 'Técnico',
        colors: {
            primary: '#0F766E',
            secondary: '#14532D',
            accent: '#F59E0B',
            background: '#F9FAFB',
            text: '#1F2937'
        }
    },
    elegant: {
        name: 'Elegante',
        colors: {
            primary: '#7C3AED',
            secondary: '#BE123C',
            accent: '#DC2626',
            background: '#FFFFFF',
            text: '#18181B'
        }
    }
};

