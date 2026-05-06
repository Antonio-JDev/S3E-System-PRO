import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { axiosApiService } from '../services/axiosApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/AuthContext';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';
import { configuracoesService } from '../services/configuracoesService';
import { useSKey } from '../hooks/useSKey';
import { useEscapeKey } from '../hooks/useEscapeKey';
import ActionsDropdown from './ui/ActionsDropdown';
import { matchCrossSearch } from '../utils/searchUtils';
import { 
    generateEmptyTemplate, 
    generateExampleTemplate, 
    downloadJSON,
    type CotacoesImportData
} from '../utils/cotacoesImportExport';

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const ArrowDownTrayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ArrowUpTrayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ArrowPathIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const DocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ==================== TYPES ====================
interface Cotacao {
  id: string;
  nome: string;
  ncm: string | null;
  valorUnitario: number;
  valorVenda?: number | null;
  unidadeMedida?: string; // un, m, cm, kg, etc.
  quantidadePorEmbalagem?: number | null; // 1 pacote = X unidades (fracionamento)
  fornecedorId: string | null;
  fornecedorNome: string | null;
  dataAtualizacao: string;
  observacoes: string | null;
  ativo: boolean;
  fornecedor?: {
    id: string;
    nome: string;
    cnpj: string;
    classificacao?: string | null;
  };
}

interface CotacaoPreview {
  nome: string;
  ncm: string;
  valorUnitario: number;
  valorVenda: number;
  unidadeMedida?: string;
  fornecedorNome: string;
  fornecedorId?: string | null;
  fornecedorClassificacao?: string | null;
  isRepresentante?: boolean;
  observacoes: string;
  status?: 'novo' | 'atualizado' | 'mantido';
  valorAnterior?: number | null;
  idExistente?: string | null;
}

interface ImportacaoEstatisticas {
  novos: number;
  atualizados: number;
  mantidos: number;
  total: number;
}

interface ImportacaoResponse {
  criados: number;
  atualizados: number;
  mantidos: number;
  erros: number;
  detalhes: Array<{
    nome: string;
    status: 'criado' | 'atualizado' | 'mantido';
    valorAnterior?: number | null;
    valorNovo?: number;
  }>;
}

interface ExportarResponse {
  totalCotacoes: number;
  [key: string]: any;
}

interface PreviewImportacaoResponse {
  cotacoes: CotacaoPreview[];
  estatisticas: ImportacaoEstatisticas;
}

interface ExclusaoBulkResponse {
  deletados: number;
  naoEncontrados: number;
}

interface CotacoesProps {
  toggleSidebar: () => void;
}

// ==================== COMPONENT ====================
const Cotacoes: React.FC<CotacoesProps> = ({ toggleSidebar }) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const userRole = user?.role?.toLowerCase();
  const canEdit = ['admin', 'gerente', 'engenheiro', 'orcamentista', 'desenvolvedor'].includes(userRole || '');
  const canGenerateSKUs = ['admin', 'desenvolvedor'].includes(userRole || '');
  
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  
  // Modals
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Preview de importação
  const [cotacoesPreview, setCotacoesPreview] = useState<CotacaoPreview[]>([]);
  const [estatisticasImportacao, setEstatisticasImportacao] = useState<ImportacaoEstatisticas | null>(null);
  const [resumoModalOpen, setResumoModalOpen] = useState(false);
  
  // Seleção de itens
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [deleteBulkDialogOpen, setDeleteBulkDialogOpen] = useState(false);
  
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [markupFabricante, setMarkupFabricante] = useState<number>(1.55);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ==================== API CALLS ====================
  const carregarCotacoes = async () => {
    try {
      setLoading(true);
      const response = await axiosApiService.get('/api/cotacoes');
      
      if (response.success && response.data) {
        setCotacoes(response.data as Cotacao[]);
      }
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
      toast.error('Não foi possível carregar as cotações');
    } finally {
      setLoading(false);
    }
  };

  const carregarFornecedores = async () => {
    try {
      const response = await fornecedoresService.listar();
      if (response.success && response.data) {
        setFornecedores(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  // Handler para fechar resumo de importação
  const handleFecharResumo = useCallback(() => {
    setResumoModalOpen(false);
    setImportModalOpen(false);
    setSelectedFile(null);
    setCotacoesPreview([]);
    setEstatisticasImportacao(null);
    carregarCotacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fechar modais com ESC
  useEscapeKey(viewModalOpen, () => setViewModalOpen(false));
  useEscapeKey(editModalOpen, () => setEditModalOpen(false));
  useEscapeKey(importModalOpen, () => {
    setImportModalOpen(false);
    setSelectedFile(null);
  });
  useEscapeKey(previewModalOpen, () => {
    setPreviewModalOpen(false);
    setSelectedFile(null);
    setCotacoesPreview([]);
  });
  useEscapeKey(createModalOpen, () => {
    setCreateModalOpen(false);
    setCreateFormData({
      nome: '',
      ncm: '',
      valorUnitario: '',
      valorVenda: '',
      unidadeMedida: 'un',
      quantidadePorEmbalagem: '',
      fornecedorId: '',
      fornecedorNome: '',
      observacoes: ''
    });
  });
  useEscapeKey(resumoModalOpen, handleFecharResumo);
  useEscapeKey(deleteDialogOpen, () => {
    setDeleteDialogOpen(false);
    setSelectedCotacao(null);
  });
  useEscapeKey(deleteBulkDialogOpen, () => setDeleteBulkDialogOpen(false));
  
  // Fechar modais com tecla S
  useSKey(viewModalOpen, () => setViewModalOpen(false));
  useSKey(editModalOpen, () => setEditModalOpen(false));
  useSKey(importModalOpen, () => setImportModalOpen(false));
  useSKey(previewModalOpen, () => setPreviewModalOpen(false));
  useSKey(createModalOpen, () => setCreateModalOpen(false));
  useSKey(resumoModalOpen, () => setResumoModalOpen(false));
  
  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    ncm: '',
    valorUnitario: '',
    valorVenda: '',
    unidadeMedida: 'un',
    quantidadePorEmbalagem: '' as string,
    fornecedorId: '' as string,
    fornecedorNome: '',
    observacoes: ''
  });

  const [createFormData, setCreateFormData] = useState({
    nome: '',
    ncm: '',
    valorUnitario: '',
    valorVenda: '',
    unidadeMedida: 'un',
    quantidadePorEmbalagem: '',
    fornecedorId: '',
    fornecedorNome: '',
    observacoes: ''
  });
  
  // Carregar markup do sistema (coeficiente fabricante)
  useEffect(() => {
    configuracoesService.getConfiguracoes().then((res) => {
      if (res?.data?.markupFabricante != null) setMarkupFabricante(Number(res.data.markupFabricante));
      else if (res?.data?.multiplicadorVenda != null) setMarkupFabricante(Number(res.data.multiplicadorVenda));
    }).catch(() => {});
  }, []);

  /**
   * Calcula valor de venda para orçamento conforme classificação do fornecedor:
   * - Vendedor (Representante_Vendedor): valor de venda = valor unitário × 1.1 (10% markup para cobrir impostos).
   * - Fabricante: valor de venda = valor unitário × markupFabricante (ex.: 1,55).
   */
  const calcularValorVendaPorClassificacao = useCallback((
    valorUnitario: number,
    fornecedorId: string | null,
    fornecedoresList: Fornecedor[]
  ): string => {
    if (!valorUnitario || valorUnitario <= 0) return '';
    if (fornecedorId) {
      const f = fornecedoresList.find(x => x.id === fornecedorId);
      if (f?.classificacao === 'Representante_Vendedor') {
        // Representante/Vendedor: 10% de markup para cobrir impostos
        return (Math.round(valorUnitario * 1.1 * 100) / 100).toFixed(2);
      }
      if (f?.classificacao === 'Fabricante' || !f?.classificacao) {
        const v = Math.round(valorUnitario * markupFabricante * 100) / 100;
        return v.toFixed(2);
      }
    }
    return (Math.round(valorUnitario * 1.4 * 100) / 100).toFixed(2);
  }, [markupFabricante]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    carregarCotacoes();
    carregarFornecedores();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      const response = await axiosApiService.get('/api/cotacoes/template');
      
      if (response.data) {
        const jsonString = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `template-cotacoes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Template baixado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      toast.error('Não foi possível baixar o template');
    }
  };

  const handleExportar = async () => {
    try {
      const response = await axiosApiService.get('/api/cotacoes/exportar');
      
      if (response.data) {
        const jsonString = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cotacoes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`${(response.data as ExportarResponse).totalCotacoes || 0} cotações exportadas com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Não foi possível exportar as cotações');
    }
  };

  const handleGerarSKUs = async () => {
    const toastId = toast.loading('Gerando SKUs para cotações...', {
      duration: 0 // Não desaparecer automaticamente
    });
    
    try {
      const response = await axiosApiService.post('/api/cotacoes/gerar-skus');
      
      if (response.data?.success) {
        const { totalCotacoes, cotacoesComSKU, cobertura } = response.data.data;
        
        toast.success(
          `✅ SKUs gerados com sucesso!\n` +
          `📊 ${cotacoesComSKU}/${totalCotacoes} cotações agora têm SKU (${cobertura}%)`, 
          { 
            id: toastId,
            duration: 5000 
          }
        );
        
        // Recarregar a lista de cotações para mostrar os SKUs
        carregarCotacoes();
      }
    } catch (error: any) {
      console.error('❌ Erro ao gerar SKUs:', error);
      
      const message = error.response?.data?.message || 'Erro interno do servidor';
      toast.error(`Erro ao gerar SKUs: ${message}`, { 
        id: toastId,
        duration: 6000 
      });
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
        
        // Fazer preview antes de importar
        try {
          setLoading(true);
          const formData = new FormData();
          formData.append('arquivo', file);
          
          const response = await axiosApiService.post('/api/cotacoes/preview-importacao', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (response.success && response.data) {
            const previewData = response.data as PreviewImportacaoResponse;
            const cotacoes = previewData.cotacoes || [];
            const estatisticas = previewData.estatisticas || {
              novos: 0,
              atualizados: 0,
              mantidos: 0,
              total: cotacoes.length
            };
            
            // Calcular valorVenda padrão (40%) para itens novos e atualizados
            const cotacoesComValorVenda = cotacoes.map((cotacao: any) => ({
              ...cotacao,
              valorVenda: cotacao.valorVenda || cotacao.valorUnitario * 1.4
            }));
            
            setCotacoesPreview(cotacoesComValorVenda);
            setEstatisticasImportacao(estatisticas);
            setPreviewModalOpen(true);
          }
        } catch (error) {
          console.error('Erro ao fazer preview:', error);
          toast.error('Erro ao processar arquivo JSON');
        } finally {
          setLoading(false);
        }
      } else {
        toast.error('Apenas arquivos JSON são permitidos');
      }
    }
  };

  const handleConfirmarImportacao = async () => {
    if (cotacoesPreview.length === 0) {
      toast.error('Nenhuma cotação para importar');
      return;
    }

    try {
      setLoading(true);
      
      const response = await axiosApiService.post('/api/cotacoes/importar', {
        cotacoes: cotacoesPreview
      });
      
      if (response.success && response.data) {
        const { criados, atualizados, mantidos, erros, detalhes } = response.data as ImportacaoResponse;
        
        // Fechar modal de preview
        setPreviewModalOpen(false);
        
        // Atualizar estatísticas com os resultados reais
        if (detalhes && detalhes.length > 0) {
          const novos = detalhes.filter((d: any) => d.status === 'criado').length;
          const atualizadosCount = detalhes.filter((d: any) => d.status === 'atualizado').length;
          const mantidosCount = detalhes.filter((d: any) => d.status === 'mantido').length;
          
          setEstatisticasImportacao({
            novos: novos || criados || 0,
            atualizados: atualizadosCount || atualizados || 0,
            mantidos: mantidosCount || mantidos || 0,
            total: detalhes.length
          });
          
          // Mapear detalhes para o formato do preview para exibir no resumo
          const detalhesMapeados = detalhes.map((detalhe: any) => {
            const cotacaoOriginal = cotacoesPreview.find((c: any) => c.nome === detalhe.nome);
            if (!cotacaoOriginal) return null;
            return {
              ...cotacaoOriginal,
              status: detalhe.status === 'criado' ? 'novo' : detalhe.status,
              valorAnterior: detalhe.valorAnterior,
              valorNovo: detalhe.valorNovo
            } as CotacaoPreview;
          }).filter((item): item is CotacaoPreview => item !== null);
          
          setCotacoesPreview(detalhesMapeados.length > 0 ? detalhesMapeados : cotacoesPreview);
          setResumoModalOpen(true);
        } else {
          toast.success(`Importação concluída: ${criados || 0} criados, ${atualizados || 0} atualizados, ${mantidos || 0} mantidos${erros > 0 ? `, ${erros} erros` : ''}`);
          setImportModalOpen(false);
          setSelectedFile(null);
          setCotacoesPreview([]);
          setEstatisticasImportacao(null);
          carregarCotacoes();
        }
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Não foi possível importar as cotações');
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarValorVenda = (index: number, valorVenda: number) => {
    setCotacoesPreview(prev => prev.map((cotacao, i) => 
      i === index ? { ...cotacao, valorVenda } : cotacao
    ));
  };

  const handleEdit = (cotacao: Cotacao) => {
    if (!canEdit) {
      toast.error('Você não tem permissão para editar cotações');
      return;
    }
    
    setSelectedCotacao(cotacao);
    setFormData({
      nome: cotacao.nome,
      ncm: cotacao.ncm || '',
      valorUnitario: cotacao.valorUnitario.toString(),
      valorVenda: (cotacao.valorVenda || cotacao.valorUnitario * 1.4).toString(),
      unidadeMedida: cotacao.unidadeMedida || 'un',
      quantidadePorEmbalagem: cotacao.quantidadePorEmbalagem != null ? String(cotacao.quantidadePorEmbalagem) : '',
      fornecedorId: cotacao.fornecedorId || '',
      fornecedorNome: cotacao.fornecedorNome || cotacao.fornecedor?.nome || '',
      observacoes: cotacao.observacoes || ''
    });
    setEditModalOpen(true);
  };

  const handleCreateCotacao = async () => {
    try {
      // Validações
      if (!createFormData.nome || !createFormData.valorUnitario) {
        toast.error('Nome e valor unitário são obrigatórios');
        return;
      }

      setLoading(true);
      
      const payload: any = {
        nome: createFormData.nome,
        valorUnitario: parseFloat(createFormData.valorUnitario),
      };

      if (createFormData.ncm) payload.ncm = createFormData.ncm;
      if (createFormData.valorVenda) {
        payload.valorVenda = parseFloat(createFormData.valorVenda);
      }
      if (createFormData.unidadeMedida) payload.unidadeMedida = createFormData.unidadeMedida;
      if (createFormData.quantidadePorEmbalagem && parseFloat(createFormData.quantidadePorEmbalagem) > 0) {
        payload.quantidadePorEmbalagem = parseFloat(createFormData.quantidadePorEmbalagem);
      }
      if (createFormData.fornecedorId) payload.fornecedorId = createFormData.fornecedorId;
      if (createFormData.fornecedorNome) payload.fornecedorNome = createFormData.fornecedorNome;
      if (createFormData.observacoes) payload.observacoes = createFormData.observacoes;

      const response = await axiosApiService.post('/api/cotacoes', payload);

      if (response.success) {
        toast.success('Cotação criada com sucesso!');
        setCreateModalOpen(false);
        setCreateFormData({
          nome: '',
          ncm: '',
          valorUnitario: '',
          valorVenda: '',
          unidadeMedida: 'un',
          quantidadePorEmbalagem: '',
          fornecedorId: '',
          fornecedorNome: '',
          observacoes: ''
        });
        await carregarCotacoes();
      } else {
        toast.error(response.error || 'Erro ao criar cotação');
      }
    } catch (error: any) {
      console.error('Erro ao criar cotação:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar cotação');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedCotacao) return;

    try {
      setLoading(true);
      const valorUnitarioAntigo = selectedCotacao.valorUnitario;
      const valorUnitarioNovo = parseFloat(formData.valorUnitario);
      const valorUnitarioMudou = valorUnitarioAntigo !== valorUnitarioNovo;
      
      const payload: any = {
        nome: formData.nome,
        ncm: formData.ncm,
        valorUnitario: valorUnitarioNovo,
        valorVenda: parseFloat(formData.valorVenda),
        unidadeMedida: formData.unidadeMedida,
        fornecedorId: formData.fornecedorId || null,
        fornecedorNome: formData.fornecedorNome,
        observacoes: formData.observacoes,
        atualizarDataCotacao: valorUnitarioMudou
      };
      if (formData.quantidadePorEmbalagem === '' || formData.quantidadePorEmbalagem == null) {
        payload.quantidadePorEmbalagem = null;
      } else if (parseFloat(formData.quantidadePorEmbalagem) > 0) {
        payload.quantidadePorEmbalagem = parseFloat(formData.quantidadePorEmbalagem);
      }
      const response = await axiosApiService.put(`/api/cotacoes/${selectedCotacao.id}`, payload);
      
      if (response.success) {
        toast.success('Cotação atualizada com sucesso!');
        
        setEditModalOpen(false);
        setSelectedCotacao(null);
        carregarCotacoes();
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Não foi possível atualizar a cotação');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCotacao) return;
    
    if (!canEdit) {
      toast.error('Você não tem permissão para excluir cotações');
      return;
    }

    try {
      setLoading(true);
      const response = await axiosApiService.delete(`/api/cotacoes/${selectedCotacao.id}`);
      
      if (response.success) {
        toast.success('Cotação excluída com sucesso!');
        
        setDeleteDialogOpen(false);
        setSelectedCotacao(null);
        carregarCotacoes();
      } else {
        toast.error(response.error || 'Não foi possível excluir a cotação');
      }
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Não foi possível excluir a cotação';
      
      if (error?.response?.status === 404) {
        toast.error('Cotação não encontrada. Ela pode ter sido removida por outro usuário.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (!canEdit) {
      toast.error('Você não tem permissão para selecionar cotações');
      return;
    }
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!canEdit) {
      toast.error('Você não tem permissão para selecionar cotações');
      return;
    }
    
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(cotacoesFiltradas.map(c => c.id)));
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos uma cotação');
      return;
    }

    if (!canEdit) {
      toast.error('Você não tem permissão para excluir cotações');
      return;
    }

    setDeleteBulkDialogOpen(true);
  };

  const handleConfirmarExclusaoBulk = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setLoading(true);
      const response = await axiosApiService.delete('/api/cotacoes/bulk', {
        data: { ids: Array.from(selectedIds) }
      });
      
      if (response.success) {
        const { deletados, naoEncontrados } = (response.data as ExclusaoBulkResponse) || { deletados: 0, naoEncontrados: 0 };
        
        if (naoEncontrados && naoEncontrados > 0) {
          toast.warning(
            `${deletados || 0} cotação(ões) excluída(s), mas ${naoEncontrados} não foram encontradas`,
            { duration: 5000 }
          );
        } else {
          toast.success(`${deletados || selectedIds.size} cotação(ões) excluída(s) com sucesso!`);
        }
        
        setDeleteBulkDialogOpen(false);
        setSelectedIds(new Set());
        setSelectAll(false);
        carregarCotacoes();
      } else {
        toast.error(response.error || 'Não foi possível excluir as cotações');
      }
    } catch (error: any) {
      console.error('Erro ao excluir cotações:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Não foi possível excluir as cotações';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTERS ====================
  const cotacoesFiltradas = cotacoes.filter(cotacao =>
    matchCrossSearch(searchTerm, cotacao.nome) ||
    cotacao.fornecedorNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cotacao.ncm?.includes(searchTerm)
  );

  // ==================== RENDER ====================
  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar} 
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-lg transition-all"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text">🏷️ Cotações de Fornecedores</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Banco frio de materiais cotados</p>
          </div>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setCreateFormData({
                nome: '',
                ncm: '',
                valorUnitario: '',
                valorVenda: '',
                unidadeMedida: 'un',
                quantidadePorEmbalagem: '',
                fornecedorId: '',
                fornecedorNome: '',
                observacoes: ''
              });
              setCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center gap-2 shadow-md font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
            Nova Cotação
          </button>
          
          {/* Dropdown de Ações */}
          <ActionsDropdown
            actions={[
              ...(canGenerateSKUs ? [{
                label: 'Gerar SKUs',
                onClick: handleGerarSKUs,
                icon: <CogIcon className="w-4 h-4" />,
                variant: 'warning' as const,
                title: 'Gerar SKUs únicos para cotações sem código (necessário para NF-e)'
              }] : []),
              {
                label: 'Template Vazio',
                onClick: () => {
                  const template = generateEmptyTemplate();
                  downloadJSON(template, 'cotacoes-template-vazio.json');
                  toast.success('Template vazio baixado!');
                },
                icon: <DocumentTextIcon className="w-4 h-4" />,
                variant: 'default'
              },
              {
                label: 'Template com Exemplos',
                onClick: () => {
                  const template = generateExampleTemplate();
                  downloadJSON(template, 'cotacoes-template-exemplo.json');
                  toast.success('Template com exemplos baixado!');
                },
                icon: <DocumentTextIcon className="w-4 h-4" />,
                variant: 'primary'
              },
              {
                label: 'Exportar JSON',
                onClick: handleExportar,
                icon: <ArrowDownTrayIcon className="w-4 h-4" />,
                disabled: cotacoes.length === 0,
                variant: 'success'
              },
              {
                label: 'Importar JSON',
                onClick: () => setImportModalOpen(true),
                icon: <ArrowUpTrayIcon className="w-4 h-4" />,
                variant: 'primary'
              }
            ]}
            label="Ações"
          />
        </div>
      </header>

      {/* Search Bar */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-md">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, NCM ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="mt-2 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {cotacoesFiltradas.length} cotação(ões) encontrada(s)
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
              >
                {selectAll ? 'Desselecionar Todos' : 'Selecionar Todos'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold flex items-center gap-2"
                >
                  <TrashIcon className="w-4 h-4" />
                  Excluir Selecionadas ({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-2">Carregando cotações...</p>
          </div>
        ) : cotacoesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">
            <DocumentIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <p className="text-lg font-semibold mb-2">Nenhuma cotação encontrada</p>
            <p className="text-sm">Importe um arquivo JSON para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {canEdit && (
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:text-blue-400"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    NCM
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Valor Unitário
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Valor Venda
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Atualização
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {cotacoesFiltradas.map((cotacao) => (
                  <tr key={cotacao.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(cotacao.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    {canEdit && (
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(cotacao.id)}
                          onChange={() => handleToggleSelect(cotacao.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{cotacao.nome}</div>
                      {cotacao.quantidadePorEmbalagem != null && cotacao.quantidadePorEmbalagem > 0 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">📦 1 pacote = {cotacao.quantidadePorEmbalagem} un</div>
                      )}
                      {cotacao.observacoes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cotacao.observacoes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {cotacao.ncm || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {cotacao.unidadeMedida || 'un'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        R$ {cotacao.valorUnitario.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        R$ {(cotacao.valorVenda || cotacao.valorUnitario * 1.4).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {cotacao.fornecedorNome || cotacao.fornecedor?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                      {new Date(cotacao.dataAtualizacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCotacao(cotacao);
                            setViewModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                          title="Visualizar"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(cotacao)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCotacao(cotacao);
                                setDeleteDialogOpen(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Visualizar */}
      {viewModalOpen && selectedCotacao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
              <h2 className="text-2xl font-bold text-white pr-10">Detalhes da Cotação</h2>
              <p className="text-sm text-blue-100 mt-1">Visualize os dados da cotação</p>
              <button
                onClick={() => setViewModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nome do Material:</label>
                <p className="text-lg text-gray-900 mt-1">{selectedCotacao.nome}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">NCM:</label>
                  <p className="text-gray-900 mt-1">{selectedCotacao.ncm || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Valor Unitário (Cotação):</label>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    R$ {selectedCotacao.valorUnitario.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Valor de Venda:</label>
                  <p className="text-lg font-bold text-teal-600 mt-1">
                    R$ {(selectedCotacao.valorVenda || selectedCotacao.valorUnitario * 1.4).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedCotacao.quantidadePorEmbalagem != null && selectedCotacao.quantidadePorEmbalagem > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <label className="text-sm font-semibold text-amber-800 dark:text-amber-200">Fracionamento:</label>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    📦 1 pacote = {selectedCotacao.quantidadePorEmbalagem} unidades • Valor/un no orçamento: R$ {(selectedCotacao.valorUnitario / selectedCotacao.quantidadePorEmbalagem).toFixed(2)}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-semibold text-gray-700">Fornecedor:</label>
                <p className="text-gray-900 mt-1">
                  {selectedCotacao.fornecedorNome || selectedCotacao.fornecedor?.nome || '-'}
                </p>
                {selectedCotacao.fornecedor?.classificacao && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Classificação: <span className="font-medium">{selectedCotacao.fornecedor.classificacao === 'Fabricante' ? 'Fabricante' : selectedCotacao.fornecedor.classificacao === 'Representante_Vendedor' ? 'Representante/Vendedor' : selectedCotacao.fornecedor.classificacao}</span>
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700">Data de Atualização:</label>
                <p className="text-gray-900 mt-1">
                  {new Date(selectedCotacao.dataAtualizacao).toLocaleString('pt-BR')}
                </p>
              </div>
              
              {selectedCotacao.observacoes && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Observações:</label>
                  <p className="text-gray-900 mt-1">{selectedCotacao.observacoes}</p>
                </div>
              )}
            </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setFormData({
                    id: selectedCotacao.id,
                    nome: selectedCotacao.nome,
                    ncm: selectedCotacao.ncm || '',
                    valorUnitario: String(selectedCotacao.valorUnitario),
                    valorVenda: String(selectedCotacao.valorVenda ?? selectedCotacao.valorUnitario * 1.4),
                    unidadeMedida: selectedCotacao.unidadeMedida || 'un',
                    quantidadePorEmbalagem: selectedCotacao.quantidadePorEmbalagem != null ? String(selectedCotacao.quantidadePorEmbalagem) : '',
                    fornecedorId: selectedCotacao.fornecedorId || '',
                    fornecedorNome: selectedCotacao.fornecedorNome || selectedCotacao.fornecedor?.nome || '',
                    observacoes: selectedCotacao.observacoes || ''
                  });
                  setEditModalOpen(true);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 font-semibold transition-colors shadow-md"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editModalOpen && selectedCotacao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-yellow-500 to-yellow-600 shrink-0">
              <h2 className="text-2xl font-bold text-white pr-10">Editar Cotação</h2>
              <p className="text-sm text-yellow-100 mt-1">Atualize os dados da cotação</p>
              <button
                onClick={() => setEditModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome do Material *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NCM</label>
                  <input
                    type="text"
                    value={formData.ncm}
                    onChange={(e) => setFormData({ ...formData, ncm: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor Unitário (Cotação) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valorUnitario}
                    onChange={(e) => {
                      const novoValor = e.target.value;
                      const num = parseFloat(novoValor) || 0;
                      const valorVendaCalc = calcularValorVendaPorClassificacao(
                        num,
                        formData.fornecedorId || null,
                        fornecedores
                      );
                      setFormData({ 
                        ...formData, 
                        valorUnitario: novoValor,
                        valorVenda: valorVendaCalc
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valor de Venda (entra no orçamento) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valorVenda}
                  onChange={(e) => setFormData({ ...formData, valorVenda: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Representante/Vendedor: valor unitário × 1.1 (10% markup). Fabricante: valor unitário × {markupFabricante}.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unidade de Medida *
                </label>
                <select
                  value={formData.unidadeMedida}
                  onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="un">Unidade (un)</option>
                  <option value="m">Metro (m)</option>
                  <option value="cm">Centímetro (cm)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="l">Litro (l)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Unidade de cálculo do material. Se for Metro (m), poderá ser inserido como M ou CM nos orçamentos.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fracionamento (1 pacote = X unidades)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Ex: 100 (deixe vazio se não fracionado)"
                  value={formData.quantidadePorEmbalagem}
                  onChange={(e) => setFormData({ ...formData, quantidadePorEmbalagem: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se preenchido: 1 item na cotação = 1 pacote; ao inserir no orçamento o valor será convertido para 1 unidade (valor do pacote ÷ X).
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fornecedor
                </label>
                <select
                  value={formData.fornecedorId}
                  onChange={(e) => {
                    const fornecedorId = e.target.value;
                    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
                    const valorUnitarioNum = formData.valorUnitario ? parseFloat(formData.valorUnitario) : 0;
                    const valorVendaCalc = calcularValorVendaPorClassificacao(
                      valorUnitarioNum,
                      fornecedorId || null,
                      fornecedores
                    );
                    setFormData({ 
                      ...formData, 
                      fornecedorId,
                      fornecedorNome: fornecedor ? fornecedor.nome : '',
                      valorVenda: valorVendaCalc
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhum / digitar nome abaixo</option>
                  {fornecedores.filter(f => f.ativo).map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
                {formData.fornecedorId && (() => {
                  const f = fornecedores.find(x => x.id === formData.fornecedorId);
                  const label = f?.classificacao === 'Fabricante' ? 'Fabricante' : f?.classificacao === 'Representante_Vendedor' ? 'Representante/Vendedor' : null;
                  return label ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      Classificação: <span className="text-blue-600 dark:text-blue-400">{label}</span>
                    </p>
                  ) : null;
                })()}
                <input
                  type="text"
                  value={formData.fornecedorNome}
                  onChange={(e) => {
                    const nome = e.target.value;
                    if (formData.fornecedorId) {
                      const valorUnitarioNum = formData.valorUnitario ? parseFloat(formData.valorUnitario) : 0;
                      const v = Math.round(valorUnitarioNum * 1.4 * 100) / 100;
                      setFormData({ ...formData, fornecedorNome: nome, fornecedorId: '', valorVenda: v.toFixed(2) });
                    } else {
                      setFormData({ ...formData, fornecedorNome: nome });
                    }
                  }}
                  placeholder="Ou nome do fornecedor (se não estiver na lista)"
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold shadow-md transition-colors"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-lg w-full overflow-hidden flex flex-col">
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
              <h2 className="text-2xl font-bold text-white pr-10">Importar Cotações</h2>
              <p className="text-sm text-blue-100 mt-1">Envie um arquivo JSON com as cotações</p>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex-1">
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📝 <strong>Instruções:</strong> Faça upload de um arquivo JSON com as cotações.
                  Baixe o template para ver o formato correto. Após selecionar o arquivo, você poderá revisar e ajustar os valores de venda antes de confirmar.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Arquivo JSON *
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Nova Cotação */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
              <h2 className="text-2xl font-bold text-white pr-10">Nova Cotação</h2>
              <p className="text-sm text-blue-100 mt-1">Preencha os dados para criar uma nova cotação</p>
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateFormData({
                    nome: '',
                    ncm: '',
                    valorUnitario: '',
                    valorVenda: '',
                    unidadeMedida: 'un',
                    quantidadePorEmbalagem: '',
                    fornecedorId: '',
                    fornecedorNome: '',
                    observacoes: ''
                  });
                }}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
              {/* Nome do Material */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Material *
                </label>
                <input
                  type="text"
                  value={createFormData.nome}
                  onChange={(e) => setCreateFormData({ ...createFormData, nome: e.target.value })}
                  placeholder="Ex: Cabo elétrico 2.5mm"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                  required
                />
              </div>

              {/* NCM */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  NCM (Nomenclatura Comum do Mercosul)
                </label>
                <input
                  type="text"
                  value={createFormData.ncm}
                  onChange={(e) => setCreateFormData({ ...createFormData, ncm: e.target.value })}
                  placeholder="Ex: 8544.42.90"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                />
              </div>

              {/* Valor Unitário */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Valor Unitário (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createFormData.valorUnitario}
                  onChange={(e) => {
                    const valor = e.target.value;
                    const num = valor ? parseFloat(valor) : 0;
                    const valorVendaCalc = calcularValorVendaPorClassificacao(
                      num,
                      createFormData.fornecedorId || null,
                      fornecedores
                    );
                    setCreateFormData({ 
                      ...createFormData, 
                      valorUnitario: valor,
                      valorVenda: valorVendaCalc
                    });
                  }}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                  required
                />
              </div>

              {/* Valor de Venda */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Valor de Venda (R$) — valor que entra no orçamento
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={createFormData.valorVenda}
                  onChange={(e) => setCreateFormData({ ...createFormData, valorVenda: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Representante/Vendedor: valor unitário × 1.1 (10% markup). Fabricante: valor unitário × {markupFabricante} (coeficiente do sistema). Sem fornecedor: 40% de margem.
                </p>
              </div>

              {/* Unidade de Medida */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Unidade de Medida *
                </label>
                <select
                  value={createFormData.unidadeMedida}
                  onChange={(e) => setCreateFormData({ ...createFormData, unidadeMedida: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                  required
                >
                  <option value="un">Unidade (un)</option>
                  <option value="m">Metro (m)</option>
                  <option value="cm">Centímetro (cm)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="l">Litro (l)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Unidade de cálculo do material. Se for Metro (m), poderá ser inserido como M ou CM nos orçamentos.
                </p>
              </div>

              {/* Fracionamento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Fracionamento (1 pacote = X unidades)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={createFormData.quantidadePorEmbalagem}
                  onChange={(e) => setCreateFormData({ ...createFormData, quantidadePorEmbalagem: e.target.value })}
                  placeholder="Ex: 100 (deixe vazio se não fracionado)"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se preenchido: valor da cotação é por pacote; ao inserir no orçamento será convertido para valor por unidade (1 un = 1/X do pacote).
                </p>
              </div>

              {/* Fornecedor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Fornecedor
                </label>
                <select
                  value={createFormData.fornecedorId}
                  onChange={(e) => {
                    const fornecedorId = e.target.value;
                    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
                    const valorUnitarioNum = createFormData.valorUnitario ? parseFloat(createFormData.valorUnitario) : 0;
                    const valorVendaCalc = calcularValorVendaPorClassificacao(
                      valorUnitarioNum,
                      fornecedorId || null,
                      fornecedores
                    );
                    setCreateFormData({ 
                      ...createFormData, 
                      fornecedorId,
                      fornecedorNome: fornecedor ? fornecedor.nome : '',
                      valorVenda: valorVendaCalc
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                >
                  <option value="">Selecione um fornecedor (opcional)</option>
                  {fornecedores.filter(f => f.ativo).map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </option>
                  ))}
                </select>
                {createFormData.fornecedorId && (() => {
                  const f = fornecedores.find(x => x.id === createFormData.fornecedorId);
                  const label = f?.classificacao === 'Fabricante' ? 'Fabricante' : f?.classificacao === 'Representante_Vendedor' ? 'Representante/Vendedor' : null;
                  return label ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                      Classificação do fornecedor: <span className="text-blue-600 dark:text-blue-400">{label}</span>
                    </p>
                  ) : null;
                })()}
                <p className="text-xs text-gray-500 mt-1">
                  Ou digite o nome do fornecedor manualmente abaixo
                </p>
                <input
                  type="text"
                  value={createFormData.fornecedorNome}
                  onChange={(e) => {
                    setCreateFormData({ 
                      ...createFormData, 
                      fornecedorNome: e.target.value,
                      fornecedorId: '' // Limpar ID se digitar manualmente
                    });
                  }}
                  placeholder="Nome do fornecedor (opcional)"
                  className="w-full mt-2 px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-card dark:text-gray-100"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Observações
                </label>
                <textarea
                  value={createFormData.observacoes}
                  onChange={(e) => setCreateFormData({ ...createFormData, observacoes: e.target.value })}
                  placeholder="Observações adicionais sobre a cotação..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-dark-card dark:text-gray-100"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-dark-hover/30">
              <button
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateFormData({
                    nome: '',
                    ncm: '',
                    valorUnitario: '',
                    valorVenda: '',
                    unidadeMedida: 'un',
                    quantidadePorEmbalagem: '',
                    fornecedorId: '',
                    fornecedorNome: '',
                    observacoes: ''
                  });
                }}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCotacao}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold shadow-md transition-colors"
                disabled={loading || !createFormData.nome || !createFormData.valorUnitario}
              >
                {loading ? 'Criando...' : 'Criar Cotação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview de Importação */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
              <h2 className="text-2xl font-bold text-white pr-10">Revisar e Confirmar Importação</h2>
              <p className="text-sm text-blue-100 mt-1">
                {cotacoesPreview.length} cotação(ões) encontrada(s). Ajuste os valores de venda se necessário.
              </p>
              <button
                onClick={() => {
                  setPreviewModalOpen(false);
                  setSelectedFile(null);
                  setCotacoesPreview([]);
                }}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {cotacoesPreview.map((cotacao, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Material</label>
                        <p className="text-sm text-gray-900">{cotacao.nome}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">NCM</label>
                        <p className="text-sm text-gray-600">{cotacao.ncm || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Valor Representante
                          {cotacao.isRepresentante && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded">
                              REP
                            </span>
                          )}
                        </label>
                        <p className="text-sm font-semibold text-green-600">
                          R$ {cotacao.valorUnitario.toFixed(2)}
                        </p>
                        {cotacao.fornecedorNome && (
                          <p className="text-[10px] text-gray-500 truncate" title={cotacao.fornecedorNome}>
                            {cotacao.fornecedorNome}
                          </p>
                        )}
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Valor de Venda *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={cotacao.valorVenda.toFixed(2)}
                          onChange={(e) => {
                            const novoValor = parseFloat(e.target.value) || 0;
                            handleAtualizarValorVenda(index, novoValor);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {cotacao.isRepresentante 
                            ? 'Representante: +10% (cobre impostos)' 
                            : 'Padrão: +40% margem'}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cotacao.status === 'novo' && (
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
                              Novo
                            </span>
                          )}
                          {cotacao.status === 'atualizado' && (
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                              Atualizado
                            </span>
                          )}
                          {cotacao.status === 'mantido' && (
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
                              Mantido
                            </span>
                          )}
                          {cotacao.isRepresentante && (
                            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded">
                              Representante (+10%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <p className="text-xs text-gray-500">
                          {((cotacao.valorVenda / cotacao.valorUnitario - 1) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {cotacao.observacoes && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600">{cotacao.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-hover/30 shrink-0">
              {estatisticasImportacao && (
                <div className="mb-4 grid grid-cols-4 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{estatisticasImportacao.novos}</p>
                    <p className="text-xs text-green-600 font-semibold">Novos</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{estatisticasImportacao.atualizados}</p>
                    <p className="text-xs text-blue-600 font-semibold">Atualizados</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-700">{estatisticasImportacao.mantidos}</p>
                    <p className="text-xs text-gray-600 font-semibold">Mantidos</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{estatisticasImportacao.total}</p>
                    <p className="text-xs text-purple-600 font-semibold">Total</p>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <strong>Total:</strong> {cotacoesPreview.length} cotação(ões)
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPreviewModalOpen(false);
                      setSelectedFile(null);
                      setCotacoesPreview([]);
                    }}
                    className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarImportacao}
                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold shadow-md transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Importando...' : 'Confirmar e Importar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resumo de Importação */}
      {resumoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
              <h2 className="text-2xl font-bold text-white pr-10">Resumo da Importação</h2>
              <p className="text-sm text-blue-100 mt-1">
                Detalhes das alterações realizadas
              </p>
              <button
                onClick={handleFecharResumo}
                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 grid grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">
                    {estatisticasImportacao?.novos || 0}
                  </p>
                  <p className="text-sm text-green-600 font-semibold mt-1">Novos</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">
                    {estatisticasImportacao?.atualizados || 0}
                  </p>
                  <p className="text-sm text-blue-600 font-semibold mt-1">Atualizados</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-700">
                    {estatisticasImportacao?.mantidos || 0}
                  </p>
                  <p className="text-sm text-gray-600 font-semibold mt-1">Mantidos</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-700">
                    {estatisticasImportacao?.total || 0}
                  </p>
                  <p className="text-sm text-purple-600 font-semibold mt-1">Total</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 mb-3">Detalhes por Item:</h3>
                {cotacoesPreview.map((cotacao, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 ${
                      cotacao.status === 'atualizado' ? 'bg-blue-50 border-blue-200' :
                      cotacao.status === 'novo' ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900">{cotacao.nome}</p>
                          {cotacao.status === 'novo' && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded">
                              ✨ Novo
                            </span>
                          )}
                          {cotacao.status === 'atualizado' && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                              🔄 Atualizado
                            </span>
                          )}
                          {cotacao.status === 'mantido' && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
                              ✓ Mantido
                            </span>
                          )}
                        </div>
                        {cotacao.status === 'atualizado' && cotacao.valorAnterior !== null && cotacao.valorAnterior !== undefined && (
                          <div className="text-sm text-gray-600">
                            <span className="line-through text-red-600 mr-2">
                              R$ {cotacao.valorAnterior.toFixed(2)}
                            </span>
                            <span className="font-semibold text-blue-700">
                              → R$ {cotacao.valorUnitario.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {cotacao.status === 'mantido' && (
                          <div className="text-sm text-gray-600">
                            Valor mantido: <span className="font-semibold">R$ {cotacao.valorUnitario.toFixed(2)}</span>
                          </div>
                        )}
                        {cotacao.status === 'novo' && (
                          <div className="text-sm text-gray-600">
                            Novo valor: <span className="font-semibold text-green-700">R$ {cotacao.valorUnitario.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-dark-border flex justify-end shrink-0 bg-gray-50 dark:bg-dark-hover/30">
              <button
                onClick={handleFecharResumo}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog Excluir Individual */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Exclusão
            </AlertDialogTitle>
            <div className="space-y-3 text-gray-600">
              <p>
                Tem certeza que deseja excluir a cotação <strong>{selectedCotacao?.nome}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-semibold mb-1">⚠️ Atenção:</p>
                <p>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Excluir em Lote */}
      <AlertDialog open={deleteBulkDialogOpen} onOpenChange={setDeleteBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Exclusão em Lote
            </AlertDialogTitle>
            <div className="space-y-3 text-gray-600">
              <p>
                Tem certeza que deseja excluir <strong>{selectedIds.size}</strong> cotação(ões) selecionada(s)?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-semibold mb-1">⚠️ Atenção:</p>
                <p>Esta ação não pode ser desfeita. Todas as cotações selecionadas serão permanentemente removidas.</p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusaoBulk}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Excluindo...' : `Excluir ${selectedIds.size} item(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Cotacoes;

