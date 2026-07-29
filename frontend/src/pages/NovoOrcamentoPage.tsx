
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { toast } from 'sonner';
import { orcamentosService, type CreateOrcamentoData } from '../services/orcamentosService';
import { clientesService } from '../services/clientesService';
import { empresasService, Empresa } from '../services/empresasService';
import { servicosService, type Servico } from '../services/servicosService';
import { quadrosService } from '../services/quadrosService';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import TechnicalEditor from '../components/TechnicalEditor';
import PrecoValidadeFlag from '../components/PrecoValidadeFlag';
import HistoricoPrecosModal from '../components/HistoricoPrecosModal';
import UnitSelector from '../components/UnitSelector';
import UnitDisplay from '../components/UnitDisplay';
import { identificarTipoMaterial, podeVenderEmMetroOuCm, formatarUnidadeOrcamento, normalizarUnidadeMedidaOrcamento } from '../utils/unitConverter';
import { matchCrossSearch } from '../utils/searchUtils';
import { roundMoney } from '../utils/currency';
import {
    moveArrayItem,
    remapIndexAfterMove,
    remapIndexRecordAfterMove,
    remapIndexSetAfterMove,
} from '../utils/arrayReorder';
import { getUploadUrl } from '../config/api';
import ClienteCombobox from '../components/ui/ClienteCombobox';
import CriarClienteRapidoModal from '../components/ui/CriarClienteRapidoModal';
import CidadeAutocomplete from '../components/ui/CidadeAutocomplete';
import { configuracoesService, type OrcamentoInsercaoModo } from '../services/configuracoesService';

import { useEscapeKey } from '../hooks/useEscapeKey';
import ModalItensKit from '../components/ModalItensKit';
import { AuthContext } from '../contexts/AuthContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

// ==================== ICONS ====================
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const GripIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

// Types
interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    ativo: boolean;
}

interface Material {
    id: string;
    nome: string;
    sku: string;
    unidadeMedida: string;
    imagemUrl?: string; // Foto do material
    ncm?: string; // Nomenclatura Comum do Mercosul

    preco: number; // Preço de custo
    valorVenda?: number; // Preço de venda (usado em orçamentos)
    porcentagemLucro?: number; // Porcentagem de lucro
    estoque: number;
    categoria: string;
    ativo: boolean;
    ultimaAtualizacaoPreco?: string | null;
}

interface Quadro {
    id: string;
    nome: string;
    descricao: string;
    configuracao: any;
    custoTotal: number;
    precoSugerido: number;
    ativo: boolean;
}

interface Kit {
    id: string;
    nome: string;
    descricao: string;
    items: Array<{ materialId: string; quantidade: number; material?: any }>;
    /** Itens extras do kit (banco frio / serviços) vindos do catálogo */
    itensFaltantes?: any[];
    custoTotal: number;
    precoSugerido: number;
    ativo: boolean;
}

interface OrcamentoItem {
    id?: string;
    tipo: 'MATERIAL' | 'KIT' | 'SERVICO' | 'QUADRO_PRONTO' | 'CUSTO_EXTRA' | 'COTACAO';
    materialId?: string;
    kitId?: string;
    quadroId?: string;
    cotacaoId?: string; // Novo: ID da cotação do banco frio
    servicoId?: string;
    servicoNome?: string;
    descricao?: string;
    dataAtualizacaoCotacao?: string; // Novo: data da cotação para exibir flag
    nome: string;
    unidadeMedida: string;
    unidadeVenda?: string; // ✅ NOVO: Unidade de venda (pode ser diferente da unidade de estoque)
    tipoMaterial?: 'BARRAMENTO_COBRE' | 'TRILHO_DIN' | 'CABO' | 'PADRAO'; // ✅ NOVO: Tipo para conversão
    ncm?: string; // Nomenclatura Comum do Mercosul (para faturamento NF-e/NFS-e)
    quantidade: number;
    custoUnit: number;
    custoAgregadoUnit?: number; // Custo agregado (preço compra + imposto) para lucro líquido
    precoBase?: number; // Preço base
    precoUnit: number;
    subtotal: number;
    precoEditadoManual?: boolean; // Flag para indicar se o preço foi editado manualmente
    /** Venda direta do fornecedor para o cliente: não gera contas a receber, nem estoque, nem NF-e */
    vendaDiretaFornecedor?: boolean;
}

interface Foto {
    id?: string;
    url: string;
    legenda: string;
    ordem: number;
    preview?: string;
}

export interface InitialDataFromLead {
    nome?: string;
    cpfCnpj?: string;
    observacoes?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
    clienteId?: string;
    contatoLeadId?: string;
}

interface NovoOrcamentoPageProps {
    setAbaAtiva: (aba: 'listagem' | 'novo') => void;
    onOrcamentoCriado?: () => void;
    /** Dados vindos do Funil de Atendimento (CRM) ao clicar em "Gerar Proposta Comercial" */
    initialDataFromLead?: InitialDataFromLead;
    /** Chamado após aplicar initialDataFromLead no formulário */
    onConsumedInitialData?: () => void;
}

const NovoOrcamentoPage: React.FC<NovoOrcamentoPageProps> = ({ setAbaAtiva, onOrcamentoCriado, initialDataFromLead, onConsumedInitialData }) => {

    const authContext = useContext(AuthContext);
    const userId = authContext?.user?.id || null;
    
    // Função para calcular data padrão de validade (30 dias a partir de hoje)
    const calcularDataValidadePadrao = (): string => {
        const hoje = new Date();
        const dataValidade = new Date(hoje);
        dataValidade.setDate(hoje.getDate() + 30);
        
        // Formatar para YYYY-MM-DD (formato do input type="date")
        const ano = dataValidade.getFullYear();
        const mes = String(dataValidade.getMonth() + 1).padStart(2, '0');
        const dia = String(dataValidade.getDate()).padStart(2, '0');
        
        return `${ano}-${mes}-${dia}`;
    };
    
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [quadros, setQuadros] = useState<Quadro[]>([]);
    const [kits, setKits] = useState<Kit[]>([]);
    const [cotacoes, setCotacoes] = useState<any[]>([]); // Novo: cotações do banco frio
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [atualizandoPrecos, setAtualizandoPrecos] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    
    // Estados para rascunho
    const [showRascunhoDialog, setShowRascunhoDialog] = useState(false);
    const [rascunhoEncontrado, setRascunhoEncontrado] = useState<any>(null);
    
    // Estado para controlar se está usando endereço do cliente
    const [usandoEnderecoCliente, setUsandoEnderecoCliente] = useState(false);

    // CEP: loading + debounce + abort controller
    const [cepLoading, setCepLoading] = useState(false);
    const cepTimeoutRef = useRef<number | null>(null);
    const cepAbortRef = useRef<AbortController | null>(null);

    // Form state
    const [formState, setFormState] = useState({
        clienteId: '',
        titulo: '',
        descricao: '',
        descricaoProjeto: '',
        validade: calcularDataValidadePadrao(), // Data padrão de 30 dias
        bdi: 0,
        observacoes: '',
        empresaCNPJ: '',
        enderecoObra: '',
        numeroObra: '',
        cidade: '',
        bairro: '',
        cep: '',
        responsavelObra: '',
        previsaoInicio: '',
        previsaoTermino: '',
        descontoValor: 0,
        impostoPercentual: 0,
        condicaoPagamento: 'À Vista'
    });

    const [items, setItems] = useState<OrcamentoItem[]>([]);
    // Busca na lista de itens já adicionados ao orçamento (sem precisar abrir o modal)
    const [itemListSearch, setItemListSearch] = useState('');
    const itensFiltradosCount = useMemo(() => {
        if (!itemListSearch.trim()) return items.length;
        const termo = itemListSearch.toLowerCase();
        return items.filter((item) => {
            return (
                matchCrossSearch(itemListSearch, item.nome || '') ||
                (item.ncm || '').toLowerCase().includes(termo) ||
                (item.tipo || '').toLowerCase().includes(termo)
            );
        }).length;
    }, [items, itemListSearch]);
    
    // Estado para controlar valores em edição (para melhorar UX ao digitar)
    const [valorEditando, setValorEditando] = useState<{ [index: number]: string }>({});
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set()); // Índices dos itens selecionados
    const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [showItemModal, setShowItemModal] = useState(false);
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [modalExpandido, setModalExpandido] = useState(false); // Novo: controla se o modal está expandido
    const [showCriarKitModal, setShowCriarKitModal] = useState(false);
    const [nomeKit, setNomeKit] = useState('');
    const [ncmKit, setNcmKit] = useState('');
    
    // Estado para modal de visualização de itens do kit
    const [showModalItensKit, setShowModalItensKit] = useState(false);
    const [itensKitParaVisualizar, setItensKitParaVisualizar] = useState<any[]>([]);
    const [nomeKitParaVisualizar, setNomeKitParaVisualizar] = useState<string>('');
    
    // Estados para edição de kit unificado
    const [showModalEditarKit, setShowModalEditarKit] = useState(false);
    const [kitEmEdicao, setKitEmEdicao] = useState<{ index: number; item: OrcamentoItem & { itensDoKit?: any[] } } | null>(null);
    const [itensKitEdicao, setItensKitEdicao] = useState<any[]>([]);
    /** Estado local: itens “baixados” do kit só entram na lista do orçamento ao salvar */
    const [pendentesBaixarDoKit, setPendentesBaixarDoKit] = useState<OrcamentoItem[]>([]);
    const [buscaKitEdicao, setBuscaKitEdicao] = useState('');
    const [snapshotItemsAntesKitEdicao, setSnapshotItemsAntesKitEdicao] = useState<string | null>(null);
    const [snapshotItensDoKitInicial, setSnapshotItensDoKitInicial] = useState<string | null>(null);
    const [showConfirmarCancelarEdicaoKit, setShowConfirmarCancelarEdicaoKit] = useState(false);
    
    // Estado para modal de detalhes de sub-kit (kit dentro de kit)
    const [showModalDetalhesSubKit, setShowModalDetalhesSubKit] = useState(false);
    const [itensSubKitParaVisualizar, setItensSubKitParaVisualizar] = useState<any[]>([]);
    const [nomeSubKitParaVisualizar, setNomeSubKitParaVisualizar] = useState<string>('');
    
    // Estados para comparação estoque vs banco frio
    const [materiaisComEstoque, setMateriaisComEstoque] = useState<Material[]>([]);
    const [cotacoesBancoFrio, setCotacoesBancoFrio] = useState<any[]>([]);
    const [searchEstoque, setSearchEstoque] = useState('');
    const [searchCotacoes, setSearchCotacoes] = useState('');
    const [searchGlobalComparacao, setSearchGlobalComparacao] = useState(''); // Busca global para ambos os painéis
    const [materialSelecionadoComparacao, setMaterialSelecionadoComparacao] = useState<Material | null>(null);
    const [cotacaoSelecionadaComparacao, setCotacaoSelecionadaComparacao] = useState<any | null>(null);
    
    // Estados para seleção múltipla
    const [materiaisSelecionadosComparacao, setMateriaisSelecionadosComparacao] = useState<Set<string>>(new Set());
    const [cotacoesSelecionadasComparacao, setCotacoesSelecionadasComparacao] = useState<Set<string>>(new Set());
    
    // Estado para busca global (todos os tipos de itens)
    const [buscaGlobal, setBuscaGlobal] = useState('');
    const [resultadosBuscaGlobal, setResultadosBuscaGlobal] = useState<{
        materiais: Material[];
        servicos: Servico[];
        kits: Kit[];
        quadros: Quadro[];
        cotacoes: any[];
    }>({
        materiais: [],
        servicos: [],
        kits: [],
        quadros: [],
        cotacoes: []
    });
    
    // Estado para modo de adição (com novas opções)
    const [modoAdicao, setModoAdicao] = useState<'materiais' | 'servicos' | 'kits' | 'quadros' | 'cotacoes' | 'comparacao'>('materiais');
    // Estado para seleção múltipla no modal
    const [itensSelecionadosModal, setItensSelecionadosModal] = useState<Set<string>>(new Set()); // IDs dos itens selecionados no modal
    const [unidadeVendaSelecionada, setUnidadeVendaSelecionada] = useState<{ [key: string]: string }>({}); // Unidade de venda selecionada para cada item
    const [quantidadesPorItem, setQuantidadesPorItem] = useState<{ [key: string]: number }>({}); // Quantidade para cada item selecionado

    // Estados para cliente rápido
    const [showClienteRapidoModal, setShowClienteRapidoModal] = useState(false);
    const [criandoClienteRapido, setCriandoClienteRapido] = useState(false);

    // Busca direta do catálogo na página (fora do modal)
    const [orcamentoInsercaoModo, setOrcamentoInsercaoModo] = useState<OrcamentoInsercaoModo>('check');
    const [buscaCatalogoPagina, setBuscaCatalogoPagina] = useState('');
    const [itemSelecionadoCatalogo, setItemSelecionadoCatalogo] = useState<{
        tipo: 'MATERIAL' | 'SERVICO' | 'KIT' | 'QUADRO_PRONTO' | 'COTACAO';
        id: string;
        codigo: string;
        descricao: string;
        raw: Material | Servico | Kit | Quadro | any;
    } | null>(null);
    const [quantidadeCatalogoPagina, setQuantidadeCatalogoPagina] = useState(1);
    const [unidadeVendaCatalogoPagina, setUnidadeVendaCatalogoPagina] = useState<'m' | 'cm'>('m'); // Unidade ao adicionar cotação pelo catálogo da página (M/CM)
    const [dropdownCatalogoAberto, setDropdownCatalogoAberto] = useState(false);
    const [dropdownHighlightIndex, setDropdownHighlightIndex] = useState(-1);
    const dropdownHighlightRef = useRef<HTMLLIElement>(null);
    useEffect(() => {
        if (dropdownCatalogoAberto && dropdownHighlightIndex >= 0) {
            dropdownHighlightRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [dropdownHighlightIndex, dropdownCatalogoAberto]);

    // Funções para gerenciar rascunho
    const getRascunhoKey = () => {
        if (!userId) return null;
        return `orcamento_rascunho_${userId}`;
    };

    const salvarRascunho = () => {
        const rascunhoKey = getRascunhoKey();
        if (!rascunhoKey) {
            toast.error('Usuário não autenticado', {
                description: 'Não é possível salvar rascunho sem estar logado'
            });
            return;
        }

        try {
            const rascunho = {
                formState,
                items,
                dataSalvamento: new Date().toISOString()
            };
            
            localStorage.setItem(rascunhoKey, JSON.stringify(rascunho));
            toast.success('Rascunho salvo com sucesso!', {
                description: 'Seus dados foram salvos localmente'
            });
        } catch (error) {
            console.error('Erro ao salvar rascunho:', error);
            toast.error('Erro ao salvar rascunho', {
                description: 'Não foi possível salvar o rascunho'
            });
        }
    };

    const carregarRascunho = () => {
        const rascunhoKey = getRascunhoKey();
        if (!rascunhoKey) return null;

        try {
            const rascunhoStr = localStorage.getItem(rascunhoKey);
            if (!rascunhoStr) return null;

            return JSON.parse(rascunhoStr);
        } catch (error) {
            console.error('Erro ao carregar rascunho:', error);
            return null;
        }
    };

    const limparRascunho = () => {
        const rascunhoKey = getRascunhoKey();
        if (!rascunhoKey) return;

        try {
            localStorage.removeItem(rascunhoKey);
        } catch (error) {
            console.error('Erro ao limpar rascunho:', error);
        }
    };

    const continuarRascunho = () => {
        if (rascunhoEncontrado) {
            setFormState(rascunhoEncontrado.formState);
            setItems(rascunhoEncontrado.items || []);
            toast.success('Rascunho carregado!', {
                description: 'Continue editando seu orçamento'
            });
        }
        setShowRascunhoDialog(false);
        setRascunhoEncontrado(null);
    };

    const descartarRascunho = () => {
        limparRascunho();
        setShowRascunhoDialog(false);
        setRascunhoEncontrado(null);
        // Resetar formState com data padrão de validade
        setFormState(prev => ({
            ...prev,
            validade: calcularDataValidadePadrao()
        }));
        toast.info('Rascunho descartado', {
            description: 'Iniciando novo orçamento'
        });
    };

    // Carregar dados iniciais e verificar rascunho
    useEffect(() => {
        loadInitialData();
        
        // Verificar se existe rascunho ao carregar a página
        if (userId) {
            const rascunho = carregarRascunho();
            if (rascunho && (rascunho.items?.length > 0 || rascunho.formState?.titulo || rascunho.formState?.clienteId)) {
                setRascunhoEncontrado(rascunho);
                setShowRascunhoDialog(true);
            }
        }
    }, [userId]);

    // Carregar dados de orçamento copiado (se houver)
    useEffect(() => {
        try {
            const orcamentoCopiaStr = localStorage.getItem('orcamentoCopia');
            if (orcamentoCopiaStr) {
                const orcamentoCopia = JSON.parse(orcamentoCopiaStr);
                
                // Preencher formState (exceto clienteId e validade - sempre usar nova data de 30 dias)
                setFormState(prev => ({
                    ...prev,
                    empresaCNPJ: orcamentoCopia.empresaCNPJ || prev.empresaCNPJ,
                    titulo: orcamentoCopia.titulo || '',
                    descricao: orcamentoCopia.descricao || '',
                    descricaoProjeto: orcamentoCopia.descricaoProjeto || '',
                    validade: calcularDataValidadePadrao(), // Sempre usar nova validade de 30 dias para novo orçamento
                    endereco: orcamentoCopia.endereco || '',
                    bairro: orcamentoCopia.bairro || '',
                    cidade: orcamentoCopia.cidade || '',
                    cep: orcamentoCopia.cep || '',
                    responsavelObra: orcamentoCopia.responsavelObra || '',
                    bdi: orcamentoCopia.bdi || prev.bdi,
                    previsaoInicio: orcamentoCopia.previsaoInicio || '',
                    previsaoTermino: orcamentoCopia.previsaoTermino || '',
                    condicaoPagamento: orcamentoCopia.condicaoPagamento || prev.condicaoPagamento
                }));

                // Preencher itens
                if (orcamentoCopia.items && Array.isArray(orcamentoCopia.items)) {
                    setItems(orcamentoCopia.items);
                }

                // Limpar localStorage
                localStorage.removeItem('orcamentoCopia');

                // Toast informativo
                toast.info('Orçamento copiado', {
                    description: 'Selecione um cliente para continuar'
                });
            }
        } catch (error) {
            console.error('Erro ao carregar orçamento copiado:', error);
        }
    }, []);

    // Aplicar dados do Funil de Atendimento (CRM) quando vier "Gerar Proposta Comercial"
    const initialDataFromLeadAppliedRef = useRef(false);
    const contatoLeadIdParaVincularRef = useRef<string | null>(null);
    useEffect(() => {
        if (!initialDataFromLead || initialDataFromLeadAppliedRef.current) return;
        const temCpfCnpj = !!(initialDataFromLead.cpfCnpj || '').trim();
        if (temCpfCnpj && clientes.length === 0 && !initialDataFromLead.clienteId) return; // esperar clientes carregarem para tentar vincular (salvo se já veio clienteId)
        initialDataFromLeadAppliedRef.current = true;
        const idLead = initialDataFromLead.contatoLeadId?.trim();
        contatoLeadIdParaVincularRef.current = idLead || null;
        const norm = (s: string) => (s || '').replace(/\D/g, '');
        const cpfCnpjLead = norm(initialDataFromLead.cpfCnpj || '');
        const clienteById = initialDataFromLead.clienteId && clientes.find((c) => c.id === initialDataFromLead.clienteId);
        const clienteByCpfCnpj = cpfCnpjLead && clientes.find((c) => norm(c.cpfCnpj) === cpfCnpjLead);
        const clienteEncontrado = clienteById || clienteByCpfCnpj;
        const clienteIdFinal = clienteEncontrado ? clienteEncontrado.id : initialDataFromLead.clienteId || '';
        setFormState((prev) => ({
            ...prev,
            ...(clienteIdFinal && { clienteId: clienteIdFinal }),
            ...(initialDataFromLead.nome && !clienteEncontrado && { titulo: initialDataFromLead.nome }),
            ...(initialDataFromLead.observacoes && { observacoes: [prev.observacoes, initialDataFromLead.observacoes].filter(Boolean).join('\n\n') }),
            ...(initialDataFromLead.logradouro
                ? { enderecoObra: [prev.enderecoObra, initialDataFromLead.logradouro].filter(Boolean).join(', ') }
                : (clienteEncontrado?.endereco && !prev.enderecoObra ? { enderecoObra: clienteEncontrado.endereco } : null)),
            ...(initialDataFromLead.numero
                ? { numeroObra: initialDataFromLead.numero }
                : (clienteEncontrado?.numero && !prev.numeroObra ? { numeroObra: clienteEncontrado.numero } : null)),
            ...(initialDataFromLead.bairro
                ? { bairro: initialDataFromLead.bairro }
                : (clienteEncontrado?.bairro && !prev.bairro ? { bairro: clienteEncontrado.bairro } : null)),
            ...(initialDataFromLead.cep
                ? { cep: initialDataFromLead.cep }
                : (clienteEncontrado?.cep && !prev.cep ? { cep: clienteEncontrado.cep } : null)),
            ...(initialDataFromLead.cidade
                ? { cidade: initialDataFromLead.cidade }
                : (clienteEncontrado?.cidade && !prev.cidade ? { cidade: clienteEncontrado.cidade } : null)),
            ...((initialDataFromLead as any).estado
                ? { estado: (initialDataFromLead as any).estado }
                : (clienteEncontrado?.estado && !(prev as any).estado ? { estado: clienteEncontrado.estado } : null)),
        }));
        onConsumedInitialData?.();
        if (initialDataFromLead.nome || initialDataFromLead.observacoes || initialDataFromLead.clienteId) {
            toast.success('Dados do lead aplicados', { description: 'Preencha o restante e gere a proposta.' });
        }
    }, [clientes, initialDataFromLead, onConsumedInitialData]);

    // Salvar rascunho automaticamente ao sair da página
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (userId && (items.length > 0 || formState.titulo || formState.clienteId)) {
                salvarRascunho();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [userId, items, formState]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [clientesRes, materiaisRes, servicosRes, quadrosRes, kitsRes, cotacoesRes, empresasRes] = await Promise.all([
                clientesService.listar(),
                axiosApiService.get<Material[]>(ENDPOINTS.MATERIAIS),
                servicosService.listar(), // Carregar todos os serviços (filtrar apenas ativos no frontend)
                quadrosService.listar(),
                axiosApiService.get(ENDPOINTS.KITS), // Carregar kits
                axiosApiService.get('/api/cotacoes'), // Carregar cotações
                empresasService.listar({ ativo: true })
            ]);

            if (clientesRes.success && clientesRes.data) {
                setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : []);
            }

            if (materiaisRes.success && materiaisRes.data) {
                const materiaisArray = Array.isArray(materiaisRes.data) ? materiaisRes.data : [];
                setMateriais(materiaisArray);
                // Incluir todos os materiais ativos para permitir buscar e adicionar itens esgotados
                setMateriaisComEstoque(materiaisArray.filter((m: Material) => m.ativo));
            }

            if (servicosRes.success && servicosRes.data) {
                setServicos(Array.isArray(servicosRes.data) ? servicosRes.data : []);
            }

            if (quadrosRes.success && quadrosRes.data) {
                setQuadros(Array.isArray(quadrosRes.data) ? quadrosRes.data : []);
            }

            if (kitsRes.success && kitsRes.data) {
                const kitsData = Array.isArray(kitsRes.data) ? kitsRes.data : [];
                // Mapear kits do backend para o formato esperado
                const kitsMapeados = kitsData.map((kit: any) => {
                    // Garantir que itensFaltantes seja sempre um array
                    let itensFaltantesProcessados: any[] = [];
                    if (kit.itensFaltantes) {
                        if (typeof kit.itensFaltantes === 'string') {
                            try {
                                const parsed = JSON.parse(kit.itensFaltantes);
                                itensFaltantesProcessados = Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) {
                                console.error('Erro ao fazer parse de itensFaltantes:', e);
                                itensFaltantesProcessados = [];
                            }
                        } else if (Array.isArray(kit.itensFaltantes)) {
                            itensFaltantesProcessados = kit.itensFaltantes;
                        } else if (typeof kit.itensFaltantes === 'object') {
                            itensFaltantesProcessados = [kit.itensFaltantes];
                        }
                    }
                    
                    return {
                        id: kit.id,
                        nome: kit.nome,
                        descricao: kit.descricao || '',
                        items: kit.items || [],
                        itensFaltantes: itensFaltantesProcessados, // ✅ IMPORTANTE: Incluir itensFaltantes (cotações + serviços)
                        custoTotal: kit.preco || 0,
                        precoSugerido: kit.preco || 0,
                        ativo: kit.ativo !== false,
                        temItensCotacao: kit.temItensCotacao || false,
                        statusEstoque: kit.statusEstoque || 'COMPLETO'
                    };
                });
                setKits(kitsMapeados);
                console.log(`✅ ${kitsMapeados.length} kits carregados`);
            }

            if (cotacoesRes.success && cotacoesRes.data) {
                const cotacoesArray = Array.isArray(cotacoesRes.data) ? cotacoesRes.data : [];
                setCotacoes(cotacoesArray);
                setCotacoesBancoFrio(cotacoesArray); // Cotações para comparação
            }

            if (empresasRes.success && empresasRes.data) {
                setEmpresas(Array.isArray(empresasRes.data) ? empresasRes.data : []);
            } else {
                setEmpresas([]);
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar dados iniciais');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar materiais para seleção (agora inclui materiais mesmo sem estoque)
    const filteredMaterials = useMemo(() => {
        if (!itemSearchTerm.trim()) return (materiais || []).filter(m => m && m.ativo);
        return (materiais || []).filter(m =>
            m && m.ativo && (
                matchCrossSearch(itemSearchTerm, m.nome || '') ||
                (m.sku || '').toLowerCase().includes(itemSearchTerm.toLowerCase())
            )
        );
    }, [materiais, itemSearchTerm]);

    // Recarregar serviços quando a aba de serviços é selecionada
    useEffect(() => {
        if (modoAdicao === 'servicos') {
            const recarregarServicos = async () => {
                try {
                    const servicosRes = await servicosService.listar();
                    if (servicosRes.success && servicosRes.data) {
                        setServicos(Array.isArray(servicosRes.data) ? servicosRes.data : []);
                        console.log('✅ Serviços recarregados:', servicosRes.data.length);
                    }
                } catch (error) {
                    console.error('Erro ao recarregar serviços:', error);
                }
            };
            recarregarServicos();
        }
    }, [modoAdicao]);

    // Expandir modal automaticamente quando houver texto na busca global
    useEffect(() => {
        if (showItemModal && buscaGlobal.trim()) {
            setModalExpandido(true);
        } else if (showItemModal && !buscaGlobal.trim() && modalExpandido && modoAdicao !== 'comparacao') {
            setModalExpandido(false);
        }
    }, [buscaGlobal, showItemModal, modalExpandido, modoAdicao]);

    // Filtrar serviços para seleção (apenas ativos)
    const filteredServicos = useMemo(() => {
        if (!itemSearchTerm.trim()) return (servicos || []).filter(s => s && s.ativo);
        return (servicos || []).filter(s => 
            s && s.ativo && (
                matchCrossSearch(itemSearchTerm, s.nome || '') ||
                (s.codigo || '').toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                (s.descricao || '').toLowerCase().includes(itemSearchTerm.toLowerCase())
            )
        );
    }, [servicos, itemSearchTerm]);

    // Filtrar quadros para seleção
    const filteredQuadros = useMemo(() => {

        if (!itemSearchTerm.trim()) return (quadros || []).filter(q => q && q.ativo);
        return (quadros || []).filter(q => 
            q && q.ativo && (
                matchCrossSearch(itemSearchTerm, q.nome || '') ||
                (q.descricao || '').toLowerCase().includes(itemSearchTerm.toLowerCase())
            )
        );
    }, [quadros, itemSearchTerm]);

    // Filtrar kits para seleção
    const filteredKits = useMemo(() => {

        if (!itemSearchTerm.trim()) return (kits || []).filter(k => k && k.ativo);
        return (kits || []).filter(k => 
            k && k.ativo && (
                matchCrossSearch(itemSearchTerm, k.nome || '') ||
                (k.descricao || '').toLowerCase().includes(itemSearchTerm.toLowerCase())
            )
        );
    }, [kits, itemSearchTerm]);

    const getKitCustoTotal = (kit: any) => {
        if (!kit) return 0;
        
        // Custo dos materiais do estoque real
        const custoEstoque = Array.isArray(kit.items)
            ? kit.items.reduce((sum: number, kitItem: any) => {
                const precoCompra = kitItem.material?.preco || 0; // Preço de compra do material
                return sum + precoCompra * (kitItem.quantidade || 0);
            }, 0)
            : 0;
        
        // Custo das cotações do banco frio e serviços
        const custoExtras = Array.isArray(kit.itensFaltantes)
            ? kit.itensFaltantes.reduce((sum: number, item: any) => {
                let custoUnit = 0;
                
                // Para serviços: buscar dados completos do serviço
                if (item.tipo === 'SERVICO' && item.servicoId) {
                    const servicoCompleto = servicos.find((s: any) => s.id === item.servicoId);
                    if (servicoCompleto) {
                        custoUnit = servicoCompleto.custo || 0;
                    }
                }
                // Para cotações: buscar dados completos da cotação
                else if (item.tipo === 'COTACAO' && item.cotacaoId) {
                    const cotacaoCompleta = cotacoes.find((c: any) => c.id === item.cotacaoId);
                    if (cotacaoCompleta) {
                        custoUnit = cotacaoCompleta.valorUnitario || 0;
                    }
                }
                // Fallback: usar dados do item
                else {
                    custoUnit = item.valorUnitario || item.custo || 0;
                }
                
                return sum + custoUnit * (item.quantidade || 0);
            }, 0)
            : 0;
        
        return custoEstoque + custoExtras;
    };

    const getKitPrecoVendaTotal = (kit: any) => {
        if (!kit) return 0;

        const totalEstoque = Array.isArray(kit.items)
            ? kit.items.reduce((sum: number, kitItem: any) => {
                const precoVenda = kitItem.material?.valorVenda || kitItem.material?.preco || 0;
                return sum + precoVenda * (kitItem.quantidade || 0);
            }, 0)
            : 0;

        const totalExtras = Array.isArray(kit.itensFaltantes)
            ? kit.itensFaltantes.reduce((sum: number, item: any) => {
                const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                return sum + precoUnit * (item.quantidade || 0);
            }, 0)
            : 0;

        return totalEstoque + totalExtras;
    };

    // Filtrar cotações para seleção
    const filteredCotacoes = useMemo(() => {

        if (!itemSearchTerm.trim()) return (cotacoes || []).filter(c => c && c.ativo !== false);
        const termo = itemSearchTerm.toLowerCase();
        return (cotacoes || []).filter(c => 
            c && c.ativo !== false && (
                (c.nome || '').toLowerCase().includes(termo) ||
                (c.ncm || '').toLowerCase().includes(termo) ||
                (c.fornecedorNome || '').toLowerCase().includes(termo)
            )
        );
    }, [cotacoes, itemSearchTerm]);

    // Filtrar materiais com estoque para comparação (com busca global ou específica; * e % = palavras cruzadas)
    const filteredMateriaisEstoque = useMemo(() => {
        const termoBusca = searchGlobalComparacao || searchEstoque;

        if (!termoBusca.trim()) return materiaisComEstoque || [];

        return (materiaisComEstoque || []).filter(material => {
            if (!material) return false;
            const haystack = [material.nome, material.sku].filter(Boolean).join(' ');
            return matchCrossSearch(termoBusca, haystack);
        });
    }, [materiaisComEstoque, searchEstoque, searchGlobalComparacao]);

    // Filtrar cotações para comparação (com busca global ou específica; * e % = palavras cruzadas)
    const filteredCotacoesComparacao = useMemo(() => {
        const termoBusca = searchGlobalComparacao || searchCotacoes;

        if (!termoBusca.trim()) return cotacoesBancoFrio || [];

        return (cotacoesBancoFrio || []).filter(cotacao => {
            if (!cotacao) return false;
            const haystack = [cotacao.nome, cotacao.ncm, cotacao.fornecedorNome].filter(Boolean).join(' ');
            return matchCrossSearch(termoBusca, haystack);
        });
    }, [cotacoesBancoFrio, searchCotacoes, searchGlobalComparacao]);

    // Busca global em todos os tipos de itens
    useEffect(() => {
        if (!buscaGlobal.trim()) {
            setResultadosBuscaGlobal({
                materiais: [],
                servicos: [],
                kits: [],
                quadros: [],
                cotacoes: []
            });
            return;
        }

        const materiaisEncontrados = (materiais || [])
            .filter(m => m && m.ativo)
            .filter(m => 
                matchCrossSearch(buscaGlobal, m.nome || '') ||
                (m.sku || '').toLowerCase().includes(buscaGlobal.toLowerCase())
            );

        const servicosEncontrados = (servicos || [])
            .filter(s => s && s.ativo)
            .filter(s =>
                matchCrossSearch(buscaGlobal, s.nome || '') ||
                (s.codigo || '').toLowerCase().includes(buscaGlobal.toLowerCase()) ||
                (s.descricao || '').toLowerCase().includes(buscaGlobal.toLowerCase())
            );

        const kitsEncontrados = (kits || [])
            .filter(k => k && k.ativo)
            .filter(k =>
                matchCrossSearch(buscaGlobal, k.nome || '') ||
                (k.descricao || '').toLowerCase().includes(buscaGlobal.toLowerCase())
            );

        const quadrosEncontrados = (quadros || [])
            .filter(q => q && q.ativo)
            .filter(q =>
                matchCrossSearch(buscaGlobal, q.nome || '') ||
                (q.descricao || '').toLowerCase().includes(buscaGlobal.toLowerCase())
            );

        const cotacoesEncontradas = (cotacoes || [])
            .filter(c => c && c.ativo !== false)
            .filter(c =>
                matchCrossSearch(buscaGlobal, c.nome || '') ||
                (c.ncm || '').toLowerCase().includes(buscaGlobal.toLowerCase()) ||
                (c.fornecedorNome || '').toLowerCase().includes(buscaGlobal.toLowerCase())
            );

        setResultadosBuscaGlobal({
            materiais: materiaisEncontrados,
            servicos: servicosEncontrados,
            kits: kitsEncontrados,
            quadros: quadrosEncontrados,
            cotacoes: cotacoesEncontradas
        });
    }, [buscaGlobal, materiais, servicos, kits, quadros, cotacoes]);

    // Carregar preferência do usuário (modo check vs ocultar)
    useEffect(() => {
        configuracoesService.getPreferenciasUsuario().then((res) => {
            if (res.success && res.data?.orcamentoInsercaoModo) {
                setOrcamentoInsercaoModo(res.data.orcamentoInsercaoModo);
            }
        }).catch(() => {});
    }, []);

    // Helper: verifica se um item do catálogo já está no orçamento
    const itemJaNoOrcamento = (itemsOrc: OrcamentoItem[], tipo: string, id: string): boolean => {
        return itemsOrc.some((it) => {
            if (tipo === 'MATERIAL' && it.materialId === id) return true;
            if (tipo === 'SERVICO' && it.servicoId === id) return true;
            if (tipo === 'KIT' && it.kitId === id) return true;
            if (tipo === 'QUADRO_PRONTO' && it.quadroId === id) return true;
            if (tipo === 'COTACAO' && it.cotacaoId === id) return true;
            return false;
        });
    };

    // Resultados da busca do catálogo na página (mesma lógica da buscaGlobal, lista flat para dropdown)
    type ItemCatalogoLinha = { tipo: 'MATERIAL' | 'SERVICO' | 'KIT' | 'QUADRO_PRONTO' | 'COTACAO'; id: string; codigo: string; descricao: string; raw: Material | Servico | Kit | Quadro | any };
    const resultadosBuscaCatalogoPagina = useMemo((): ItemCatalogoLinha[] => {
        if (!buscaCatalogoPagina.trim()) return [];
        const termo = buscaCatalogoPagina.trim();
        const linhas: ItemCatalogoLinha[] = [];
        const materiaisFilt = (materiais || []).filter(m => m && m.ativo).filter(m =>
            matchCrossSearch(termo, m.nome || '') || (m.sku || '').toLowerCase().includes(termo.toLowerCase())
        );
        const servicosFilt = (servicos || []).filter(s => s && s.ativo).filter(s =>
            matchCrossSearch(termo, s.nome || '') || (s.codigo || '').toLowerCase().includes(termo.toLowerCase()) || (s.descricao || '').toLowerCase().includes(termo.toLowerCase())
        );
        const kitsFilt = (kits || []).filter(k => k && k.ativo).filter(k =>
            matchCrossSearch(termo, k.nome || '') || (k.descricao || '').toLowerCase().includes(termo.toLowerCase())
        );
        const quadrosFilt = (quadros || []).filter(q => q && q.ativo).filter(q =>
            matchCrossSearch(termo, q.nome || '') || (q.descricao || '').toLowerCase().includes(termo.toLowerCase())
        );
        const cotacoesFilt = (cotacoes || []).filter(c => c && c.ativo !== false).filter(c =>
            matchCrossSearch(termo, c.nome || '') || (c.ncm || '').toLowerCase().includes(termo.toLowerCase()) || (c.fornecedorNome || '').toLowerCase().includes(termo.toLowerCase())
        );
        materiaisFilt.forEach(m => {
            if (orcamentoInsercaoModo === 'ocultar' && itemJaNoOrcamento(items, 'MATERIAL', m.id)) return;
            linhas.push({ tipo: 'MATERIAL', id: m.id, codigo: m.sku || '', descricao: m.nome || '', raw: m });
        });
        servicosFilt.forEach(s => {
            if (orcamentoInsercaoModo === 'ocultar' && itemJaNoOrcamento(items, 'SERVICO', s.id)) return;
            linhas.push({ tipo: 'SERVICO', id: s.id, codigo: (s as any).codigo || '', descricao: s.nome || '', raw: s });
        });
        kitsFilt.forEach(k => {
            if (orcamentoInsercaoModo === 'ocultar' && itemJaNoOrcamento(items, 'KIT', k.id)) return;
            linhas.push({ tipo: 'KIT', id: k.id, codigo: '', descricao: k.nome || '', raw: k });
        });
        quadrosFilt.forEach(q => {
            if (orcamentoInsercaoModo === 'ocultar' && itemJaNoOrcamento(items, 'QUADRO_PRONTO', q.id)) return;
            linhas.push({ tipo: 'QUADRO_PRONTO', id: q.id, codigo: '', descricao: q.nome || '', raw: q });
        });
        cotacoesFilt.forEach(c => {
            if (orcamentoInsercaoModo === 'ocultar' && itemJaNoOrcamento(items, 'COTACAO', c.id)) return;
            linhas.push({ tipo: 'COTACAO', id: c.id, codigo: c.ncm || '', descricao: c.nome || '', raw: c });
        });
        return linhas;
    }, [buscaCatalogoPagina, materiais, servicos, kits, quadros, cotacoes, items, orcamentoInsercaoModo]);

    // Adicionar item com validação de estoque vs cotação
    const handleAddItemComValidacao = (material?: Material, cotacao?: any, quantidade?: number) => {
        const qtd = quantidade || 1;
        
        // Validar estoque se for material
        if (material) {
            if (material.estoque < qtd) {
                // Antes bloqueávamos a inserção — agora apenas alertamos e permitimos adicionar ao orçamento.
                toast.warning('Estoque insuficiente', {
                    description: `Estoque disponível: ${material.estoque} ${material.unidadeMedida}. Solicitado: ${qtd} ${material.unidadeMedida}`
                });
                // continuar e permitir adicionar mesmo com estoque insuficiente
            }
            

            // Usar valorVenda se disponível, senão usar preco (preço de compra)
            const precoVenda = material.valorVenda || material.preco;
            const precoBase = precoVenda;

            const newItem: OrcamentoItem = {
                tipo: 'MATERIAL',
                materialId: material.id,
                nome: material.nome,
                descricao: material.nome,
                unidadeMedida: material.unidadeMedida,
                ncm: material.ncm || undefined, // ✅ NCM do material para faturamento
                quantidade: qtd,
                custoUnit: material.preco, // Custo de compra
                precoBase: precoBase,
                precoUnit: precoBase,
                subtotal: precoBase * qtd
            };
            
            setItems(prev => [...prev, newItem]);
            toast.success('Material adicionado', {
                description: `${material.nome} (${qtd} ${material.unidadeMedida}) - Estoque: ${material.estoque} ${material.unidadeMedida}`
            });
        }
        
        // Adicionar cotação se fornecida
        if (cotacao) {
            // Usar valorVenda se disponível; senão, aplicar markup padrão de 40% sobre o valor da cotação
            const valorVenda = cotacao.valorVenda || (cotacao.valorUnitario || 0) * 1.4;
            const precoBase = valorVenda;

            const newItem: OrcamentoItem = {
                tipo: 'COTACAO',
                cotacaoId: cotacao.id,
                nome: cotacao.nome,
                descricao: cotacao.observacoes || cotacao.nome,
                unidadeMedida: normalizarUnidadeMedidaOrcamento(cotacao.unidadeMedida) || 'un',
                ncm: cotacao.ncm || undefined, // ✅ NCM da cotação para faturamento
                quantidade: qtd,
                custoUnit: cotacao.valorUnitario || 0, // Custo da cotação
                precoBase: precoBase,
                precoUnit: precoBase,
                subtotal: precoBase * qtd,
                dataAtualizacaoCotacao: cotacao.dataAtualizacao
            };
            
            setItems(prev => [...prev, newItem]);
            toast.success('Cotação adicionada', {
                description: `${cotacao.nome} do banco frio - Fornecedor: ${cotacao.fornecedorNome || 'N/A'}`
            });
        }
        
        // Limpar seleções
        setMaterialSelecionadoComparacao(null);
        setCotacaoSelecionadaComparacao(null);
        setMateriaisSelecionadosComparacao(new Set());
        setCotacoesSelecionadasComparacao(new Set());
    };

    // Funções para gerenciar seleção múltipla
    const toggleMaterialSelecionado = (materialId: string) => {
        setMateriaisSelecionadosComparacao(prev => {
            const novo = new Set(prev);
            if (novo.has(materialId)) {
                novo.delete(materialId);
                setQuantidadesPorItem(prevQtd => {
                    const next = { ...prevQtd };
                    delete next[materialId];
                    return next;
                });
            } else {
                novo.add(materialId);
                setQuantidadesPorItem(prevQtd => ({ ...prevQtd, [materialId]: prevQtd[materialId] || 1 }));
            }
            return novo;
        });
    };

    const toggleCotacaoSelecionada = (cotacaoId: string) => {
        setCotacoesSelecionadasComparacao(prev => {
            const novo = new Set(prev);
            if (novo.has(cotacaoId)) {
                novo.delete(cotacaoId);
                setQuantidadesPorItem(prevQtd => {
                    const next = { ...prevQtd };
                    delete next[cotacaoId];
                    return next;
                });
            } else {
                novo.add(cotacaoId);
                setQuantidadesPorItem(prevQtd => ({ ...prevQtd, [cotacaoId]: prevQtd[cotacaoId] || 1 }));
            }
            return novo;
        });
    };

    // Função para inserir múltiplos itens selecionados
    const handleInserirSelecionados = () => {
        let inseridos = 0;
        
        // Inserir materiais selecionados
        materiaisSelecionadosComparacao.forEach(materialId => {
            const material = materiaisComEstoque.find(m => m.id === materialId);
            if (material) {
                const qtd = quantidadesPorItem[materialId] || 1;
                handleAddItemComValidacao(material, undefined, qtd);
                inseridos++;
            }
        });
        
        // Inserir cotações selecionadas
        cotacoesSelecionadasComparacao.forEach(cotacaoId => {
            const cotacao = cotacoesBancoFrio.find(c => c.id === cotacaoId);
            if (cotacao) {
                const qtd = quantidadesPorItem[cotacaoId] || 1;
                handleAddItemComValidacao(undefined, cotacao, qtd);
                inseridos++;
            }
        });
        
        if (inseridos > 0) {
            toast.success(`${inseridos} item(ns) inserido(s) com sucesso!`);
            // Limpar seleções
            setMateriaisSelecionadosComparacao(new Set());
            setCotacoesSelecionadasComparacao(new Set());
            setQuantidadesPorItem({});
        }
    };

    // Calcular totais do orçamento
    const calculosOrcamento = useMemo(() => {
        const subtotalItens = items.reduce((sum, item) => sum + item.subtotal, 0);
        const valorComDesconto = subtotalItens - formState.descontoValor;
        const valorTotalFinal = valorComDesconto * (1 + formState.impostoPercentual / 100);

        return { subtotalItens, valorComDesconto, valorTotalFinal };
    }, [items, formState.descontoValor, formState.impostoPercentual]);

    // Adicionar material do estoque ao orçamento
    const handleAddItem = (material: Material, manterModalAberto = false, unidadeVendaParam?: string, quantidade = 1) => {
        const unidadeVenda = unidadeVendaParam || material.unidadeMedida;
        
        // Determinar preço de venda e custo baseado na unidade
        let precoVenda = material.preco; // Fallback para preço de compra
        let custoUnit = material.preco; // Custo padrão
        
        // Se a unidade de medida do estoque for M ou KG/M, usar valores específicos
        if (podeVenderEmMetroOuCm(material.unidadeMedida)) {
            if (unidadeVenda === 'm') {
                // Usar valorVendaM se disponível, senão calcular do valorVenda padrão ou preço
                precoVenda = (material as any).valorVendaM || material.valorVenda || material.preco;
                custoUnit = material.preco; // Custo em metro é o preço de compra
            } else if (unidadeVenda === 'cm') {
                // Usar valorVendaCM se disponível, senão calcular dividindo valorVendaM por 100
                precoVenda = (material as any).valorVendaCM || 
                            ((material as any).valorVendaM ? (material as any).valorVendaM / 100 : 
                            (material.valorVenda ? material.valorVenda / 100 : material.preco / 100));
                // Usar custoCM se disponível, senão calcular dividindo preço por 100
                custoUnit = (material as any).custoCM || 
                           (material.preco ? material.preco / 100 : 0);
            }
        } else {
            // Para outras unidades, usar valorVenda padrão se disponível
            precoVenda = material.valorVenda || material.preco;
            custoUnit = material.preco; // Custo padrão
        }
        
        const precoBase = precoVenda;
        const empresaAdd = empresas.find(e => e.cnpj === formState.empresaCNPJ);
        const aliquotaMat = empresaAdd?.aliquotaMaterial ?? 8;
        const custoAgregado = (material as any).custoAgregado ?? (custoUnit + (precoBase * aliquotaMat / 100));

        const newItem: OrcamentoItem = {
            tipo: 'MATERIAL',
            materialId: material.id,
            nome: material.nome,
            descricao: material.nome, // Usar o nome como descrição
            unidadeMedida: normalizarUnidadeMedidaOrcamento(material.unidadeMedida),
            unidadeVenda: normalizarUnidadeMedidaOrcamento(unidadeVenda), // ✅ Unidade de venda (metros/cm herdam)
            ncm: material.ncm || undefined, // ✅ NCM do material para faturamento
            quantidade,
            custoUnit: custoUnit, // Custo baseado na unidade de venda
            custoAgregadoUnit: custoAgregado, // Custo agregado (compra + imposto) para lucro líquido
            precoBase: precoBase,
            precoUnit: precoBase,
            subtotal: precoBase * quantidade
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Material adicionado', {
            description: `${material.nome} adicionado ao orçamento (${unidadeVenda})`
        });
    };


    // Fechar modais com ESC
    useEscapeKey(showItemModal, () => {
        setShowItemModal(false);
        setModalExpandido(false);
        setItensSelecionadosModal(new Set());
        setUnidadeVendaSelecionada({});
        setQuantidadesPorItem({});
    });

    // Função para adicionar múltiplos itens selecionados
    const handleAdicionarSelecionados = () => {
        if (itensSelecionadosModal.size === 0) {
            toast.error('Nenhum item selecionado', {
                description: 'Selecione pelo menos um item para adicionar'
            });
            return;
        }

        let adicionados = 0;
        
        if (modoAdicao === 'materiais') {
            filteredMaterials.forEach(material => {
                if (itensSelecionadosModal.has(material.id)) {
                    const unidadeVenda = unidadeVendaSelecionada[material.id] || material.unidadeMedida;
                    const quantidade = quantidadesPorItem[material.id] || 1;
                    handleAddItem(material, true, unidadeVenda, quantidade);
                    adicionados += 1;
                }
            });
        } else if (modoAdicao === 'servicos') {
            filteredServicos.forEach(servico => {
                if (itensSelecionadosModal.has(servico.id)) {
                    const quantidade = quantidadesPorItem[servico.id] || 1;
                    handleAddServico(servico, true, quantidade);
                    adicionados += 1;
                }
            });
        } else if (modoAdicao === 'kits') {
            filteredKits.forEach(kit => {
                if (itensSelecionadosModal.has(kit.id)) {
                    const quantidade = quantidadesPorItem[kit.id] || 1;
                    handleAddKit(kit, true, quantidade);
                    adicionados += 1;
                }
            });
        } else if (modoAdicao === 'quadros') {
            filteredQuadros.forEach(quadro => {
                if (itensSelecionadosModal.has(quadro.id)) {
                    const quantidade = quantidadesPorItem[quadro.id] || 1;
                    handleAddQuadro(quadro, true, quantidade);
                    adicionados += 1;
                }
            });
        } else if (modoAdicao === 'cotacoes') {
            filteredCotacoes.forEach(cotacao => {
                if (itensSelecionadosModal.has(cotacao.id)) {
                    const unidadeVenda = unidadeVendaSelecionada[cotacao.id] || cotacao.unidadeMedida || 'UN';
                    const quantidade = Math.max(0.01, parseFloat(String(quantidadesPorItem[cotacao.id])) || 1);
                    handleAddCotacao(cotacao, true, unidadeVenda, quantidade);
                    adicionados += 1;
                }
            });
        }

        toast.success(`${adicionados} item(ns) adicionado(s)`, {
            description: `Foram adicionados ${adicionados} item(ns) ao orçamento`
        });

        // Limpar seleção
        setItensSelecionadosModal(new Set());
        setUnidadeVendaSelecionada({});
        setQuantidadesPorItem({});
    };

    // Função para selecionar/deselecionar item
    const handleToggleSelecaoItem = (itemId: string) => {
        setItensSelecionadosModal(prev => {
            const novo = new Set(prev);
            if (novo.has(itemId)) {
                novo.delete(itemId);
                // Remover unidade de venda selecionada
                const novasUnidades = { ...unidadeVendaSelecionada };
                delete novasUnidades[itemId];
                setUnidadeVendaSelecionada(novasUnidades);
                
                // Remover quantidade
                const novasQuantidades = { ...quantidadesPorItem };
                delete novasQuantidades[itemId];
                setQuantidadesPorItem(novasQuantidades);
            } else {
                novo.add(itemId);
                // Inicializar quantidade com 1
                setQuantidadesPorItem(prev => ({ ...prev, [itemId]: 1 }));
            }
            return novo;
        });
    };

    // Função para selecionar todos os itens visíveis
    const handleSelecionarTodos = () => {
        let ids: string[] = [];
        
        if (modoAdicao === 'materiais') {
            ids = filteredMaterials.map(m => m.id);
        } else if (modoAdicao === 'servicos') {
            ids = filteredServicos.map(s => s.id);
        } else if (modoAdicao === 'kits') {
            ids = filteredKits.map(k => k.id);
        } else if (modoAdicao === 'quadros') {
            ids = filteredQuadros.map(q => q.id);
        } else if (modoAdicao === 'cotacoes') {
            ids = filteredCotacoes.map(c => c.id);
        }

        setItensSelecionadosModal(new Set(ids));
    };

    // Função para deselecionar todos
    const handleDeselecionarTodos = () => {
        setItensSelecionadosModal(new Set());
        setUnidadeVendaSelecionada({});
    };

    // Adicionar serviço ao orçamento
    const handleAddServico = (servico: Servico, manterModalAberto = false, quantidade = 1) => {
        const precoBase = servico.preco;
        const newItem: OrcamentoItem = {
            tipo: 'SERVICO',
            servicoId: servico.id,
            servicoNome: servico.nome,
            nome: servico.nome,
            descricao: servico.descricao,
            unidadeMedida: normalizarUnidadeMedidaOrcamento(servico.unidade) || 'un',
            quantidade,
            custoUnit: servico.custo || 0, // Custo do serviço (se não houver, usar 0)
            precoBase: precoBase,
            precoUnit: precoBase,
            subtotal: precoBase * quantidade
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Serviço adicionado', {
            description: `${servico.nome} adicionado ao orçamento`
        });
    };

    // Adicionar quadro ao orçamento
    const handleAddQuadro = (quadro: Quadro, manterModalAberto = false, quantidade = 1) => {
        const precoVenda = quadro.precoSugerido || quadro.custoTotal;
        const precoBase = precoVenda;
        const newItem: OrcamentoItem = {
            tipo: 'QUADRO_PRONTO',
            quadroId: quadro.id,
            nome: quadro.nome,
            descricao: quadro.descricao,
            unidadeMedida: 'UN',
            quantidade,
            custoUnit: quadro.custoTotal, // Custo do quadro
            precoBase: precoBase,
            precoUnit: precoBase,
            subtotal: precoBase * quantidade
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Quadro adicionado', {
            description: `${quadro.nome} adicionado ao orçamento`
        });
    };

    // Adicionar cotação ao orçamento (BANCO FRIO)
    const handleAddCotacao = (cotacao: any, manterModalAberto = false, unidadeVendaParam?: string, quantidade = 1) => {
        const fracionado = cotacao.quantidadePorEmbalagem != null && Number(cotacao.quantidadePorEmbalagem) > 0;
        const qtdEmbalagem = fracionado ? Number(cotacao.quantidadePorEmbalagem) : 1;

        const rawUnit = (unidadeVendaParam || cotacao.unidadeMedida || 'UN').toLowerCase().trim();
        const unidadeVenda = rawUnit === 'cm' ? 'cm' : (rawUnit === 'm' ? 'm' : rawUnit);
        const unidadeLower = unidadeVenda.toLowerCase();

        // Fracionamento: 1 pacote = quantidadePorEmbalagem unidades → inserir por unidade com valor convertido
        if (fracionado) {
            const custoUnitario = roundMoney((cotacao.valorUnitario || 0) / qtdEmbalagem);
            const valorVendaUn = roundMoney((cotacao.valorVenda ?? (cotacao.valorUnitario || 0) * 1.4) / qtdEmbalagem);
            const precoBase = valorVendaUn;
            const qtd = Math.max(0.01, quantidade);
            const newItem: OrcamentoItem = {
                tipo: 'COTACAO',
                cotacaoId: cotacao.id,
                nome: cotacao.nome,
                descricao: cotacao.nome,
                dataAtualizacaoCotacao: cotacao.dataAtualizacao,
                unidadeMedida: 'UN',
                unidadeVenda: 'UN',
                quantidade: qtd,
                custoUnit: custoUnitario,
                precoBase,
                precoUnit: precoBase,
                subtotal: roundMoney(precoBase * qtd),
                ncm: cotacao.ncm ?? undefined
            };
            setItems(prev => [...prev, newItem]);
            if (!manterModalAberto) setShowItemModal(false);
            setItemSearchTerm('');
            setBuscaGlobal('');
            toast.success('Cotação adicionada (fracionada por unidade)', {
                description: `${cotacao.nome} - 1 un = 1/${qtdEmbalagem} pacote • ${qtd} un`
            });
            return;
        }

        // Calcular custo baseado na unidade de venda
        let custoUnitario = cotacao.valorUnitario || 0;
        if (podeVenderEmMetroOuCm(cotacao.unidadeMedida) && unidadeLower === 'cm') {
            custoUnitario = cotacao.valorUnitario / 100;
        }
        custoUnitario = roundMoney(custoUnitario);

        // Valor de venda: quando em CM, usar valor por metro / 100
        let valorVenda = cotacao.valorVenda ?? (cotacao.valorUnitario || 0) * 1.4;
        if (podeVenderEmMetroOuCm(cotacao.unidadeMedida) && unidadeLower === 'cm') {
            valorVenda = valorVenda / 100;
        }
        const precoBase = roundMoney(valorVenda);
        
        // Identificar tipo de material baseado no nome da cotação
        const tipoMaterial = identificarTipoMaterial(cotacao.nome);
        
        const newItem: OrcamentoItem = {
            tipo: 'COTACAO',
            cotacaoId: cotacao.id,
            nome: cotacao.nome,
            descricao: cotacao.nome, // ✅ Apenas o nome do material (não mostrar fornecedor)
            dataAtualizacaoCotacao: cotacao.dataAtualizacao,
            unidadeMedida: unidadeLower === 'cm' ? 'cm' : (unidadeLower === 'm' ? 'm' : unidadeVenda),
            unidadeVenda: unidadeLower === 'cm' ? 'cm' : (unidadeLower === 'm' ? 'm' : unidadeVenda), // ✅ Unidade de venda (m ou cm)
            tipoMaterial: tipoMaterial, // ✅ NOVO: Tipo para conversão
            quantidade,
            custoUnit: custoUnitario, // Custo é sempre o valor da cotação (valorUnitario)
            precoBase: precoBase,
            precoUnit: precoBase,
            subtotal: roundMoney(precoBase * quantidade),
            ncm: cotacao.ncm ?? undefined
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Cotação adicionada', {
            description: `${cotacao.nome} do banco frio adicionado ao orçamento (${unidadeVenda})`
        });
    };

    // Adicionar kit ao orçamento
    const handleAddKit = (kit: Kit, manterModalAberto = false, quantidade = 1) => {
        const kitCompleto = kits.find((k: any) => k.id === kit.id) || kit;
        const custoTotalKit = roundMoney(getKitCustoTotal(kitCompleto));
        const precoVendaTotalKit = roundMoney(getKitPrecoVendaTotal(kitCompleto));
        const precoBase = precoVendaTotalKit;

        // ✅ Materializar composição do kit do catálogo como itensDoKit (igual kit unificado)
        const itensDoKitParaSalvar: any[] = [];

        // Materiais do estoque (kit.items)
        (kitCompleto.items || []).forEach((it: any) => {
            const materialRef = it.material || materiais.find((m: any) => m.id === it.materialId);
            itensDoKitParaSalvar.push({
                tipo: 'MATERIAL',
                materialId: it.materialId,
                nome: materialRef?.nome || 'Material',
                codigo: materialRef?.sku || '',
                ncm: materialRef?.ncm,
                unidadeMedida: normalizarUnidadeMedidaOrcamento(materialRef?.unidadeMedida) || 'UN',
                quantidade: it.quantidade || 1,
                custoUnit: materialRef?.preco || 0,
                valorVenda: materialRef?.valorVenda ?? materialRef?.preco ?? 0,
                valorVendaOriginal: materialRef?.valorVenda ?? materialRef?.preco ?? 0
            });
        });

        // Banco frio / serviços (kit.itensFaltantes)
        (kitCompleto.itensFaltantes || []).forEach((extra: any) => {
            const tipoExtra = (extra.tipo || '').toUpperCase();
            if (tipoExtra === 'SERVICO' && extra.servicoId) {
                const servicoRef = servicos.find((s: any) => s.id === extra.servicoId);
                itensDoKitParaSalvar.push({
                    tipo: 'SERVICO',
                    servicoId: extra.servicoId,
                    nome: servicoRef?.nome || extra.nome || 'Serviço',
                    codigo: servicoRef?.codigo || extra.codigo || '',
                    unidadeMedida: normalizarUnidadeMedidaOrcamento(servicoRef?.unidade) || 'UN',
                    quantidade: extra.quantidade || 1,
                    custoUnit: servicoRef?.custo || 0,
                    valorVenda: servicoRef?.preco || 0,
                    valorVendaOriginal: servicoRef?.preco || 0
                });
            } else if (tipoExtra === 'COTACAO' && extra.cotacaoId) {
                const cotacaoRef = cotacoes.find((c: any) => c.id === extra.cotacaoId);
                const valorVenda = cotacaoRef?.valorVenda ?? (cotacaoRef?.valorUnitario || extra.valorUnitario || 0) * 1.4;
                itensDoKitParaSalvar.push({
                    tipo: 'COTACAO',
                    cotacaoId: extra.cotacaoId,
                    nome: cotacaoRef?.nome || extra.nome || extra.materialNome || 'Item do Banco Frio',
                    codigo: cotacaoRef?.fornecedorNome || cotacaoRef?.sku || extra.codigo || '',
                    ncm: cotacaoRef?.ncm || extra.ncm,
                    unidadeMedida: normalizarUnidadeMedidaOrcamento(cotacaoRef?.unidadeMedida || extra.unidadeMedida) || 'UN',
                    quantidade: extra.quantidade || 1,
                    custoUnit: cotacaoRef?.valorUnitario || extra.valorUnitario || 0,
                    valorVenda,
                    valorVendaOriginal: valorVenda,
                    dataUltimaCotacao: cotacaoRef?.dataAtualizacao || extra.dataUltimaCotacao || extra.dataAtualizacao
                });
            }
        });

        const newItem: OrcamentoItem = {
            tipo: 'KIT',
            kitId: kit.id,
            nome: kit.nome,
            descricao: kit.descricao,
            unidadeMedida: 'UN',
            quantidade,
            custoUnit: custoTotalKit, // Custo do kit (2 decimais)
            precoBase: precoBase,
            precoUnit: precoBase,
            subtotal: roundMoney(precoBase * quantidade),
            ...(itensDoKitParaSalvar.length > 0 ? ({ itensDoKit: itensDoKitParaSalvar } as any) : {})
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Kit adicionado', {
            description: `${kit.nome} adicionado ao orçamento`
        });
    };

    // Incluir item selecionado da busca do catálogo na página
    const handleIncluirCatalogoPagina = () => {
        if (!itemSelecionadoCatalogo) return;
        const qty = Math.max(0.01, quantidadeCatalogoPagina);
        const { tipo, raw } = itemSelecionadoCatalogo;
        if (tipo === 'MATERIAL') {
            const m = raw as Material;
            if (m.estoque < qty) {
                // Avisar, mas não bloquear a inclusão no orçamento — regra de negócio: propostas podem usar itens esgotados
                toast.warning('Estoque insuficiente', { description: `Disponível: ${m.estoque} ${m.unidadeMedida}` });
            }
            handleAddItem(m, false, m.unidadeMedida, qty);
        } else if (tipo === 'SERVICO') {
            handleAddServico(raw as Servico, false, qty);
        } else if (tipo === 'KIT') {
            handleAddKit(raw as Kit, false, qty);
        } else if (tipo === 'QUADRO_PRONTO') {
            handleAddQuadro(raw as Quadro, false, qty);
        } else if (tipo === 'COTACAO') {
            const c = raw as any;
            const unidade = podeVenderEmMetroOuCm(c.unidadeMedida) ? unidadeVendaCatalogoPagina : (c.unidadeMedida || 'UN');
            handleAddCotacao(c, false, unidade, qty);
        }
        setItemSelecionadoCatalogo(null);
        setQuantidadeCatalogoPagina(1);
        setBuscaCatalogoPagina('');
        setDropdownCatalogoAberto(false);
    };

    // Preço unitário e total do item selecionado na busca da página (para exibição)
    const precoUnitarioCatalogoPagina = useMemo(() => {
        if (!itemSelecionadoCatalogo) return 0;
        const { tipo, raw } = itemSelecionadoCatalogo;
        if (tipo === 'MATERIAL') {
            const m = raw as Material;
            return m.valorVenda || m.preco;
        }
        if (tipo === 'SERVICO') return (raw as Servico).preco;
        if (tipo === 'KIT') return getKitPrecoVendaTotal(raw as Kit);
        if (tipo === 'QUADRO_PRONTO') return ((raw as Quadro).precoSugerido || (raw as Quadro).custoTotal);
        if (tipo === 'COTACAO') {
            const c = raw as any;
            let v = c.valorVenda ?? (c.valorUnitario || 0) * 1.4;
            if (podeVenderEmMetroOuCm(c.unidadeMedida) && unidadeVendaCatalogoPagina === 'cm') v = v / 100;
            return v;
        }
        return 0;
    }, [itemSelecionadoCatalogo, unidadeVendaCatalogoPagina]);

    const totalCatalogoPagina = precoUnitarioCatalogoPagina * Math.max(1, quantidadeCatalogoPagina);

    // Remover item
    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
        // Remover da seleção se estiver selecionado
        setItensSelecionados(prev => {
            const novo = new Set(prev);
            novo.delete(index);
            // Ajustar índices após remoção
            const ajustado = new Set<number>();
            novo.forEach(idx => {
                if (idx > index) {
                    ajustado.add(idx - 1);
                } else {
                    ajustado.add(idx);
                }
            });
            return ajustado;
        });
    };

    /** Reposiciona um item na listagem (drag and drop). */
    const handleReorderItem = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
        setItems(prev => moveArrayItem(prev, fromIndex, toIndex));
        setItensSelecionados(prev => remapIndexSetAfterMove(prev, fromIndex, toIndex));
        setValorEditando(prev => remapIndexRecordAfterMove(prev, fromIndex, toIndex));
        setKitEmEdicao(prev =>
            prev ? { ...prev, index: remapIndexAfterMove(prev.index, fromIndex, toIndex) } : prev
        );
    };

    // Toggle seleção de item
    const toggleItemSelecionado = (index: number) => {
        setItensSelecionados(prev => {
            const novo = new Set(prev);
            if (novo.has(index)) {
                novo.delete(index);
            } else {
                novo.add(index);
            }
            return novo;
        });
    };

    // Selecionar todos os itens
    const selecionarTodosItens = () => {
        setItensSelecionados(new Set(items.map((_, index) => index)));
    };

    // Deselecionar todos os itens
    const deselecionarTodosItens = () => {
        setItensSelecionados(new Set());
    };

    // Criar kit a partir dos itens selecionados
    const handleCriarKit = () => {
        if (itensSelecionados.size === 0) {
            toast.error('Nenhum item selecionado', {
                description: 'Selecione pelo menos um item para criar um kit'
            });
            return;
        }

        if (!nomeKit.trim()) {
            toast.error('Nome do kit obrigatório', {
                description: 'Digite um nome para o kit'
            });
            return;
        }

        // Calcular valores totais dos itens selecionados
        const itensParaKit = Array.from(itensSelecionados)
            .sort((a, b) => a - b) // Ordenar índices
            .map(index => items[index])
            .filter(Boolean);

        if (itensParaKit.length === 0) {
            toast.error('Erro ao criar kit', {
                description: 'Nenhum item válido encontrado'
            });
            return;
        }

        const custoTotal = itensParaKit.reduce((sum, item) => sum + (item.custoUnit * item.quantidade), 0);
        const subtotalTotal = itensParaKit.reduce((sum, item) => sum + item.subtotal, 0);
        const precoUnit = subtotalTotal; // Preço unitário do kit é o subtotal total
        
        // Calcular precoBase do kit
        const precoBaseTotal = itensParaKit.reduce((sum, item) => {
            if (item.precoBase !== undefined) {
                return sum + (item.precoBase * item.quantidade);
            } else {
                return sum + (item.precoUnit * item.quantidade);
            }
        }, 0);

        // Preparar array de itens do kit para salvar (com nome, código, valor de venda e custo unitário)
        const itensDoKitParaSalvar = itensParaKit.map(item => {
            // Buscar material completo para obter código (sku) e valorVenda original (apenas para referência)
            let codigo = '';
            let valorVendaOriginal = 0;
            
            if (item.materialId) {
                const materialCompleto = materiais.find(m => m.id === item.materialId);
                if (materialCompleto) {
                    codigo = materialCompleto.sku || '';
                    valorVendaOriginal = materialCompleto.valorVenda || materialCompleto.preco || 0;
                }
            } else if (item.cotacaoId) {
                const cotacaoCompleta = cotacoes.find(c => c.id === item.cotacaoId);
                if (cotacaoCompleta) {
                    codigo = cotacaoCompleta.ncm || '';
                    valorVendaOriginal = cotacaoCompleta.valorVenda || cotacaoCompleta.valorUnitario || 0;
                }
            }

            // IMPORTANTE: Sempre usar o precoUnit atual do item no orçamento
            // Este valor já inclui edições manuais do usuário e ajustes feitos neste orçamento
            // O valorVendaOriginal é usado apenas para referência (mostrar valor original riscado)
            const valorVendaAtualizado = item.precoUnit || 0;

            return {
                nome: item.nome,
                codigo: codigo,
                custoUnit: item.custoUnit || 0, // ✅ Incluir custo unitário de cada item
                valorVenda: valorVendaAtualizado, // Sempre usar o precoUnit atual (com edições manuais)
                valorVendaOriginal: valorVendaOriginal, // Valor de venda original do cadastro (para referência)
                quantidade: item.quantidade,
                unidadeMedida: normalizarUnidadeMedidaOrcamento(item.unidadeMedida),
                materialId: item.materialId || null,
                cotacaoId: item.cotacaoId || null,
                kitId: item.kitId || null, // ✅ Preservar kitId se for um kit do catálogo
                tipo: item.tipo,
                subtotal: item.subtotal, // Usar o subtotal atual do item
                // ✅ Preservar composição de kits unificados
                ...((item as any).itensDoKit && {
                    itensDoKit: (item as any).itensDoKit
                })
            };
        });

        // Criar novo item do tipo KIT
        const novoKit: OrcamentoItem & { itensDoKit?: any } = {
            tipo: 'KIT',
            nome: nomeKit.trim(),
            descricao: nomeKit.trim(),
            unidadeMedida: 'UN',
            quantidade: 1,
            custoUnit: custoTotal,
            precoBase: precoBaseTotal,
            precoUnit: precoUnit,
            subtotal: precoUnit,
            ncm: ncmKit.trim() || undefined,
            kitId: undefined,
            itensDoKit: itensDoKitParaSalvar
        };

        // Remover itens selecionados e adicionar o kit
        const indicesParaRemover = Array.from(itensSelecionados).sort((a, b) => b - a); // Ordenar decrescente para remover do final
        let novosItems = [...items];
        
        // Remover itens do final para o início para não afetar os índices
        indicesParaRemover.forEach(index => {
            novosItems.splice(index, 1);
        });

        // Adicionar o kit
        novosItems.push(novoKit);

        setItems(novosItems);
        setItensSelecionados(new Set());
        setNomeKit('');
        setNcmKit('');
        setShowCriarKitModal(false);

        toast.success('Kit criado com sucesso!', {
            description: `${nomeKit.trim()} - R$ ${precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        });
    };

    // Inserir itens já existentes no orçamento dentro do kit unificado selecionado
    const handleInserirItemAoKit = () => {
        const selectedIndices = Array.from(itensSelecionados);
        const isKitUnificado = (i: number) => {
            const it = items[i];
            return it.tipo === 'KIT' && !it.kitId && Array.isArray((it as any).itensDoKit);
        };
        const kitSelecionados = selectedIndices.filter(isKitUnificado);
        const itensParaMoverIndices = selectedIndices.filter(i => !isKitUnificado(i));
        if (kitSelecionados.length !== 1 || itensParaMoverIndices.length === 0) return;

        const kitIndex = kitSelecionados[0];
        const kit = items[kitIndex] as OrcamentoItem & { itensDoKit?: any[] };
        if (!kit.itensDoKit) return;

        const itensParaMoverOrdenados = [...itensParaMoverIndices].sort((a, b) => a - b);
        const novosItensDoKit = itensParaMoverOrdenados.map(itemIndex => {
            const itemToMove = items[itemIndex];
            let codigo = '';
            if (itemToMove.materialId) {
                const m = materiais.find(m => m.id === itemToMove.materialId);
                if (m) codigo = m.sku || '';
            } else if (itemToMove.cotacaoId) {
                const c = cotacoes.find(c => c.id === itemToMove.cotacaoId);
                if (c) codigo = c.ncm || c.fornecedorNome || '';
            } else if (itemToMove.servicoId) {
                const s = servicos.find(s => s.id === itemToMove.servicoId);
                if (s) codigo = s.codigo || '';
            }

            return {
                nome: itemToMove.nome,
                codigo,
                tipo: itemToMove.tipo,
                quantidade: itemToMove.quantidade,
                unidadeMedida: normalizarUnidadeMedidaOrcamento(itemToMove.unidadeMedida) || 'un',
                valorVenda: itemToMove.precoUnit || 0,
                custoUnit: itemToMove.custoUnit || 0,
                custoAgregadoUnit: (itemToMove as any).custoAgregadoUnit,
                materialId: itemToMove.materialId || null,
                cotacaoId: itemToMove.cotacaoId || null,
                servicoId: itemToMove.servicoId || null,
                kitId: itemToMove.kitId || null,
                subtotal: itemToMove.subtotal,
            };
        });

        const indicesParaRemover = new Set(itensParaMoverIndices);
        const newItems = items.filter((_, i) => !indicesParaRemover.has(i));
        const removidosAntesDoKit = itensParaMoverIndices.filter(i => i < kitIndex).length;
        const kitNewIdx = kitIndex - removidosAntesDoKit;
        const kitAtual = newItems[kitNewIdx] as OrcamentoItem & { itensDoKit?: any[] };
        const newItensDoKit = [...(kitAtual.itensDoKit || []), ...novosItensDoKit];
        const subtotalTotal = newItensDoKit.reduce((s, it) => s + ((it.valorVenda || 0) * (it.quantidade || 1)), 0);
        const custoTotalKit = newItensDoKit.reduce((s, it) => s + ((it.custoUnit || 0) * (it.quantidade || 1)), 0);

        newItems[kitNewIdx] = {
            ...kitAtual,
            itensDoKit: newItensDoKit,
            precoUnit: subtotalTotal,
            subtotal: subtotalTotal,
            custoUnit: custoTotalKit,
        } as OrcamentoItem & { itensDoKit?: any[] };

        setItems(newItems);
        setItensSelecionados(new Set());
        toast.success('Itens inseridos ao kit', {
            description: `${novosItensDoKit.length} item(ns) foram adicionados à composição do kit ${kit.nome}`,
        });
    };

    const selecaoKitMaisUmItem = (() => {
        const sel = Array.from(itensSelecionados);
        const isKit = (i: number) => {
            const it = items[i];
            return it.tipo === 'KIT' && !it.kitId && Array.isArray((it as any).itensDoKit);
        };
        const kitsSelecionados = sel.filter(isKit).length;
        return kitsSelecionados === 1 && sel.length >= 2;
    })();

    const kitEdicaoDirty = useMemo(() => {
        if (!snapshotItensDoKitInicial) return false;
        if (pendentesBaixarDoKit.length > 0) return true;
        return JSON.stringify(itensKitEdicao) !== snapshotItensDoKitInicial;
    }, [itensKitEdicao, snapshotItensDoKitInicial, pendentesBaixarDoKit]);

    const totaisResumoKitEdicao = useMemo(() => {
        const empresaKit = empresas.find(e => e.cnpj === formState.empresaCNPJ);
        const aliquotaMaterialKit = empresaKit?.aliquotaMaterial ?? 8;
        let custoAgTotal = 0;
        let vendaTotal = 0;
        for (const item of itensKitEdicao) {
            const vv = item.valorVenda || 0;
            const q = item.quantidade || 1;
            const custoAgregadoUnit = item.custoAgregadoUnit ?? (item.custoUnit ?? 0) + (vv * aliquotaMaterialKit / 100);
            custoAgTotal += custoAgregadoUnit * q;
            vendaTotal += vv * q;
        }
        return {
            custoAgTotal,
            vendaTotal,
            lucro: vendaTotal - custoAgTotal
        };
    }, [itensKitEdicao, empresas, formState.empresaCNPJ]);

    const labelTipoKitItem = (itemKit: any) => {
        const tipoItem = itemKit.tipo || 'MATERIAL';
        if (tipoItem === 'MATERIAL') return 'Estoque';
        if (tipoItem === 'COTACAO') return 'Banco Frio';
        if (tipoItem === 'SERVICO') return 'Serviço';
        if (tipoItem === 'KIT') return 'Kit';
        return String(tipoItem);
    };

    const itemKitPassaBuscaEdicao = (itemKit: any) => {
        const termo = buscaKitEdicao.trim();
        if (!termo) return true;
        const tipoStr = labelTipoKitItem(itemKit);
        return (
            matchCrossSearch(termo, itemKit.nome || '') ||
            matchCrossSearch(termo, itemKit.codigo || '') ||
            matchCrossSearch(termo, tipoStr)
        );
    };

    const limparEstadoModalKitEdicao = () => {
        setShowModalEditarKit(false);
        setKitEmEdicao(null);
        setItensKitEdicao([]);
        setPendentesBaixarDoKit([]);
        setBuscaKitEdicao('');
        setSnapshotItemsAntesKitEdicao(null);
        setSnapshotItensDoKitInicial(null);
        setShowConfirmarCancelarEdicaoKit(false);
    };

    const solicitarFecharModalKitEdicao = () => {
        if (!kitEdicaoDirty) {
            limparEstadoModalKitEdicao();
            return;
        }
        setShowConfirmarCancelarEdicaoKit(true);
    };

    const confirmarCancelarEdicaoKit = () => {
        if (snapshotItemsAntesKitEdicao) {
            try {
                setItems(JSON.parse(snapshotItemsAntesKitEdicao));
            } catch {
                /* ignore */
            }
        }
        limparEstadoModalKitEdicao();
    };

    const handleQuantidadeKitItemChange = (indexItem: number, raw: string) => {
        const parsed = parseFloat(String(raw).replace(',', '.'));
        const q = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        setItensKitEdicao(prev => {
            const next = [...prev];
            const cur = next[indexItem];
            if (!cur) return prev;
            const vv = cur.valorVenda || 0;
            next[indexItem] = {
                ...cur,
                quantidade: q,
                subtotal: vv * q
            };
            return next;
        });
    };

    // Funções para editar kit unificado
    const handleBaixarItemParaLista = (indexItem: number) => {
        if (!kitEmEdicao) return;

        const itemParaBaixar = itensKitEdicao[indexItem];
        if (!itemParaBaixar) return;

        // Criar um novo item de orçamento baseado no item do kit
        const novoItemOrcamento: OrcamentoItem = {
            tipo: itemParaBaixar.tipo || 'MATERIAL',
            nome: itemParaBaixar.nome,
            unidadeMedida: normalizarUnidadeMedidaOrcamento(itemParaBaixar.unidadeMedida) || 'un',
            quantidade: itemParaBaixar.quantidade || 1,
            custoUnit: itemParaBaixar.custoUnit || 0,
            precoUnit: itemParaBaixar.valorVenda || 0,
            subtotal: (itemParaBaixar.valorVenda || 0) * (itemParaBaixar.quantidade || 1),
            materialId: itemParaBaixar.materialId,
            cotacaoId: itemParaBaixar.cotacaoId,
            kitId: itemParaBaixar.kitId,
            descricao: itemParaBaixar.nome,
            ...(itemParaBaixar.tipo === 'KIT' && itemParaBaixar.itensDoKit && {
                itensDoKit: itemParaBaixar.itensDoKit
            })
        };

        // Remover item do kit em edição (somente estado local até salvar)
        const novosItensKit = itensKitEdicao.filter((_, i) => i !== indexItem);
        setItensKitEdicao(novosItensKit);
        setPendentesBaixarDoKit(prev => [...prev, novoItemOrcamento]);

        setKitEmEdicao(prev => prev ? {
            ...prev,
            item: { ...prev.item, itensDoKit: novosItensKit }
        } : null);

        toast.success('Item preparado para baixar', {
            description: `${itemParaBaixar.nome} será inserido na lista ao salvar o kit`,
            icon: '⬇️'
        });
    };

    const handleRemoverItemDoKit = (indexItem: number) => {
        if (!kitEmEdicao) return;
        
        const itemParaRemover = itensKitEdicao[indexItem];
        if (!itemParaRemover) return;

        const novosItensKit = itensKitEdicao.filter((_, i) => i !== indexItem);
        setItensKitEdicao(novosItensKit);

        setKitEmEdicao(prev => prev ? {
            ...prev,
            item: {
                ...prev.item,
                itensDoKit: novosItensKit
            }
        } : null);
        
        toast.success('Item removido do kit', {
            description: `${itemParaRemover.nome} será removido ao salvar`,
            icon: '🗑️'
        });
    };

    const handleSalvarEdicaoKit = () => {
        if (!kitEmEdicao) return;

        if (itensKitEdicao.length === 0 && pendentesBaixarDoKit.length === 0) {
            setItems(prev => prev.filter((_, i) => i !== kitEmEdicao.index));
            limparEstadoModalKitEdicao();
            toast.info('Kit removido', {
                description: 'O kit foi removido pois não há mais itens na composição'
            });
            return;
        }

        if (itensKitEdicao.length === 0 && pendentesBaixarDoKit.length > 0) {
            const novosItems = [...items];
            novosItems.splice(kitEmEdicao.index, 1);
            novosItems.splice(kitEmEdicao.index, 0, ...pendentesBaixarDoKit);
            setItems(novosItems);
            limparEstadoModalKitEdicao();
            toast.success('Kit atualizado', {
                description: 'Itens foram movidos para a lista do orçamento',
                icon: '✅'
            });
            return;
        }

        const itensDoKitComSubtotal = itensKitEdicao.map((item: any) => ({
            ...item,
            subtotal: (item.valorVenda || 0) * (item.quantidade || 1)
        }));

        const custoTotal = itensDoKitComSubtotal.reduce((sum, item) => sum + ((item.custoUnit || 0) * (item.quantidade || 1)), 0);
        const subtotalTotal = itensDoKitComSubtotal.reduce((sum, item) => sum + ((item.valorVenda || 0) * (item.quantidade || 1)), 0);

        let novosItems = [...items];
        const pos = kitEmEdicao.index;

        if (pendentesBaixarDoKit.length > 0) {
            novosItems.splice(pos, 0, ...pendentesBaixarDoKit);
        }
        const novoKitIdx = pos + pendentesBaixarDoKit.length;

        novosItems[novoKitIdx] = {
            ...novosItems[novoKitIdx],
            custoUnit: custoTotal,
            precoUnit: subtotalTotal,
            subtotal: subtotalTotal,
            itensDoKit: itensDoKitComSubtotal
        } as OrcamentoItem & { itensDoKit?: any[] };

        setItems(novosItems);
        limparEstadoModalKitEdicao();

        toast.success('Kit atualizado com sucesso!', {
            description: `${itensDoKitComSubtotal.length} ${itensDoKitComSubtotal.length === 1 ? 'item mantido' : 'itens mantidos'} na composição`,
            icon: '✅'
        });
    };

    const handleDesunificarKit = () => {
        if (!kitEmEdicao) return;

        const novosItems = [...items];
        novosItems.splice(kitEmEdicao.index, 1);

        const itensSolto: OrcamentoItem[] = itensKitEdicao.map((itemKit) => ({
            tipo: itemKit.tipo || 'MATERIAL',
            nome: itemKit.nome,
            unidadeMedida: normalizarUnidadeMedidaOrcamento(itemKit.unidadeMedida) || 'un',
            quantidade: itemKit.quantidade || 1,
            custoUnit: itemKit.custoUnit || 0,
            precoUnit: itemKit.valorVenda || 0,
            subtotal: (itemKit.valorVenda || 0) * (itemKit.quantidade || 1),
            materialId: itemKit.materialId,
            cotacaoId: itemKit.cotacaoId,
            kitId: itemKit.kitId,
            descricao: itemKit.nome,
            ...(itemKit.tipo === 'KIT' && itemKit.itensDoKit && {
                itensDoKit: itemKit.itensDoKit
            })
        }));

        novosItems.splice(kitEmEdicao.index, 0, ...pendentesBaixarDoKit, ...itensSolto);
        
        setItems(novosItems);
        limparEstadoModalKitEdicao();

        toast.success('Kit desunificado!', {
            description: `${pendentesBaixarDoKit.length + itensKitEdicao.length} ${pendentesBaixarDoKit.length + itensKitEdicao.length === 1 ? 'item foi adicionado' : 'itens foram adicionados'} à lista do orçamento`,
            icon: '📦'
        });
    };

    // Atualizar quantidade do item (aceita decimais: 0,5; 0,12; 1,0)
    const handleUpdateItemQuantity = (index: number, quantidade: number) => {
        const qtd = Math.max(0.01, quantidade);
        setItems(prev => prev.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    quantidade: qtd,
                    subtotal: item.precoUnit * qtd
                };
            }
            return item;
        }));
    };

    // Função para converter valor digitado para número (aceita vírgula e ponto)
    const parsearValorBRL = (valor: string): number => {
        if (!valor || valor.trim() === '') return 0;
        // Remove pontos (separadores de milhar) e substitui vírgula por ponto
        const valorLimpo = valor.replace(/\./g, '').replace(',', '.');
        const numero = parseFloat(valorLimpo);
        return isNaN(numero) ? 0 : numero;
    };

    // Função para formatar número para exibição BRL
    const formatarValorBRL = (valor: number): string => {
        return valor.toFixed(2).replace('.', ',');
    };

    // Atualizar preço unitário do item (valor de venda editável)
    const handleUpdateItemPrice = (index: number, novoPrecoUnit: number) => {
        if (novoPrecoUnit < 0) {
            toast.error('Valor inválido', {
                description: 'O valor unitário não pode ser negativo'
            });
            return;
        }

        setItems(prev => prev.map((item, i) => {
            if (i === index) {
                // Limpar o valor em edição após salvar
                const novosValoresEditando = { ...valorEditando };
                delete novosValoresEditando[index];
                setValorEditando(novosValoresEditando);
                
                return {
                    ...item,
                    precoUnit: novoPrecoUnit,
                    subtotal: novoPrecoUnit * item.quantidade,
                    precoEditadoManual: true // Marcar como editado manualmente
                };
            }
            return item;
        }));
    };

    // Atualizar preços de materiais, cotações e serviços com valores mais recentes do backend
    const handleAtualizarPrecos = async () => {
        if (items.length === 0) {
            toast.error('Nenhum item no orçamento', {
                description: 'Adicione itens ao orçamento antes de atualizar preços'
            });
            return;
        }

        try {
            setAtualizandoPrecos(true);

            // Buscar dados atualizados do backend
            const [materiaisRes, cotacoesRes, servicosRes] = await Promise.all([
                axiosApiService.get<Material[]>(ENDPOINTS.MATERIAIS),
                axiosApiService.get('/api/cotacoes'),
                servicosService.listar({ ativo: true })
            ]);

            // Criar mapas para busca rápida
            const materiaisMap = new Map<string, Material>();
            if (materiaisRes.success && materiaisRes.data && Array.isArray(materiaisRes.data)) {
                materiaisRes.data.forEach((m: Material) => {
                    if (m.id) materiaisMap.set(m.id, m);
                });
            }

            const cotacoesMap = new Map<string, any>();
            if (cotacoesRes.success && cotacoesRes.data && Array.isArray(cotacoesRes.data)) {
                cotacoesRes.data.forEach((c: any) => {
                    if (c.id) cotacoesMap.set(c.id, c);
                });
            }

            const servicosMap = new Map<string, Servico>();
            if (servicosRes.success && servicosRes.data && Array.isArray(servicosRes.data)) {
                servicosRes.data.forEach((s: Servico) => {
                    if (s.id) servicosMap.set(s.id, s);
                });
            }

            // Atualizar listas de dados disponíveis no componente
            if (materiaisRes.success && materiaisRes.data) {
                setMateriais(materiaisRes.data as Material[]);
            }
            if (cotacoesRes.success && cotacoesRes.data) {
                setCotacoes(cotacoesRes.data as any[]);
            }
            if (servicosRes.success && servicosRes.data) {
                setServicos(servicosRes.data as Servico[]);
            }

            // Atualizar itens do orçamento
            let itensAtualizados = 0;
            const novosItems = items.map(item => {
                // Se o preço foi editado manualmente, não atualizar
                if (item.precoEditadoManual) {
                    return item;
                }

                let novoPrecoBase: number | undefined = undefined;
                let novoCustoUnit: number | undefined = undefined;

                // Atualizar preço baseado no tipo do item
                if (item.tipo === 'MATERIAL' && item.materialId) {
                    const materialAtualizado = materiaisMap.get(item.materialId);
                    if (materialAtualizado) {
                        novoPrecoBase = materialAtualizado.valorVenda || materialAtualizado.preco || 0;
                        novoCustoUnit = materialAtualizado.preco || 0;
                        itensAtualizados++;
                    }
                } else if (item.tipo === 'COTACAO' && item.cotacaoId) {
                    const cotacaoAtualizada = cotacoesMap.get(item.cotacaoId);
                    if (cotacaoAtualizada) {
                        novoPrecoBase = cotacaoAtualizada.valorVenda || cotacaoAtualizada.valorUnitario || 0;
                        novoCustoUnit = cotacaoAtualizada.valorUnitario || 0;
                        itensAtualizados++;
                    }
                } else if (item.tipo === 'SERVICO' && item.servicoNome) {
                    const servicoAtualizado = Array.from(servicosMap.values()).find(
                        s => s.nome === item.servicoNome
                    );
                    if (servicoAtualizado) {
                        novoPrecoBase = servicoAtualizado.preco || 0;
                        novoCustoUnit = servicoAtualizado.preco || 0;
                        itensAtualizados++;
                    }
                }

                // Se encontrou preço atualizado, aplicar
                if (novoPrecoBase !== undefined) {
                    return {
                        ...item,
                        precoBase: novoPrecoBase,
                        precoUnit: novoPrecoBase,
                        custoUnit: novoCustoUnit !== undefined ? novoCustoUnit : item.custoUnit,
                        subtotal: novoPrecoBase * item.quantidade
                    };
                }

                return item;
            });

            setItems(novosItems);

            // Atualizar também os itens dentro dos kits (valor de venda, custo, subtotal e lucro nos modais)
            const empresaPreco = empresas.find(e => e.cnpj === formState.empresaCNPJ);
            const aliquotaKit = empresaPreco?.aliquotaMaterial ?? 8;
            const novosItemsComKits = novosItems.map(item => {
                if (item.tipo === 'KIT' && (item as any).itensDoKit && Array.isArray((item as any).itensDoKit)) {
                    const itensDoKitAtualizados = (item as any).itensDoKit.map((kitItem: any) => {
                        let novoValorVenda = kitItem.valorVenda;
                        let novoCustoUnit = kitItem.custoUnit;

                        if (kitItem.materialId) {
                            const materialAtualizado = materiaisMap.get(kitItem.materialId);
                            if (materialAtualizado) {
                                novoValorVenda = materialAtualizado.valorVenda || materialAtualizado.preco || 0;
                                novoCustoUnit = materialAtualizado.preco || 0;
                            }
                        } else if (kitItem.cotacaoId) {
                            const cotacaoAtualizada = cotacoesMap.get(kitItem.cotacaoId);
                            if (cotacaoAtualizada) {
                                novoValorVenda = cotacaoAtualizada.valorVenda || cotacaoAtualizada.valorUnitario || 0;
                                novoCustoUnit = cotacaoAtualizada.valorUnitario || 0;
                            }
                        } else if (kitItem.servicoId) {
                            const servicoAtualizado = servicosMap.get(kitItem.servicoId);
                            if (servicoAtualizado) {
                                novoValorVenda = servicoAtualizado.preco || 0;
                                novoCustoUnit = servicoAtualizado.preco || 0;
                            }
                        } else if (kitItem.tipo === 'SERVICO' && kitItem.nome) {
                            const servicoPorNome = Array.from(servicosMap.values()).find(s => s.nome === kitItem.nome);
                            if (servicoPorNome) {
                                novoValorVenda = servicoPorNome.preco || 0;
                                novoCustoUnit = servicoPorNome.preco || 0;
                            }
                        }

                        const custoAgregadoUnit = novoCustoUnit + (novoValorVenda * aliquotaKit / 100);
                        const subtotalItem = novoValorVenda * (kitItem.quantidade || 1);
                        return {
                            ...kitItem,
                            valorVenda: novoValorVenda,
                            custoUnit: novoCustoUnit,
                            custoAgregadoUnit: custoAgregadoUnit,
                            subtotal: subtotalItem
                        };
                    });

                    // Recalcular total do kit
                    const novoPrecoUnit = itensDoKitAtualizados.reduce((sum: number, it: any) => {
                        return sum + ((it.valorVenda || 0) * (it.quantidade || 1));
                    }, 0);
                    const novoCustoTotalKit = itensDoKitAtualizados.reduce((sum: number, it: any) => {
                        return sum + ((it.custoUnit ?? 0) * (it.quantidade || 1));
                    }, 0);

                    return {
                        ...item,
                        itensDoKit: itensDoKitAtualizados,
                        precoBase: novoPrecoUnit,
                        precoUnit: novoPrecoUnit,
                        custoUnit: novoCustoTotalKit,
                        subtotal: novoPrecoUnit * item.quantidade
                    };
                }
                return item;
            });

            setItems(novosItemsComKits);

            toast.success('Preços atualizados!', {
                description: `${itensAtualizados} item(ns) tiveram seus preços atualizados com os valores mais recentes do estoque e banco frio`
            });
        } catch (error: any) {
            console.error('Erro ao atualizar preços:', error);
            toast.error('Erro ao atualizar preços', {
                description: error.message || 'Não foi possível atualizar os preços. Tente novamente.'
            });
        } finally {
            setAtualizandoPrecos(false);
        }
    };

    // Sincronizar com servidor: busca dados mais recentes do catálogo e do orçamento se aplicável,
    // atualiza preços dos itens (sem sobrescrever itens com precoEditadoManual) e marca itens removidos no servidor.
    const handleSincronizar = async () => {
        if (items.length === 0) {
            toast.error('Nenhum item no orçamento', {
                description: 'Adicione itens ao orçamento antes de sincronizar'
            });
            return;
        }

        try {
            setSincronizando(true);

            // Buscar dados atualizados do backend
            const [materiaisRes, cotacoesRes, servicosRes] = await Promise.all([
                axiosApiService.get<Material[]>(ENDPOINTS.MATERIAIS),
                axiosApiService.get('/api/cotacoes'),
                servicosService.listar({ ativo: true })
            ]);

            // Criar mapas para busca rápida
            const materiaisMap = new Map<string, Material>();
            if (materiaisRes.success && materiaisRes.data && Array.isArray(materiaisRes.data)) {
                materiaisRes.data.forEach((m: Material) => {
                    if (m.id) materiaisMap.set(m.id, m);
                });
                setMateriais(materiaisRes.data as Material[]);
            }

            const cotacoesMap = new Map<string, any>();
            if (cotacoesRes.success && cotacoesRes.data && Array.isArray(cotacoesRes.data)) {
                cotacoesRes.data.forEach((c: any) => {
                    if (c.id) cotacoesMap.set(c.id, c);
                });
                setCotacoes(cotacoesRes.data as any[]);
            }

            const servicosMap = new Map<string, Servico>();
            if (servicosRes.success && servicosRes.data && Array.isArray(servicosRes.data)) {
                servicosRes.data.forEach((s: Servico) => {
                    if (s.id) servicosMap.set(s.id, s);
                });
                setServicos(servicosRes.data as Servico[]);
            }

            // Atualizar itens do orçamento: atualizar preços quando possível, marcar removidos quando não encontrados
            let itensAtualizados = 0;
            const novosItems = items.map(item => {
                // Se o preço foi editado manualmente, não atualizar
                if (item.precoEditadoManual) {
                    return item;
                }

                let novoPrecoBase: number | undefined = undefined;
                let novoCustoUnit: number | undefined = undefined;

                // Atualizar preço baseado no tipo do item
                if (item.tipo === 'MATERIAL' && item.materialId) {
                    const materialAtualizado = materiaisMap.get(item.materialId);
                    if (materialAtualizado) {
                        novoPrecoBase = materialAtualizado.valorVenda || materialAtualizado.preco || 0;
                        novoCustoUnit = materialAtualizado.preco || 0;
                        itensAtualizados++;
                    }
                } else if (item.tipo === 'COTACAO' && item.cotacaoId) {
                    const cotacaoAtualizada = cotacoesMap.get(item.cotacaoId);
                    if (cotacaoAtualizada) {
                        novoPrecoBase = cotacaoAtualizada.valorVenda || cotacaoAtualizada.valorUnitario || 0;
                        novoCustoUnit = cotacaoAtualizada.valorUnitario || 0;
                        itensAtualizados++;
                    }
                } else if (item.tipo === 'SERVICO' && item.servicoNome) {
                    const servicoAtualizado = Array.from(servicosMap.values()).find(
                        s => s.nome === item.servicoNome
                    );
                    if (servicoAtualizado) {
                        novoPrecoBase = servicoAtualizado.preco || 0;
                        novoCustoUnit = servicoAtualizado.preco || 0;
                        itensAtualizados++;
                    }
                }

                // Se encontrou preço atualizado, aplicar; senão marcar como possivelmente removido no servidor
                if (novoPrecoBase !== undefined) {
                    return {
                        ...item,
                        precoBase: novoPrecoBase,
                        precoUnit: novoPrecoBase,
                        custoUnit: novoCustoUnit !== undefined ? novoCustoUnit : item.custoUnit,
                        subtotal: novoPrecoBase * item.quantidade,
                        servidorRemovido: false
                    };
                }

                return {
                    ...item,
                    servidorRemovido: true // indica que não foi encontrado no catálogo atual
                };
            });

            setItems(novosItems);

            // Atualizar também os itens dentro dos kits
            const novosItemsComKits = novosItems.map(item => {
                if (item.tipo === 'KIT' && (item as any).itensDoKit && Array.isArray((item as any).itensDoKit)) {
                    const itensDoKitAtualizados = (item as any).itensDoKit.map((kitItem: any) => {
                        let novoValorVenda = kitItem.valorVenda;

                        if (kitItem.materialId) {
                            const materialAtualizado = materiaisMap.get(kitItem.materialId);
                            if (materialAtualizado) {
                                novoValorVenda = materialAtualizado.valorVenda || materialAtualizado.preco || 0;
                            } else {
                                kitItem.servidorRemovido = true;
                            }
                        } else if (kitItem.cotacaoId) {
                            const cotacaoAtualizada = cotacoesMap.get(kitItem.cotacaoId);
                            if (cotacaoAtualizada) {
                                novoValorVenda = cotacaoAtualizada.valorVenda || cotacaoAtualizada.valorUnitario || 0;
                            } else {
                                kitItem.servidorRemovido = true;
                            }
                        }

                        return {
                            ...kitItem,
                            valorVenda: novoValorVenda
                        };
                    });

                    // Recalcular total do kit
                    const novoPrecoUnit = itensDoKitAtualizados.reduce((sum: number, it: any) => {
                        return sum + ((it.valorVenda || 0) * (it.quantidade || 1));
                    }, 0);

                    return {
                        ...item,
                        itensDoKit: itensDoKitAtualizados,
                        precoBase: novoPrecoUnit,
                        precoUnit: novoPrecoUnit,
                        subtotal: novoPrecoUnit * item.quantidade
                    };
                }
                return item;
            });

            setItems(novosItemsComKits);

            toast.success('Sincronização concluída', {
                description: `${itensAtualizados} item(ns) atualizados; itens não encontrados foram marcados como possivelmente removidos no servidor.`
            });
        } catch (error: any) {
            console.error('Erro ao sincronizar:', error);
            toast.error('Erro ao sincronizar', {
                description: error.message || 'Não foi possível sincronizar. Tente novamente.'
            });
        } finally {
            setSincronizando(false);
        }
    };

    // Selecionar endereço do cliente
    const selecionarEnderecoCliente = () => {
        if (!formState.clienteId) {
            toast.error('Selecione um cliente primeiro', {
                description: 'É necessário selecionar um cliente para usar o endereço cadastrado'
            });
            return;
        }

        const clienteSelecionado = clientes.find(c => c.id === formState.clienteId);
        
        if (!clienteSelecionado) {
            toast.error('Cliente não encontrado');
            return;
        }

        if (!clienteSelecionado.endereco) {
            toast.warning('Cliente sem endereço cadastrado', {
                description: 'Este cliente não possui endereço cadastrado. Você pode preencher manualmente.'
            });
            return;
        }

        // Preencher campos com dados do cliente (logradouro, número, bairro)
        setFormState(prev => ({
            ...prev,
            enderecoObra: clienteSelecionado.endereco || '',
            numeroObra: (clienteSelecionado as any).numero || '',
            cidade: clienteSelecionado.cidade || '',
            bairro: (clienteSelecionado as any).bairro || '',
            cep: clienteSelecionado.cep || ''
        }));

        setUsandoEnderecoCliente(true);
        
        toast.success('Endereço do cliente aplicado', {
            description: 'Os campos foram preenchidos com o endereço cadastrado do cliente'
        });
    };

    // Limpar e permitir endereço diferente
    // Buscar CEP via Brasil API e preencher campos (debounced + abortable)
    const buscarCep = async (cepRaw: string) => {
        const cepDigits = (cepRaw || '').replace(/\D/g, '');
        if (cepDigits.length !== 8) return;

        // abort previous request if any
        try {
            if (cepAbortRef.current) {
                cepAbortRef.current.abort();
            }
        } catch (_) { /* ignore */ }

        const controller = new AbortController();
        cepAbortRef.current = controller;
        setCepLoading(true);

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepDigits}`, { signal: controller.signal });
            if (!res.ok) {
                let errMsg = 'Não foi possível localizar o CEP';
                try {
                    const errBody = await res.json();
                    if (errBody && errBody.message) errMsg = errBody.message;
                } catch (_) { /* ignore */ }
                toast.error('CEP não encontrado', {
                    description: errMsg
                });
                return;
            }

            const data = await res.json();

            // Preencher campos com os dados retornados
            setFormState(prev => ({
                ...prev,
                enderecoObra: data.street || prev.enderecoObra,
                bairro: data.neighborhood || prev.bairro,
                cidade: data.city || prev.cidade,
                cep: data.cep || prev.cep
            }));

            toast.success('Endereço via CEP aplicado', {
                description: 'Os campos foram preenchidos com os dados retornados pelo serviço de CEP'
            });
        } catch (error: any) {
            if (error && error.name === 'AbortError') {
                // solicitado abort, silencioso
                return;
            }
            console.error('Erro ao buscar CEP:', error);
            toast.error('Erro ao buscar CEP', {
                description: 'Não foi possível consultar o serviço de CEP'
            });
        } finally {
            setCepLoading(false);
            cepAbortRef.current = null;
        }
    };

    const usarEnderecoDiferente = () => {
        setFormState(prev => ({
            ...prev,
            enderecoObra: '',
            numeroObra: '',
            cidade: '',
            bairro: '',
            cep: ''
        }));
        
        setUsandoEnderecoCliente(false);
        
        toast.info('Endereço limpo', {
            description: 'Você pode preencher um endereço diferente para a obra'
        });
    };

    // Criar cliente rápido
    const handleCreateClienteRapido = async (nome: string, tipo: 'PF' | 'PJ') => {
        try {
            setCriandoClienteRapido(true);
            
            const response = await clientesService.criarClienteRapido(nome, tipo);
            
            if (response.success && response.data) {
                // Atualizar lista de clientes
                const clientesRes = await clientesService.listar();
                if (clientesRes.success && clientesRes.data) {
                    setClientes(clientesRes.data);
                }

                // Selecionar novo cliente automaticamente
                setFormState(prev => ({ ...prev, clienteId: response.data!.id }));
                
                // Fechar modal
                setShowClienteRapidoModal(false);
                
                toast.success('Cliente criado com sucesso', {
                    description: `${nome} foi adicionado e selecionado`
                });
            } else {
                toast.error('Erro ao criar cliente', {
                    description: response.error || 'Não foi possível criar o cliente'
                });
            }
        } catch (error) {
            console.error('Erro ao criar cliente rápido:', error);
            toast.error('Erro ao criar cliente', {
                description: 'Ocorreu um erro ao tentar criar o cliente'
            });
        } finally {
            setCriandoClienteRapido(false);
        }
    };

    // Prevenir submit acidental ao pressionar Enter
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        // Se Enter for pressionado e não for em um textarea ou botão de submit
        if (e.key === 'Enter' && e.target instanceof HTMLElement) {
            const isTextarea = e.target.tagName === 'TEXTAREA';
            const isSubmitButton = (e.target as HTMLElement & { type?: string }).type === 'submit' || (e.target as HTMLElement).closest('button[type="submit"]');
            
            if (!isTextarea && !isSubmitButton) {
                e.preventDefault();
            }
        }
    };

    // limpar timeouts / aborts ao desmontar
    useEffect(() => {
        return () => {
            if (cepTimeoutRef.current) {
                clearTimeout(cepTimeoutRef.current);
            }
            try {
                if (cepAbortRef.current) cepAbortRef.current.abort();
            } catch (_) { /* ignore */ }
        };
    }, []);

    // Salvar orçamento
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validações
        if (items.length === 0) {
            toast.error('Nenhum item adicionado', {
                description: 'Adicione pelo menos um item ao orçamento'
            });
            return;
        }

        if (!formState.clienteId) {
            toast.error('Cliente obrigatório', {
                description: 'Selecione um cliente para continuar'
            });
            return;
        }

        try {
            setSalvando(true);

            const orcamentoData: any = {
                clienteId: formState.clienteId,
                ...(contatoLeadIdParaVincularRef.current
                    ? { contatoLeadId: contatoLeadIdParaVincularRef.current }
                    : {}),
                titulo: formState.titulo,
                descricao: formState.descricao,
                descricaoProjeto: formState.descricaoProjeto,
                validade: formState.validade,
                bdi: formState.bdi,
                observacoes: formState.observacoes,
                empresaCNPJ: formState.empresaCNPJ,
                enderecoObra: formState.enderecoObra,
                numeroObra: formState.numeroObra,
                cidade: formState.cidade,
                bairro: formState.bairro,
                cep: formState.cep,
                responsavelObra: formState.responsavelObra,
                previsaoInicio: formState.previsaoInicio || null,
                previsaoTermino: formState.previsaoTermino || null,
                descontoValor: formState.descontoValor,
                impostoPercentual: formState.impostoPercentual,
                condicaoPagamento: formState.condicaoPagamento,
                items: items.map(item => ({
                    tipo: item.tipo,
                    materialId: item.materialId,
                    kitId: item.kitId,
                    cotacaoId: item.cotacaoId,
                    servicoNome: item.servicoNome,
                    // ✅ Para kits customizados (sem kitId), priorizar item.nome que contém o nome do usuário
                    // Para outros itens, usar descricao || nome
                    descricao: (item.tipo === 'KIT' && !item.kitId && item.nome) ? item.nome : (item.descricao || item.nome),
                    ncm: item.ncm, // ✅ NCM para faturamento NF-e/NFS-e
                    quantidade: item.quantidade,
                    custoUnit: item.custoUnit,
                    precoUnitario: item.precoUnit,
                    subtotal: item.subtotal,
                    unidadeVenda: item.unidadeVenda,
                    tipoMaterial: item.tipoMaterial,
                    itensDoKit: (item as any).itensDoKit || null,
                    vendaDiretaFornecedor: Boolean((item as any).vendaDiretaFornecedor)
                }))
            };

            const promise = orcamentosService.criar(orcamentoData);

            toast.promise(promise, {
                loading: 'Criando orçamento...',
                success: (response) => {
                    if (response.success) {
                        contatoLeadIdParaVincularRef.current = null;
                        // Verificar se há kits no orçamento
                        const temKit = items.some(item => item.tipo === 'KIT');
                        
                        if (temKit && formState.empresaCNPJ) {
                            // Buscar nome da empresa pelo CNPJ
                            const empresaSelecionada = empresas.find(emp => emp.cnpj === formState.empresaCNPJ);
                            const nomeEmpresa = empresaSelecionada 
                                ? (empresaSelecionada.nomeFantasia || empresaSelecionada.razaoSocial)
                                : formState.empresaCNPJ;
                            
                            // Notificação especial para orçamento com kit
                            setTimeout(() => {
                                toast.warning('Atenção: Orçamento criado com Kit', {
                                    description: `Orçamento criado para o CNPJ: ${nomeEmpresa}. Este orçamento contém item(s) do tipo Kit. O NCM deverá ser informado no momento da emissão da nota fiscal.`,
                                    duration: 10000
                                });
                            }, 500);
                        }

                        // Limpar rascunho após salvar com sucesso
                        limparRascunho();
                        if (onOrcamentoCriado) onOrcamentoCriado();
                        setTimeout(() => setAbaAtiva('listagem'), 500);
                        return 'Orçamento criado com sucesso!';
                    }
                    throw new Error(response.error || 'Erro ao criar orçamento');
                },
                error: (err: any) => {
                    setError(err.message || err.response?.data?.message || 'Erro ao criar orçamento');
                    return 'Erro ao criar orçamento';
                }
            });
        } catch (err: any) {
            console.error('Erro ao criar orçamento:', err);
            setError(err.response?.data?.message || 'Erro ao criar orçamento');
        } finally {
            setSalvando(false);
        }
    };

    // Cancelar e voltar
    const handleCancelar = () => {
        if (items.length > 0 || formState.titulo) {
            toast('Descartar alterações?', {
                description: 'Todos os dados não salvos serão perdidos.',
                duration: 8000,
                action: {
                    label: 'Descartar',
                    onClick: () => setAbaAtiva('listagem')
                },
                cancel: {
                    label: 'Continuar editando',
                    onClick: () => {}
                }
            });
        } else {
            setAbaAtiva('listagem');
        }
    };

    const [proximoNumero, setProximoNumero] = useState<number | null>(null);
    const [carregandoNumero, setCarregandoNumero] = useState<boolean>(false);
    const [erroNumero, setErroNumero] = useState<string | null>(null);

    // Carregar próximo número sequencial do orçamento (informativo)
    useEffect(() => {
        const carregarProximoNumero = async () => {
            try {
                setCarregandoNumero(true);
                setErroNumero(null);
                const response = await axiosApiService.get<{ proximoNumero: number }>('/api/orcamentos/proximo-numero');
                if (response.success && response.data?.proximoNumero) {
                    setProximoNumero(response.data.proximoNumero);
                }
            } catch (error) {
                console.error('Erro ao obter próximo número de orçamento:', error);
                setErroNumero('Não foi possível carregar o próximo número');
            } finally {
                setCarregandoNumero(false);
            }
        };

        carregarProximoNumero();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (

        <>
            {/* Dialog para rascunho encontrado */}
            <AlertDialog open={showRascunhoDialog} onOpenChange={setShowRascunhoDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
                        <AlertDialogDescription>
                            Foi encontrado um rascunho de orçamento anteriormente salvo.
                            {rascunhoEncontrado?.dataSalvamento && (
                                <span className="block mt-2 text-xs text-gray-500">
                                    Salvo em: {new Date(rascunhoEncontrado.dataSalvamento).toLocaleString('pt-BR')}
                                </span>
                            )}
                            Deseja continuar editando o rascunho ou começar um novo orçamento?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={descartarRascunho}>
                            Descartar e começar novo
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={continuarRascunho}>
                            Continuar rascunho
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center gap-4 mb-4 sm:mb-6">
                    <button
                        onClick={handleCancelar}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Voltar
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-2">
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
                                Novo Orçamento
                            </h1>
                            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                                Nº do orçamento:&nbsp;
                                <span className="font-semibold">
                                    {carregandoNumero && 'Carregando...'}
                                    {!carregandoNumero && proximoNumero && `#${proximoNumero}`}
                                    {!carregandoNumero && !proximoNumero && !erroNumero && 'Em definição'}
                                    {!carregandoNumero && !!erroNumero && 'Indisponível'}
                                </span>
                            </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-2">
                            Crie uma nova proposta comercial
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                        <p className="text-red-800 dark:text-red-300">{error}</p>
                    </div>
                )}
            </header>

            <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="max-w-6xl mx-auto space-y-6">
                {/* SEÇÃO 1: Informações Básicas */}
                <div className="card-primary">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">📋</span>
                        Informações Básicas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                CNPJ da Empresa Executora
                            </label>
                            <select
                                value={formState.empresaCNPJ}
                                onChange={(e) => setFormState(prev => ({ ...prev, empresaCNPJ: e.target.value }))}
                                className="select-field"
                            >
                                <option value="">Selecione o CNPJ</option>
                                {empresas
                                    .filter(emp => emp.ativo)
                                    .map(emp => (
                                        <option key={emp.id} value={emp.cnpj}>
                                            {(emp.nomeFantasia || emp.razaoSocial) + ' - ' + emp.cnpj}
                                        </option>
                                    ))}
                            </select>
                            {formState.empresaCNPJ && (() => {
                                const emp = empresas.find(e => e.cnpj === formState.empresaCNPJ);
                                const alqMat = emp?.aliquotaMaterial ?? 8;
                                const alqServ = emp?.aliquotaServico ?? 8;
                                return (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" title="Alíquotas usadas no cálculo do custo agregado e lucro líquido dos itens">
                                        Alíquota aplicada: {alqMat}% (Materiais) / {alqServ}% (Serviços)
                                    </p>
                                );
                            })()}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Cliente *
                            </label>
                            <ClienteCombobox
                                clientes={clientes}
                                value={formState.clienteId}
                                onChange={(clienteId) => {
                                    setFormState(prev => ({ ...prev, clienteId }));
                                    // Limpar estado de endereço quando mudar cliente
                                    if (usandoEnderecoCliente) {
                                        setUsandoEnderecoCliente(false);
                                    }
                                }}
                                onCreateNew={() => setShowClienteRapidoModal(true)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Título do Projeto
                            </label>
                            <input
                                type="text"
                                value={formState.titulo}
                                onChange={(e) => setFormState(prev => ({ ...prev, titulo: e.target.value }))}
                                className="input-field"
                                placeholder="Ex: Instalação Elétrica - Edifício Comercial"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Validade do Orçamento
                            </label>
                            <input
                                type="date"
                                value={formState.validade}
                                onChange={(e) => setFormState(prev => ({ ...prev, validade: e.target.value }))}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Orçamentista
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={authContext?.user?.name ?? ''}
                                className="input-field bg-gray-50 dark:bg-gray-800/50 cursor-default"
                                placeholder="Usuário logado será gravado como orçamentista"
                                title="Este orçamento será registrado em seu nome ao clicar em Criar Orçamento."
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Será gravado como responsável por este orçamento e no pedido de venda.
                            </p>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[minmax(0,2.6fr)_minmax(120px,0.7fr)] gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Logradouro (Rua/Av.)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formState.enderecoObra}
                                        onChange={(e) => {
                                            setFormState(prev => ({ ...prev, enderecoObra: e.target.value }));
                                            setUsandoEnderecoCliente(false);
                                        }}
                                        className="input-field flex-1"
                                        placeholder="Ex: Rua das Flores"
                                        disabled={usandoEnderecoCliente}
                                    />
                                    <button
                                        type="button"
                                        onClick={selecionarEnderecoCliente}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                                        title="Usar endereço cadastrado do cliente"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Selecionar do Cliente
                                    </button>
                                    {usandoEnderecoCliente && (
                                        <button
                                            type="button"
                                            onClick={usarEnderecoDiferente}
                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                                            title="Usar endereço diferente"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Endereço Diferente
                                        </button>
                                    )}
                                </div>
                                {usandoEnderecoCliente && (
                                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Usando endereço cadastrado do cliente
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Número
                                </label>
                                <input
                                    type="text"
                                    value={formState.numeroObra || ''}
                                    onChange={(e) => setFormState(prev => ({ ...prev, numeroObra: e.target.value }))}
                                    className="input-field"
                                    placeholder="Nº"
                                    disabled={usandoEnderecoCliente}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={formState.bairro}
                                onChange={(e) => setFormState(prev => ({ ...prev, bairro: e.target.value }))}
                                className="input-field"
                                placeholder="Ex: Centro"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Cidade
                            </label>
                            <CidadeAutocomplete
                                value={formState.cidade}
                                onChange={(cidade) => setFormState(prev => ({ ...prev, cidade }))}
                                placeholder="Digite para buscar cidade..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                CEP
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={formState.cep}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormState(prev => ({ ...prev, cep: val }));

                                        // debounce
                                        if (cepTimeoutRef.current) {
                                            clearTimeout(cepTimeoutRef.current);
                                        }
                                        // @ts-ignore - window.setTimeout returns number in browsers
                                        cepTimeoutRef.current = window.setTimeout(() => {
                                            buscarCep(val);
                                        }, 700);
                                    }}
                                    className="input-field pr-10"
                                    placeholder="00000-000"
                                    maxLength={9}
                                />
                                {cepLoading && (
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                        <svg className="w-5 h-5 animate-spin text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Responsável no Local
                            </label>
                            <input
                                type="text"
                                value={formState.responsavelObra}
                                onChange={(e) => setFormState(prev => ({ ...prev, responsavelObra: e.target.value }))}
                                className="input-field"
                                placeholder="Nome do responsável técnico"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Descrição Resumida
                            </label>
                            <textarea
                                value={formState.descricao}
                                onChange={(e) => setFormState(prev => ({ ...prev, descricao: e.target.value }))}
                                rows={2}
                                className="textarea-field"
                                placeholder="Resumo breve do projeto..."
                            />
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 2: Prazos e Cronograma */}
                <div className="card-primary">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">📅</span>
                        Prazos e Cronograma
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Previsão de Início
                            </label>
                            <input
                                type="date"
                                value={formState.previsaoInicio}
                                onChange={(e) => setFormState(prev => ({ ...prev, previsaoInicio: e.target.value }))}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Previsão de Término
                            </label>
                            <input
                                type="date"
                                value={formState.previsaoTermino}
                                onChange={(e) => setFormState(prev => ({ ...prev, previsaoTermino: e.target.value }))}
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 3: Itens do Orçamento */}
                <div className="card-primary">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Itens do Orçamento</h3>
                            {items.length > 0 && (
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                                    {itemListSearch.trim()
                                        ? `${itensFiltradosCount} de ${items.length} ${items.length === 1 ? 'item' : 'itens'} correspondem ao filtro`
                                        : `${items.length} ${items.length === 1 ? 'item adicionado' : 'itens adicionados'}`}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleAtualizarPrecos}
                                disabled={atualizandoPrecos || items.length === 0}
                                className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                                title="Atualizar preços de materiais, cotações e serviços com os valores mais recentes"
                            >
                                {atualizandoPrecos ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Atualizando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Atualizar Preços
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleSincronizar}
                                disabled={sincronizando || items.length === 0}
                                className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                                title="Sincronizar orçamento com servidor (preserva alterações locais)"
                            >
                                {sincronizando ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sincronizando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Sincronizar
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowItemModal(true)}
                                className="btn-info flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Adicionar Item
                            </button>
                        </div>
                    </div>

                    {/* Busca direta do catálogo na página (CÓDIGO - DESCRIÇÃO + Incluir no pedido) */}
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-dark-border">
                        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px] relative">
                                <input
                                    type="text"
                                    value={buscaCatalogoPagina}
                                    onChange={(e) => {
                                        setBuscaCatalogoPagina(e.target.value);
                                        setDropdownCatalogoAberto(true);
                                        setDropdownHighlightIndex(0);
                                        if (!e.target.value) setItemSelecionadoCatalogo(null);
                                    }}
                                    onFocus={() => {
                                        if (buscaCatalogoPagina.trim()) {
                                            setDropdownCatalogoAberto(true);
                                            setDropdownHighlightIndex(resultadosBuscaCatalogoPagina.length > 0 ? 0 : -1);
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => { setDropdownCatalogoAberto(false); setDropdownHighlightIndex(-1); }, 200)}
                                    onKeyDown={(e) => {
                                        const list = resultadosBuscaCatalogoPagina;
                                        if (!buscaCatalogoPagina.trim() || !dropdownCatalogoAberto) return;
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setDropdownCatalogoAberto(true);
                                            setDropdownHighlightIndex((prev) => (list.length ? Math.min(prev + 1, list.length - 1) : -1));
                                            return;
                                        }
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setDropdownHighlightIndex((prev) => (list.length ? Math.max(prev - 1, 0) : -1));
                                            return;
                                        }
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const idx = list.length ? Math.min(Math.max(0, dropdownHighlightIndex), list.length - 1) : -1;
                                            if (idx >= 0) {
                                                const linha = list[idx];
                                                setItemSelecionadoCatalogo(linha);
                                                setQuantidadeCatalogoPagina(1);
                                                setDropdownCatalogoAberto(false);
                                                setDropdownHighlightIndex(-1);
                                            }
                                            return;
                                        }
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setDropdownCatalogoAberto(false);
                                            setDropdownHighlightIndex(-1);
                                        }
                                    }}
                                    className="w-full pl-3 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Buscar por nome ou código (materiais, serviços, kits, quadros, cotações)..."
                                />
                                {buscaCatalogoPagina.trim() && dropdownCatalogoAberto && resultadosBuscaCatalogoPagina.length > 0 && (() => {
                                    const list = resultadosBuscaCatalogoPagina;
                                    const safeHighlight = list.length ? Math.min(Math.max(0, dropdownHighlightIndex), list.length - 1) : -1;
                                    const origemLabel = (tipo: ItemCatalogoLinha['tipo']) => {
                                        switch (tipo) {
                                            case 'MATERIAL': return 'Estoque';
                                            case 'COTACAO': return 'Banco Frio';
                                            case 'KIT': return 'Kit';
                                            case 'SERVICO': return 'Serviço';
                                            case 'QUADRO_PRONTO': return 'Quadro';
                                            default: return '';
                                        }
                                    };
                                    return (
                                    <ul className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg py-1">
                                        {list.map((linha, index) => {
                                            const jaNoOrcamento = orcamentoInsercaoModo === 'check' && itemJaNoOrcamento(items, linha.tipo, linha.id);
                                            const isHighlighted = index === safeHighlight;
                                            return (
                                                <li
                                                    key={`${linha.tipo}-${linha.id}`}
                                                    ref={isHighlighted ? dropdownHighlightRef : undefined}
                                                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer text-sm ${isHighlighted ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                                    onMouseDown={(e) => { e.preventDefault(); setItemSelecionadoCatalogo(linha); setQuantidadeCatalogoPagina(1); setDropdownCatalogoAberto(false); setDropdownHighlightIndex(-1); }}
                                                >
                                                    <span className="truncate flex-1">
                                                        {linha.codigo ? `${linha.codigo} - ` : ''}{linha.descricao}
                                                    </span>
                                                    <span className="flex-shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-600 px-2 py-0.5 rounded" title={`Origem: ${origemLabel(linha.tipo)}`}>
                                                        ({origemLabel(linha.tipo)})
                                                    </span>
                                                    {jaNoOrcamento && (
                                                        <span className="flex-shrink-0 text-green-600 dark:text-green-400" title="Já adicionado ao orçamento">
                                                            <CheckIcon className="w-5 h-5" />
                                                        </span>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    );
                                })()}
                                {buscaCatalogoPagina.trim() && dropdownCatalogoAberto && resultadosBuscaCatalogoPagina.length === 0 && (
                                    <div className="absolute z-20 left-0 right-0 mt-1 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg text-sm text-gray-500 dark:text-dark-text-secondary">
                                        Nenhum item encontrado
                                    </div>
                                )}
                            </div>
                            {itemSelecionadoCatalogo && (
                                <>
                                    <div className="w-full sm:w-auto flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm">
                                        <span className="font-medium text-gray-700 dark:text-dark-text whitespace-nowrap">Item selecionado:</span>
                                        <span className="truncate text-gray-900 dark:text-white" title={itemSelecionadoCatalogo.codigo ? `${itemSelecionadoCatalogo.codigo} - ${itemSelecionadoCatalogo.descricao}` : itemSelecionadoCatalogo.descricao}>
                                            {itemSelecionadoCatalogo.codigo ? `${itemSelecionadoCatalogo.codigo} - ` : ''}{itemSelecionadoCatalogo.descricao}
                                        </span>
                                    </div>
                                    {itemSelecionadoCatalogo.tipo === 'COTACAO' && podeVenderEmMetroOuCm((itemSelecionadoCatalogo.raw as any).unidadeMedida) && (
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-dark-text whitespace-nowrap">Unidade:</label>
                                            <select
                                                value={unidadeVendaCatalogoPagina}
                                                onChange={(e) => setUnidadeVendaCatalogoPagina(e.target.value as 'm' | 'cm')}
                                                className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
                                            >
                                                <option value="m">Metros (M)</option>
                                                <option value="cm">Centímetros (CM)</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-dark-text whitespace-nowrap">Qtd.</label>
                                        <input
                                            type="number"
                                            min={0.01}
                                            step={0.01}
                                            value={quantidadeCatalogoPagina}
                                            onChange={(e) => setQuantidadeCatalogoPagina(Math.max(0.01, parseFloat(e.target.value) || 1))}
                                            className="w-20 px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                        <span>Unit.: R$ {precoUnitarioCatalogoPagina.toFixed(2).replace('.', ',')}</span>
                                        <span>Total: R$ {totalCatalogoPagina.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleIncluirCatalogoPagina}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleIncluirCatalogoPagina(); } }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                    >
                                        Incluir no pedido
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Busca rápida nos itens já adicionados */}
                    {items.length > 0 && (
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={itemListSearch}
                                    onChange={(e) => setItemListSearch(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Buscar itens do orçamento por nome, NCM ou tipo (Material, Serviço, Kit, Banco Frio)..."
                                />
                                {itemListSearch.trim() && (
                                    <button
                                        type="button"
                                        onClick={() => setItemListSearch('')}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        title="Limpar busca"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {items.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📦</span>
                            </div>
                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum item adicionado</p>
                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Clique em "Adicionar Item" para começar</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Quando o filtro não encontrar nada, mostrar mensagem amigável */}
                            {itemListSearch.trim() && itensFiltradosCount === 0 && (
                                <div className="text-center py-6 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-dark-border">
                                    <p className="text-gray-500 dark:text-dark-text-secondary">
                                        Nenhum item encontrado para "{itemListSearch}" na lista do orçamento.
                                    </p>
                                </div>
                            )}

                            {/* Botões de seleção e criar kit */}
                            {items.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={selecionarTodosItens}
                                            className="px-3 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                        >
                                            Selecionar Todos
                                        </button>
                                        {itensSelecionados.size > 0 && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={deselecionarTodosItens}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    Desmarcar Todos
                                                </button>
                                                <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                                    {itensSelecionados.size} item(ns) selecionado(s)
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selecaoKitMaisUmItem && (
                                            <button
                                                type="button"
                                                onClick={handleInserirItemAoKit}
                                                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-2"
                                                title="Mover o item selecionado para dentro do kit unificado"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                Inserir item ao kit unificado
                                            </button>
                                        )}
                                        {itensSelecionados.size > 0 && (
                                            <>
                                                {(() => {
                                                    const selecionadosTodosVendaDireta = [...itensSelecionados].every(i => (items[i] as any).vendaDiretaFornecedor);
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => setItems(prev => prev.map((it, i) => itensSelecionados.has(i) ? { ...it, vendaDiretaFornecedor: !selecionadosTodosVendaDireta } : it))}
                                                            className={selecionadosTodosVendaDireta
                                                                ? 'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2'
                                                                : 'px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg transition-colors flex items-center gap-2'}
                                                            title={selecionadosTodosVendaDireta ? 'Remover marcação de venda direta dos itens selecionados' : 'Itens marcados não entram em contas a receber, estoque nem NF-e'}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {selecionadosTodosVendaDireta ? 'Desmarcar venda direta' : 'Marcar como venda direta'}
                                                        </button>
                                                    );
                                                })()}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCriarKitModal(true)}
                                                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Criar Kit
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            {items.map((item, index) => {
                                // Aplicar filtro de busca nos itens já adicionados
                                if (itemListSearch.trim()) {
                                    const termo = itemListSearch.toLowerCase();
                                    const corresponde =
                                        matchCrossSearch(itemListSearch, item.nome || '') ||
                                        (item.ncm || '').toLowerCase().includes(termo) ||
                                        (item.tipo || '').toLowerCase().includes(termo);
                                    if (!corresponde) {
                                        return null;
                                    }
                                }

                                // Buscar foto do material se for do tipo MATERIAL
                                const materialComFoto = item.tipo === 'MATERIAL' && item.materialId 
                                    ? materiais.find(m => m.id === item.materialId)
                                    : null;
                                const fotoUrl = materialComFoto?.imagemUrl;

                                return (
                                    <div
                                        key={index}
                                        onDragOver={(e) => {
                                            if (dragFromIndex === null) return;
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            if (dragOverIndex !== index) setDragOverIndex(index);
                                        }}
                                        onDragLeave={() => {
                                            setDragOverIndex((prev) => (prev === index ? null : prev));
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            const fromRaw = e.dataTransfer.getData('text/plain');
                                            const fromIndex = dragFromIndex ?? Number(fromRaw);
                                            if (!Number.isNaN(fromIndex)) {
                                                handleReorderItem(fromIndex, index);
                                            }
                                            setDragFromIndex(null);
                                            setDragOverIndex(null);
                                        }}
                                        className={`bg-white dark:bg-slate-800 border rounded-xl overflow-hidden hover:shadow-md transition-all ${
                                            dragFromIndex === index ? 'opacity-50' : ''
                                        } ${
                                            dragOverIndex === index && dragFromIndex !== index
                                                ? 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-300 dark:ring-indigo-600'
                                                : itensSelecionados.has(index)
                                                    ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/20'
                                                    : 'border-gray-200 dark:border-dark-border'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 p-4">
                                            {/* Handle de arrastar para reordenar */}
                                            <div className="flex-shrink-0">
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.effectAllowed = 'move';
                                                        e.dataTransfer.setData('text/plain', String(index));
                                                        setDragFromIndex(index);
                                                    }}
                                                    onDragEnd={() => {
                                                        setDragFromIndex(null);
                                                        setDragOverIndex(null);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing transition-colors select-none"
                                                    title="Arrastar para reordenar"
                                                    aria-label="Arrastar para reordenar item"
                                                >
                                                    <GripIcon className="w-5 h-5 pointer-events-none" />
                                                </div>
                                            </div>
                                            {/* Checkbox de seleção */}
                                            <div className="flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={itensSelecionados.has(index)}
                                                    onChange={() => toggleItemSelecionado(index)}
                                                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </div>
                                            {/* Coluna de Foto - Compacta */}
                                            <div className="flex-shrink-0">
                                                {fotoUrl ? (
                                                    <img
                                                        src={getUploadUrl(fotoUrl)}
                                                        alt={item.nome}
                                                        className="w-14 h-14 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                                        onError={(e) => {
                                                            const imgElement = e.target as HTMLImageElement;
                                                            imgElement.style.display = 'none';
                                                            const placeholder = document.createElement('div');
                                                            placeholder.className = 'w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center';
                                                            placeholder.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                                            imgElement.parentElement?.appendChild(placeholder);
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nome e Badges - Expandido */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-dark-text truncate">{item.nome}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                        {formatarUnidadeOrcamento(item.unidadeVenda || item.unidadeMedida)}
                                                    </span>
                                                    {/* Campo NCM */}
                                                    <div className="flex items-center gap-1">
                                                        <label className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">NCM:</label>
                                                        <input
                                                            type="text"
                                                            value={item.ncm || ''}
                                                            onChange={(e) => {
                                                                setItems(prev => prev.map((it, i) => 
                                                                    i === index ? { ...it, ncm: e.target.value || undefined } : it
                                                                ));
                                                            }}
                                                            placeholder="00000000"
                                                            maxLength={8}
                                                            className="w-20 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    {/* Badge de Banco Frio */}
                                                    {(item.tipo === 'COTACAO' || (item as any).cotacao || (item as any).cotacaoId) && (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                                            <span>Banco Frio</span>
                                                            {(() => {
                                                                const dataStr = (item as any).cotacao?.dataAtualizacao || 
                                                                              item.dataAtualizacaoCotacao || 
                                                                              (item as any).cotacao?.createdAt ||
                                                                              (item as any).dataAtualizacao;
                                                                if (dataStr) {
                                                                    const data = new Date(dataStr);
                                                                    if (!isNaN(data.getTime())) {
                                                                        return <span>• {data.toLocaleDateString('pt-BR')}</span>;
                                                                    }
                                                                }
                                                                return null;
                                                            })()}
                                                        </span>
                                                    )}
                                                    {/* Badge Venda direta fornecedor */}
                                                    {(item as any).vendaDiretaFornecedor && (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded text-xs font-medium" title="Não entra em contas a receber, estoque nem NF-e">
                                                            Venda direta fornecedor
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantidade - Compacto */}
                                            <div className="flex-shrink-0 w-24">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Qtd.</label>
                                                <input
                                                    type="number"
                                                    value={item.quantidade}
                                                    onChange={(e) => handleUpdateItemQuantity(index, parseFloat(e.target.value) || 0)}
                                                    min={0.01}
                                                    step={0.01}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                />
                                            </div>

                                            {/* Valor Unitário - Compacto */}
                                            <div className="flex-shrink-0 w-32">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                    Valor Unit.
                                                    {item.precoEditadoManual && <span className="ml-1 text-blue-600 dark:text-blue-400" title="Editado">✏️</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={valorEditando[index] !== undefined ? valorEditando[index] : formatarValorBRL(item.precoUnit)}
                                                    onChange={(e) => {
                                                        const valorDigitado = e.target.value;
                                                        // Permitir apenas números, vírgula e ponto
                                                        if (valorDigitado === '' || /^[\d.,]+$/.test(valorDigitado) || valorDigitado === ',') {
                                                            setValorEditando(prev => ({ ...prev, [index]: valorDigitado }));
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const valorDigitado = e.target.value;
                                                        const valorNumerico = parsearValorBRL(valorDigitado);
                                                        if (valorNumerico !== item.precoUnit) {
                                                            handleUpdateItemPrice(index, valorNumerico);
                                                        } else {
                                                            // Limpar valor em edição se não mudou
                                                            const novosValoresEditando = { ...valorEditando };
                                                            delete novosValoresEditando[index];
                                                            setValorEditando(novosValoresEditando);
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        // Ao focar, mostrar valor sem formatação para facilitar edição
                                                        if (valorEditando[index] === undefined) {
                                                            setValorEditando(prev => ({ ...prev, [index]: item.precoUnit.toString().replace('.', ',') }));
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                    placeholder="0,00"
                                                />
                                            </div>

                                            {/* Subtotal e Lucro */}
                                            <div className="flex-shrink-0 w-40">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Subtotal</label>
                                                <p className="text-base font-bold text-purple-700 dark:text-purple-300">
                                                    R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                {(() => {
                                                    const empresaSelecionada = empresas.find(e => e.cnpj === formState.empresaCNPJ);
                                                    const aliquotaMaterial = empresaSelecionada?.aliquotaMaterial ?? 8;
                                                    const aliquotaServico = empresaSelecionada?.aliquotaServico ?? 8;
                                                    const aliquotaItem = item.tipo === 'SERVICO' ? aliquotaServico : aliquotaMaterial;
                                                    const valorVendaSemBDI = item.precoBase ?? (item.precoUnit / (1 + (formState.bdi ?? 0) / 100));
                                                    const custoAgregadoUnit = item.custoAgregadoUnit ?? (item.custoUnit + (valorVendaSemBDI * aliquotaItem / 100));
                                                    const custoTotal = custoAgregadoUnit * item.quantidade;
                                                    const lucroLiquido = item.subtotal - custoTotal;
                                                    const percentualSobreVenda = item.subtotal > 0 ? (lucroLiquido / item.subtotal) * 100 : 0;
                                                    return (
                                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium" title={`Lucro Líquido: R$ ${lucroLiquido.toFixed(2)} (${percentualSobreVenda.toFixed(1)}%)`}>
                                                            Lucro Líquido: R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentualSobreVenda.toFixed(1)}%)
                                                        </p>
                                                    );
                                                })()}
                                            </div>

                                            {/* Botões Ver Itens e Editar (apenas para kits) - Compacto */}
                                            {item.tipo === 'KIT' && (
                                                <div className="flex-shrink-0 flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            // ✅ Prioridade: se o item já tem itensDoKit materializado (kit unificado OU kit do catálogo), usar diretamente
                                                            if ((item as any).itensDoKit && Array.isArray((item as any).itensDoKit) && (item as any).itensDoKit.length > 0) {
                                                                setItensKitParaVisualizar((item as any).itensDoKit);
                                                                setNomeKitParaVisualizar(item.nome);
                                                                setShowModalItensKit(true);
                                                            }
                                                            // Fallback (compat): kit do catálogo antigo sem itensDoKit → buscar no catálogo
                                                            else if (item.kitId) {
                                                                const kitCompleto = kits.find((k: any) => k.id === item.kitId);
                                                                if (kitCompleto) {
                                                                    // Preparar itens do kit do catálogo para visualização
                                                                    const itensEstoque = (kitCompleto.items || []).map((kitItem: any) => ({
                                                                        nome: kitItem.material?.nome || 'Material',
                                                                        codigo: kitItem.material?.sku || '',
                                                                        custoUnit: kitItem.material?.preco || 0, // Custo de compra do material
                                                                        valorVenda: kitItem.material?.valorVenda || kitItem.material?.preco || 0,
                                                                        quantidade: kitItem.quantidade,
                                                                        unidadeMedida: normalizarUnidadeMedidaOrcamento(kitItem.material?.unidadeMedida) || 'un',
                                                                        tipo: 'MATERIAL',
                                                                        subtotal: (kitItem.quantidade || 0) * (kitItem.material?.valorVenda || kitItem.material?.preco || 0)
                                                                    }));
                                                                    
                                                                    // Adicionar itens do banco frio e serviços
                                                                    const itensBancoFrio = ((kitCompleto as any).itensFaltantes || []).map((item: any) => {
                                                                        if (item.tipo === 'SERVICO' && item.servicoId) {
                                                                            // Buscar dados completos do serviço
                                                                            const servicoCompleto = servicos.find((s: any) => s.id === item.servicoId);
                                                                            if (servicoCompleto) {
                                                                                return {
                                                                                    nome: servicoCompleto.nome,
                                                                                    codigo: servicoCompleto.codigo,
                                                                                    custoUnit: servicoCompleto.custo || 0,
                                                                                    valorVenda: servicoCompleto.preco || 0,
                                                                                    quantidade: item.quantidade || 0,
                                                                                    unidadeMedida: normalizarUnidadeMedidaOrcamento(servicoCompleto.unidade) || 'un',
                                                                                    tipo: 'SERVICO',
                                                                                    subtotal: (item.quantidade || 0) * (servicoCompleto.preco || 0)
                                                                                };
                                                                            }
                                                                        } else if (item.tipo === 'COTACAO' && item.cotacaoId) {
                                                                            // Buscar dados completos da cotação
                                                                            const cotacaoCompleta = cotacoes.find((c: any) => c.id === item.cotacaoId);
                                                                            if (cotacaoCompleta) {
                                                                                return {
                                                                                    nome: cotacaoCompleta.nome,
                                                                                    codigo: cotacaoCompleta.fornecedorNome || cotacaoCompleta.sku || '',
                                                                                    custoUnit: cotacaoCompleta.valorUnitario || 0,
                                                                                    valorVenda: cotacaoCompleta.valorVenda || cotacaoCompleta.valorUnitario * 1.4 || 0,
                                                                                    quantidade: item.quantidade || 0,
                                                                                    unidadeMedida: normalizarUnidadeMedidaOrcamento(cotacaoCompleta.unidadeMedida) || 'un',
                                                                                    tipo: 'COTACAO',
                                                                                    subtotal: (item.quantidade || 0) * (cotacaoCompleta.valorVenda || cotacaoCompleta.valorUnitario * 1.4 || 0),
                                                                                    dataUltimaCotacao: cotacaoCompleta.dataAtualizacao
                                                                                };
                                                                            }
                                                                        }
                                                                        
                                                                        // Fallback: usar dados do item mesmo
                                                                        return {
                                                                            nome: item.nome || item.materialNome || item.servicoNome || 'Item',
                                                                            codigo: item.codigo || item.sku || '',
                                                                            custoUnit: item.valorUnitario || item.custo || 0,
                                                                            valorVenda: item.precoUnit || item.preco || item.valorUnitario || 0,
                                                                            quantidade: item.quantidade || 0,
                                                                            unidadeMedida: normalizarUnidadeMedidaOrcamento(item.unidadeMedida || item.unidade) || 'un',
                                                                            tipo: item.tipo || 'COTACAO',
                                                                            subtotal: (item.quantidade || 0) * (item.precoUnit || item.preco || item.valorUnitario || 0),
                                                                            dataUltimaCotacao: item.dataUltimaCotacao || item.dataAtualizacao
                                                                        };
                                                                    });
                                                                    
                                                                    const todosItens = [...itensEstoque, ...itensBancoFrio];
                                                                    setItensKitParaVisualizar(todosItens);
                                                                    setNomeKitParaVisualizar(kitCompleto.nome);
                                                                    setShowModalItensKit(true);
                                                                } else {
                                                                    toast.error('Kit não encontrado', {
                                                                        description: 'Não foi possível carregar os detalhes do kit'
                                                                    });
                                                                }
                                                            } else {
                                                                toast.warning('Kit sem itens', {
                                                                    description: 'Este kit não possui itens cadastrados'
                                                                });
                                                            }
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="Ver itens do kit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    
                                                    {/* Botão Editar (apenas para kits unificados - sem kitId) */}
                                                    {!item.kitId && (item as any).itensDoKit && Array.isArray((item as any).itensDoKit) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSnapshotItemsAntesKitEdicao(JSON.stringify(items));
                                                                setSnapshotItensDoKitInicial(JSON.stringify((item as any).itensDoKit || []));
                                                                setPendentesBaixarDoKit([]);
                                                                setBuscaKitEdicao('');
                                                                setKitEmEdicao({ index, item: item as any });
                                                                setItensKitEdicao([...(item as any).itensDoKit]);
                                                                setShowModalEditarKit(true);
                                                            }}
                                                            className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                            title="Editar kit unificado"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Botão Deletar - Compacto */}
                                            <div className="flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Remover item"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SEÇÃO 4: Cálculo Financeiro */}
                <div className="card-primary">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">💰</span>
                        Cálculo Financeiro
                    </h3>
                    <div className="space-y-4">
                        {/* Subtotal */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Subtotal dos Itens</span>
                                <span className="text-xl font-bold text-blue-900 dark:text-blue-200">
                                    R$ {calculosOrcamento.subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Desconto e Impostos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Desconto (R$)
                                </label>
                                <input
                                    type="number"
                                    value={formState.descontoValor}
                                    onChange={(e) => setFormState(prev => ({ ...prev, descontoValor: parseFloat(e.target.value) || 0 }))}
                                    min="0"
                                    step="0.01"
                                    className="input-field"
                                    placeholder="0,00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Impostos (%)
                                </label>
                                <input
                                    type="number"
                                    value={formState.impostoPercentual}
                                    onChange={(e) => setFormState(prev => ({ ...prev, impostoPercentual: parseFloat(e.target.value) || 0 }))}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="input-field"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Condição de Pagamento
                                </label>
                                <select
                                    value={formState.condicaoPagamento}
                                    onChange={(e) => setFormState(prev => ({ ...prev, condicaoPagamento: e.target.value }))}
                                    className="select-field"
                                >
                                    <option>À Vista</option>
                                    <option>30 dias</option>
                                    <option>60 dias</option>
                                    <option>90 dias</option>
                                    <option>Parcelado</option>
                                    <option>Pagamento conforme condições a serem acordadas.</option>
                                </select>
                            </div>
                        </div>

                        {/* TOTAL FINAL */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-300 dark:border-purple-700 p-6 rounded-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-lg font-semibold text-purple-700 dark:text-purple-300 uppercase">Valor Total Final</span>
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                        Subtotal - Desconto + Impostos
                                    </p>
                                </div>
                                <span className="text-4xl font-bold text-purple-700 dark:text-purple-300">
                                    R$ {calculosOrcamento.valorTotalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 5: Descrição Técnica com Editor WYSIWYG */}
                <div className="card-primary">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-2 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">📝</span>
                            Descrição Técnica do Projeto
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                            💡 Use o editor abaixo para criar uma descrição técnica profissional. Você pode formatar o texto, inserir imagens, criar tabelas e muito mais.
                        </p>
                    </div>

                    {/* Editor TipTap WYSIWYG */}
                    <div className="mb-6">
                        <TechnicalEditor
                            value={formState.descricaoProjeto}
                            onChange={(content) => setFormState(prev => ({ ...prev, descricaoProjeto: content }))}
                            placeholder="Digite a descrição técnica completa do projeto... Você pode formatar o texto, inserir imagens, criar tabelas e listas."
                            height={1000}
                            showPagePreview={false}
                        />
                    </div>

                    {/* Dica de Uso */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">💡 Dicas do Editor</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                                    <li>• <strong>Imagens:</strong> Clique no ícone de imagem para inserir fotos inline</li>
                                    <li>• <strong>Tabelas:</strong> Use para listar materiais e especificações</li>
                                    <li>• <strong>Formatação:</strong> Destaque informações importantes com negrito/cores</li>
                                    <li>• <strong>Preview:</strong> Use o botão de visualização para ver o resultado final</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação Fixos no Footer */}
                <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border shadow-lg p-6 rounded-t-2xl">
                    <div className="max-w-6xl mx-auto flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="btn-secondary"
                            disabled={salvando}
                        >
                            Cancelar
                        </button>
                        <button

                            type="button"
                            onClick={salvarRascunho}
                            className="btn-secondary flex items-center gap-2"
                            disabled={salvando}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Salvar Rascunho
                        </button>
                        <button
                            type="submit"
                            className="btn-primary disabled:opacity-50"
                            disabled={salvando || items.length === 0}
                        >
                            {salvando ? (
                                <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="w-5 h-5 inline mr-2" />
                                    Criar Orçamento
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {/* Modal de Adicionar Item - Com Abas */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-2xl ${modalExpandido ? 'max-w-[95vw] w-full' : 'max-w-4xl w-full'} max-h-[95vh] overflow-hidden flex flex-col transition-all duration-300`}>
                        {/* Header com Abas */}
                        <div className="p-4 border-b border-gray-200 dark:border-dark-border" style={{ backgroundColor: '#0a1a2f' }}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white">Adicionar Item ao Orçamento</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setItemSearchTerm('');
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                        setMaterialSelecionadoComparacao(null);
                                        setCotacaoSelecionadaComparacao(null);
                                        setMateriaisSelecionadosComparacao(new Set());
                                        setCotacoesSelecionadasComparacao(new Set());
                                        setItensSelecionadosModal(new Set());
                                        setUnidadeVendaSelecionada({});
                                        setQuantidadesPorItem({});
                                        setSearchEstoque('');
                                        setSearchCotacoes('');
                                        setSearchGlobalComparacao('');
                                        setBuscaGlobal('');
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Campo de Busca Universal no Header */}
                            <div className="mb-2">
                                <div className="relative">
                                    <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={buscaGlobal}
                                        onChange={(e) => setBuscaGlobal(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                                        placeholder="🔍 Buscar em todos os itens (Materiais, Serviços, Kits, Quadros, Cotações)..."
                                        style={{ color: 'white' }}
                                    />
                                </div>
                            </div>

                            {/* Abas - uma linha, botões compactos */}
                            <div className="flex gap-1.5 flex-nowrap items-center overflow-x-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (modalExpandido) {
                                            // Ao colapsar, resetar para modo materiais
                                            setModalExpandido(false);
                                            setModoAdicao('materiais');
                                        } else {
                                            // Ao expandir, mudar para modo comparação
                                            setModalExpandido(true);
                                            setModoAdicao('comparacao');
                                        }
                                    }}
                                    className={`px-2 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 shrink-0 ${
                                        modalExpandido
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                    title="Expandir para comparar estoque real com banco frio"
                                >
                                    {modalExpandido ? (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
                                            Comparação Ativa
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                            Comparar
                                        </>
                                    )}
                                </button>
                                <button type="button" onClick={() => { setModoAdicao('materiais'); setModalExpandido(false); }} className={`px-2 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${modoAdicao === 'materiais' && !modalExpandido && !buscaGlobal.trim() ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>📦 Materiais</button>
                                <button type="button" onClick={() => setModoAdicao('servicos')} className={`px-2 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${modoAdicao === 'servicos' ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>🔧 Serviços</button>
                                <button type="button" onClick={() => setModoAdicao('kits')} className={`px-2 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${modoAdicao === 'kits' ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>📦 Kits</button>
                                <button type="button" onClick={() => setModoAdicao('quadros')} className={`px-2 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${modoAdicao === 'quadros' ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>⚡ Quadros</button>
                                <button type="button" onClick={() => setModoAdicao('cotacoes')} className={`px-2 py-1.5 rounded-md text-sm font-medium transition-all shrink-0 ${modoAdicao === 'cotacoes' ? 'bg-white text-indigo-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>🏷️ Cotações</button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Resultados da Busca Global */}
                            {/* Resultados da Busca Global - Layout lado a lado quando expandido */}
                            {buscaGlobal.trim() && (
                                <div className={`mb-6 ${modalExpandido ? 'grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto' : 'space-y-4'}`}>
                                            {/* Materiais */}
                                            {resultadosBuscaGlobal.materiais.length > 0 && (
                                                <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>📦</span> Materiais ({resultadosBuscaGlobal.materiais.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.materiais.map(material => (
                                                            <button
                                                                key={material.id}
                                                                type="button"
                                                                onClick={() => handleAddItem(material, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">

                                                                    SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
                                                                    <br />
                                                                    Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                    {material.valorVenda && (
                                                                        <> • Venda: R$ {(material.valorVenda ?? 0).toFixed(2)} 
                                                                        {material.porcentagemLucro && ` (${(material.porcentagemLucro ?? 0).toFixed(2)}% lucro)`}
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Serviços */}
                                            {resultadosBuscaGlobal.servicos.length > 0 && (
                                                <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>🔧</span> Serviços ({resultadosBuscaGlobal.servicos.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.servicos.map(servico => (
                                                            <div
                                                                key={servico.id}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                                                            >
                                                                <div className="flex justify-between items-start gap-3">
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{servico.nome}</p>
                                                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                            Código: {servico.codigo || 'N/A'} • Preço: R$ {(servico.preco ?? 0).toFixed(2)}{'/'}{servico.unidade || 'un'}
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddServico(servico, true)}
                                                                        className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                                                                    >
                                                                        + Inserir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Kits */}
                                            {resultadosBuscaGlobal.kits.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>📦</span> Kits ({resultadosBuscaGlobal.kits.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.kits.map(kit => (
                                                            <button
                                                                key={kit.id}
                                                                type="button"
                                                                onClick={() => handleAddKit(kit, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{kit.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                    {kit.items?.length || 0} itens • Preço: R$ {getKitPrecoVendaTotal(kit).toFixed(2)}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quadros */}
                                            {resultadosBuscaGlobal.quadros.length > 0 && (
                                                <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>⚡</span> Quadros ({resultadosBuscaGlobal.quadros.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.quadros.map(quadro => (
                                                            <button
                                                                key={quadro.id}
                                                                type="button"
                                                                onClick={() => handleAddQuadro(quadro, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{quadro.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">

                                                                    Custo: R$ {(quadro.custoTotal ?? 0).toFixed(2)} • Preço: R$ {((quadro.precoSugerido ?? quadro.custoTotal) ?? 0).toFixed(2)}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Cotações */}
                                            {resultadosBuscaGlobal.cotacoes.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>🏷️</span> Cotações - Banco Frio ({resultadosBuscaGlobal.cotacoes.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.cotacoes.map(cotacao => {
                                                            const temSelecaoUnidade = podeVenderEmMetroOuCm(cotacao.unidadeMedida);
                                                            
                                                            // Calcular valores para exibição
                                                            const custoUnitario = cotacao.valorUnitario || 0;
                                                            const valorVendaBase = cotacao.valorVenda || custoUnitario;
                                                            const porcentagemLucro = custoUnitario > 0 
                                                                ? ((valorVendaBase - custoUnitario) / custoUnitario) * 100 
                                                                : 0;
                                                            const unidadeMedida = cotacao.unidadeMedida || 'UN';
                                                            
                                                            return (
                                                                <div
                                                                    key={cotacao.id}
                                                                    className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-semibold">
                                                                            Banco Frio
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-start gap-3">
                                                                        <div className="flex-1">
                                                                            <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                                            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                                NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'}
                                                                                <br />
                                                                                Custo: R$ {custoUnitario.toFixed(2)}{'/'}{unidadeMedida}
                                                                                {valorVendaBase > 0 && (
                                                                                    <> • Venda: R$ {valorVendaBase.toFixed(2)}{'/'}{unidadeMedida}
                                                                                    {porcentagemLucro > 0 && ` (${porcentagemLucro.toFixed(2)}% lucro)`}
                                                                                    </>
                                                                                )}
                                                                            </p>
                                                                            {temSelecaoUnidade && (
                                                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                                                    💡 Metros ou cm
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {temSelecaoUnidade ? (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleAddCotacao(cotacao, true, 'm')}
                                                                                        className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                                                                                        title="Adicionar em metros"
                                                                                    >
                                                                                        + m
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleAddCotacao(cotacao, true, 'cm')}
                                                                                        className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                                                                                        title="Adicionar em centímetros"
                                                                                    >
                                                                                        + cm
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAddCotacao(cotacao, true)}
                                                                                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                                                                                >
                                                                                    + Inserir
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nenhum resultado */}
                                            {Object.values(resultadosBuscaGlobal).every(arr => arr.length === 0) && (
                                                <div className={`text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-xl ${modalExpandido ? 'col-span-2' : ''}`}>
                                                    <p className="text-gray-500 dark:text-dark-text-secondary">Nenhum item encontrado para "{buscaGlobal}"</p>
                                                </div>
                                            )}
                                        </div>
                            )}

                            {/* Modo: Comparação Estoque vs Banco Frio (Modal Expandido) */}
                            {modalExpandido && modoAdicao === 'comparacao' && (
                                <div className="space-y-4">
                                    <div className="mb-4">
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={searchGlobalComparacao}
                                                onChange={(e) => {
                                                    setSearchGlobalComparacao(e.target.value);
                                                    setSearchEstoque(e.target.value);
                                                    setSearchCotacoes(e.target.value);
                                                }}
                                                className="input-field w-full pl-10"
                                                placeholder="🔍 Buscar em ambos os painéis (use * ou % para juntar termos)..."
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            💡 Filtra materiais e cotações do banco frio ao mesmo tempo. Ex.: <code className="text-[11px]">cabo * 70 * ver</code> ou <code className="text-[11px]">fornecedor % anilha</code>
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Painel Esquerdo: Materiais com Estoque Real */}
                                        <div className="border-r border-gray-200 dark:border-dark-border pr-6">
                                            <div className="mb-4">
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2 flex items-center gap-2">
                                                    <span className="text-2xl">📦</span>
                                                    Materiais com Estoque Real
                                                    {searchGlobalComparacao && (
                                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                                            ({filteredMateriaisEstoque.length} encontrados)
                                                        </span>
                                                    )}
                                                </h4>
                                                {!searchGlobalComparacao && (
                                                    <input
                                                        type="text"
                                                        value={searchEstoque}
                                                        onChange={(e) => setSearchEstoque(e.target.value)}
                                                        className="input-field w-full"
                                                        placeholder="🔍 Buscar material por nome ou SKU..."
                                                    />
                                                )}
                                            </div>

                                            <div className="space-y-2 max-h-[calc(95vh-250px)] overflow-y-auto">
                                                {filteredMateriaisEstoque.length === 0 ? (
                                                    <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                                        <p className="text-gray-500 dark:text-dark-text-secondary">Nenhum material encontrado</p>
                                                    </div>
                                                ) : (
                                                    filteredMateriaisEstoque.map(material => {
                                                        const estaSelecionadoMultiplo = materiaisSelecionadosComparacao.has(material.id);
                                                        return (
                                                            <div
                                                                key={material.id}
                                                                className={`p-3 border rounded-lg transition-all ${
                                                                    estaSelecionadoMultiplo
                                                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                                        : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-indigo-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={estaSelecionadoMultiplo}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleMaterialSelecionado(material.id);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                                    />
                                                                    {estaSelecionadoMultiplo && (
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={quantidadesPorItem[material.id] || 1}
                                                                            onChange={(e) => {
                                                                                const valor = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setQuantidadesPorItem(prev => ({ ...prev, [material.id]: valor }));
                                                                            }}
                                                                            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            title="Quantidade"
                                                                        />
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                            SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida} • Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Painel Direito: Cotações (Banco Frio) */}
                                        <div className="pl-6">
                                            <div className="mb-4">
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2 flex items-center gap-2">
                                                    <span className="text-2xl">🏷️</span>
                                                    Cotações (Banco Frio)
                                                    {searchGlobalComparacao && (
                                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                                            ({filteredCotacoesComparacao.length} encontradas)
                                                        </span>
                                                    )}
                                                </h4>
                                                {!searchGlobalComparacao && (
                                                    <input
                                                        type="text"
                                                        value={searchCotacoes}
                                                        onChange={(e) => setSearchCotacoes(e.target.value)}
                                                        className="input-field w-full"
                                                        placeholder="🔍 Buscar cotação por nome, NCM ou fornecedor..."
                                                    />
                                                )}
                                            </div>

                                            <div className="space-y-2 max-h-[calc(95vh-250px)] overflow-y-auto">
                                                {filteredCotacoesComparacao.length === 0 ? (
                                                    <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                                        <p className="text-gray-500 dark:text-dark-text-secondary">Nenhuma cotação encontrada</p>
                                                    </div>
                                                ) : (
                                                    filteredCotacoesComparacao.map(cotacao => {
                                                        const estaSelecionadaMultiplo = cotacoesSelecionadasComparacao.has(cotacao.id);
                                                        return (
                                                            <div
                                                                key={cotacao.id}
                                                                className={`p-3 border rounded-lg transition-all ${
                                                                    estaSelecionadaMultiplo
                                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                                        : 'border-gray-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={estaSelecionadaMultiplo}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleCotacaoSelecionada(cotacao.id);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                                    />
                                                                    {estaSelecionadaMultiplo && (
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={quantidadesPorItem[cotacao.id] || 1}
                                                                            onChange={(e) => {
                                                                                const valor = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setQuantidadesPorItem(prev => ({ ...prev, [cotacao.id]: valor }));
                                                                            }}
                                                                            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            title="Quantidade"
                                                                        />
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                            NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'} • Custo: R$ {(cotacao.valorUnitario ?? 0).toFixed(2)}{'/'}{cotacao.unidadeMedida || 'UN'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modo: Materiais */}
                            {!buscaGlobal.trim() && modoAdicao === 'materiais' && (
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field flex-1"
                                            placeholder="🔍 Buscar material por nome ou SKU..."
                                        />
                                        {modalExpandido && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSelecionarTodos}
                                                    className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                >
                                                    Selecionar Todos
                                                </button>
                                                {itensSelecionadosModal.size > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleDeselecionarTodos}
                                                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        Desmarcar Todos
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {filteredMaterials.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum material encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Tente ajustar a busca ou criar manualmente</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredMaterials.map(material => {
                                                const temSelecaoUnidade = podeVenderEmMetroOuCm(material.unidadeMedida);
                                                
                                                const estaSelecionado = itensSelecionadosModal.has(material.id);
                                                
                                                return (
                                                    <div
                                                        key={material.id}
                                                        className={`w-full text-left p-2.5 py-2 bg-gray-50 dark:bg-slate-800 border rounded-lg transition-all ${
                                                            estaSelecionado 
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                                                                : 'border-gray-200 dark:border-dark-border hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            {modalExpandido && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={estaSelecionado}
                                                                    onChange={() => handleToggleSelecaoItem(material.id)}
                                                                    className="w-4 h-4 shrink-0 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                                />
                                                            )}
                                                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate">{material.nome}</span>
                                                                <span className="text-xs text-gray-600 dark:text-dark-text-secondary shrink-0">SKU: {material.sku} • Est.: {material.estoque} {material.unidadeMedida} • R$ {(material.preco ?? 0).toFixed(2)}{material.valorVenda ? ` • Venda: R$ ${(material.valorVenda ?? 0).toFixed(2)}` : ''}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {modalExpandido ? (
                                                                    <>
                                                                        {estaSelecionado && (
                                                                            <div className="flex items-center gap-2">
                                                                                <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                                    Qtd:
                                                                                </label>
                                                                                <input
                                                                                    type="number"
                                                                                    min="1"
                                                                                    value={quantidadesPorItem[material.id] || 1}
                                                                                    onChange={(e) => {
                                                                                        const valor = Math.max(1, parseInt(e.target.value) || 1);
                                                                                        setQuantidadesPorItem(prev => ({ ...prev, [material.id]: valor }));
                                                                                    }}
                                                                                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        {temSelecaoUnidade && (
                                                                            <select
                                                                                value={unidadeVendaSelecionada[material.id] || 'm'}
                                                                                onChange={(e) => setUnidadeVendaSelecionada(prev => ({ ...prev, [material.id]: e.target.value }))}
                                                                                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <option value="m">Metros</option>
                                                                                <option value="cm">Centímetros</option>
                                                                            </select>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    temSelecaoUnidade ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddItem(material, false, 'm')}
                                                                                className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                                title="Adicionar em metros"
                                                                            >
                                                                                + Metro
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddItem(material, false, 'cm')}
                                                                                className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                                                                title="Adicionar em centímetros"
                                                                            >
                                                                                + cm
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAddItem(material)}
                                                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                        >
                                                                            + Adicionar
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Serviços */}
                            {!buscaGlobal.trim() && modoAdicao === 'servicos' && (
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field flex-1"
                                            placeholder="🔍 Buscar serviço por nome ou código..."
                                        />
                                        {modalExpandido && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSelecionarTodos}
                                                    className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                >
                                                    Selecionar Todos
                                                </button>
                                                {itensSelecionadosModal.size > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleDeselecionarTodos}
                                                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        Desmarcar Todos
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {filteredServicos.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🔧</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum serviço encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Cadastre serviços na página de Serviços</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredServicos.map(servico => {
                                                const estaSelecionado = itensSelecionadosModal.has(servico.id);
                                                
                                                return (
                                                    <div
                                                        key={servico.id}
                                                        className={`w-full text-left p-2.5 py-2 bg-gray-50 dark:bg-slate-800 border rounded-lg transition-all ${
                                                            estaSelecionado 
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                                                                : 'border-gray-200 dark:border-dark-border hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {modalExpandido && (
                                                                <input type="checkbox" checked={estaSelecionado} onChange={() => handleToggleSelecaoItem(servico.id)} className="w-4 h-4 shrink-0 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                                            )}
                                                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate">{servico.nome}</span>
                                                                <span className="text-xs text-gray-600 dark:text-dark-text-secondary shrink-0">{`${servico.codigo || 'N/A'} • R$ ${(servico.preco ?? 0).toFixed(2)}/${servico.unidade || 'un'}`}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {modalExpandido && estaSelecionado && (
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                            Qtd:
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={quantidadesPorItem[servico.id] || 1}
                                                                            onChange={(e) => {
                                                                                const valor = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setQuantidadesPorItem(prev => ({ ...prev, [servico.id]: valor }));
                                                                            }}
                                                                            className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {!modalExpandido && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddServico(servico)}
                                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        + Adicionar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Kits */}
                            {!buscaGlobal.trim() && modoAdicao === 'kits' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar kit por nome..."
                                        />
                                    </div>

                                    {filteredKits.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum kit disponível</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                A funcionalidade de kits será implementada em breve
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredKits.map(kit => {
                                                const estaSelecionado = itensSelecionadosModal.has(kit.id);
                                                
                                                return (
                                                    <div
                                                        key={kit.id}
                                                        className={`w-full text-left p-2.5 py-2 bg-gray-50 dark:bg-slate-800 border rounded-lg transition-all ${
                                                            estaSelecionado 
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                                                                : 'border-gray-200 dark:border-dark-border hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {modalExpandido && (
                                                                <input type="checkbox" checked={estaSelecionado} onChange={() => handleToggleSelecaoItem(kit.id)} className="w-4 h-4 shrink-0 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                                            )}
                                                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate">{kit.nome}</span>
                                                                <span className="text-xs text-gray-600 dark:text-dark-text-secondary shrink-0">{(kit.items?.length || 0) + ((kit as any).itensFaltantes?.length || 0)} itens • R$ {getKitPrecoVendaTotal(kit).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {modalExpandido && estaSelecionado && (
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                            Qtd:
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={quantidadesPorItem[kit.id] || 1}
                                                                            onChange={(e) => {
                                                                                const valor = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setQuantidadesPorItem(prev => ({ ...prev, [kit.id]: valor }));
                                                                            }}
                                                                            className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {!modalExpandido && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddKit(kit)}
                                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        + Adicionar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Quadros */}
                            {!buscaGlobal.trim() && modoAdicao === 'quadros' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar quadro por nome..."
                                        />
                                    </div>

                                    {filteredQuadros.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">⚡</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum quadro encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                Monte quadros no módulo de Catálogo
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredQuadros.map(quadro => {
                                                const estaSelecionado = itensSelecionadosModal.has(quadro.id);
                                                
                                                return (
                                                    <div
                                                        key={quadro.id}
                                                        className={`w-full text-left p-2.5 py-2 bg-gray-50 dark:bg-slate-800 border rounded-lg transition-all ${
                                                            estaSelecionado 
                                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                                                                : 'border-gray-200 dark:border-dark-border hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {modalExpandido && (
                                                                <input type="checkbox" checked={estaSelecionado} onChange={() => handleToggleSelecaoItem(quadro.id)} className="w-4 h-4 shrink-0 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                                            )}
                                                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate">{quadro.nome}</span>
                                                                <span className="text-xs text-gray-600 dark:text-dark-text-secondary shrink-0">R$ {quadro.custoTotal.toFixed(2)} • Preço: R$ {(quadro.precoSugerido || quadro.custoTotal).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {modalExpandido && estaSelecionado && (
                                                                    <div className="flex items-center gap-2">
                                                                        <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                            Qtd:
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={quantidadesPorItem[quadro.id] || 1}
                                                                            onChange={(e) => {
                                                                                const valor = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setQuantidadesPorItem(prev => ({ ...prev, [quadro.id]: valor }));
                                                                            }}
                                                                            className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {!modalExpandido && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddQuadro(quadro)}
                                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        + Adicionar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Cotações (Banco Frio) */}
                            {!buscaGlobal.trim() && modoAdicao === 'cotacoes' && (
                                <div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field flex-1"
                                            placeholder="🔍 Buscar cotação por nome, NCM ou fornecedor..."
                                        />
                                        {modalExpandido && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSelecionarTodos}
                                                    className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                >
                                                    Selecionar Todos
                                                </button>
                                                {itensSelecionadosModal.size > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleDeselecionarTodos}
                                                        className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        Desmarcar Todos
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-4">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            📦 <strong>Banco Frio:</strong> Materiais cotados com fornecedores, sem necessidade de estoque físico.
                                        </p>
                                    </div>

                                    {filteredCotacoes.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🏷️</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhuma cotação encontrada</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                Cadastre cotações na página de Cotações
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredCotacoes.map(cotacao => {
                                                const temSelecaoUnidade = podeVenderEmMetroOuCm(cotacao.unidadeMedida);
                                                
                                                // Calcular valores para exibição
                                                const custoUnitario = cotacao.valorUnitario || 0;
                                                const valorVendaBase = cotacao.valorVenda || custoUnitario;
                                                const porcentagemLucro = custoUnitario > 0 
                                                    ? ((valorVendaBase - custoUnitario) / custoUnitario) * 100 
                                                    : 0;
                                                const unidadeMedida = cotacao.unidadeMedida || 'UN';
                                                
                                                const estaSelecionado = itensSelecionadosModal.has(cotacao.id);
                                                
                                                const classeCardCotacao = estaSelecionado
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                    : 'border-gray-200 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700';
                                                return (
                                                    <div
                                                        key={cotacao.id}
                                                        className={'w-full text-left p-2.5 py-2 bg-gray-50 dark:bg-slate-800 border rounded-lg transition-all ' + classeCardCotacao}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {modalExpandido && (
                                                                <input type="checkbox" checked={estaSelecionado} onChange={() => handleToggleSelecaoItem(cotacao.id)} className="w-4 h-4 shrink-0 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                                            )}
                                                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate">{cotacao.nome}</span>
                                                                <span className="text-xs text-gray-600 dark:text-dark-text-secondary shrink-0">NCM: {cotacao.ncm || 'N/A'} • R$ {custoUnitario.toFixed(2)}{'/'}{unidadeMedida}{valorVendaBase > 0 ? ' • Venda: R$ ' + valorVendaBase.toFixed(2) : ''}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                    {modalExpandido ? (
                                                                        <>
                                                                            {estaSelecionado && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <label className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                                                        Qtd:
                                                                                    </label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min={0.01}
                                                                                        step={0.01}
                                                                                        value={quantidadesPorItem[cotacao.id] ?? 1}
                                                                                        onChange={(e) => {
                                                                                            const valor = Math.max(0.01, parseFloat(e.target.value) || 1);
                                                                                            setQuantidadesPorItem(prev => ({ ...prev, [cotacao.id]: valor }));
                                                                                        }}
                                                                                        className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            {temSelecaoUnidade && (
                                                                                <select
                                                                                    value={unidadeVendaSelecionada[cotacao.id] || 'm'}
                                                                                    onChange={(e) => setUnidadeVendaSelecionada(prev => ({ ...prev, [cotacao.id]: e.target.value }))}
                                                                                    className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <option value="m">Metros</option>
                                                                                    <option value="cm">Centímetros</option>
                                                                                </select>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        temSelecaoUnidade ? (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAddCotacao(cotacao, false, 'm')}
                                                                                    className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                                    title="Adicionar em metros"
                                                                                >
                                                                                    + Metro
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAddCotacao(cotacao, false, 'cm')}
                                                                                    className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                                                                    title="Adicionar em centímetros"
                                                                                >
                                                                                    + cm
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddCotacao(cotacao)}
                                                                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                            >
                                                                                + Inserir
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        
                        <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-dark-border flex justify-between items-center gap-3">
                            <div className="flex-1">
                                {/* Botão para adicionar múltiplos itens selecionados quando modal estiver expandido (busca preenchida) */}
                                {buscaGlobal.trim() && itensSelecionadosModal.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleAdicionarSelecionados}
                                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-colors font-semibold flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Adicionar {itensSelecionadosModal.size} Item(ns) Selecionado(s)
                                    </button>
                                )}
                                {/* Botão para inserção múltipla na comparação */}
                                {modoAdicao === 'comparacao' && (materiaisSelecionadosComparacao.size > 0 || cotacoesSelecionadasComparacao.size > 0) && (
                                    <button
                                        type="button"
                                        onClick={handleInserirSelecionados}
                                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-colors font-semibold flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Inserir {materiaisSelecionadosComparacao.size + cotacoesSelecionadasComparacao.size} Item(ns) Selecionado(s)
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setItemSearchTerm('');
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                        setMaterialSelecionadoComparacao(null);
                                        setCotacaoSelecionadaComparacao(null);
                                        setMateriaisSelecionadosComparacao(new Set());
                                        setCotacoesSelecionadasComparacao(new Set());
                                        setItensSelecionadosModal(new Set());
                                        setUnidadeVendaSelecionada({});
                                        setQuantidadesPorItem({});
                                        setSearchEstoque('');
                                        setSearchCotacoes('');
                                        setSearchGlobalComparacao('');
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Modal de Criar Cliente Rápido */}
        <CriarClienteRapidoModal
            isOpen={showClienteRapidoModal}
            onClose={() => setShowClienteRapidoModal(false)}
            onSubmit={handleCreateClienteRapido}
            loading={criandoClienteRapido}
        />

        {/* Modal de Criar Kit */}
        <AlertDialog open={showCriarKitModal} onOpenChange={setShowCriarKitModal}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📦</span>
                            Criar Kit
                        </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Transforme {itensSelecionados.size} item(ns) selecionado(s) em um único item Kit.
                        O valor do kit será a soma de todos os itens selecionados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                            Nome do Kit *
                        </label>
                        <input
                            type="text"
                            value={nomeKit}
                            onChange={(e) => setNomeKit(e.target.value)}
                            className="input-field"
                            placeholder="Ex: Kit Instalação Completa, Kit Automação Residencial..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                            NCM (Nomenclatura Comum do Mercosul)
                        </label>
                        <input
                            type="text"
                            value={ncmKit}
                            onChange={(e) => setNcmKit(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className="input-field"
                            placeholder="Ex: 85389090 (8 dígitos, para NF-e)"
                            maxLength={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">Opcional. Recomendado preencher para emissão de NF-e.</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-2">
                            Itens que serão agrupados:
                        </p>
                        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 max-h-32 overflow-y-auto">
                            {Array.from(itensSelecionados)
                                .sort((a, b) => a - b)
                                .map(index => {
                                    const item = items[index];
                                    if (!item) return null;
                                    return (
                                        <li key={index} className="flex items-center justify-between">
                                            <span>• {item.nome}</span>
                                            <span className="font-semibold">R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </li>
                                    );
                                })}
                        </ul>
                        <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700 flex justify-between items-center">
                            <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">Valor Total do Kit:</span>
                            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                R$ {Array.from(itensSelecionados)
                                    .map(index => items[index]?.subtotal || 0)
                                    .reduce((sum, val) => sum + val, 0)
                                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => {
                        setNomeKit('');
                        setNcmKit('');
                        setShowCriarKitModal(false);
                    }}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleCriarKit}
                        disabled={!nomeKit.trim()}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Criar Kit
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <ModalItensKit
            open={showModalItensKit}
            onClose={() => {
                setShowModalItensKit(false);
                setItensKitParaVisualizar([]);
                setNomeKitParaVisualizar('');
            }}
            itens={itensKitParaVisualizar}
            nomeKit={nomeKitParaVisualizar}
            empresas={empresas}
            empresaCNPJ={formState.empresaCNPJ}
            numeroOrcamento={proximoNumero ?? undefined}
            usuarioGerador={authContext?.user?.name || undefined}
            onVerDetalhesSubKit={(itemKit: any) => {
                const tipoItem = itemKit.tipo || 'MATERIAL';
                const ehKit = tipoItem === 'KIT' || itemKit.kitId || (itemKit.itensDoKit && Array.isArray(itemKit.itensDoKit));
                const ehKitUnificado = ehKit && !itemKit.kitId && itemKit.itensDoKit;
                const ehKitCatalogo = ehKit && itemKit.kitId;
                if (ehKitUnificado && itemKit.itensDoKit) {
                    setItensSubKitParaVisualizar(itemKit.itensDoKit);
                    setNomeSubKitParaVisualizar(itemKit.nome || '');
                    setShowModalDetalhesSubKit(true);
                } else if (ehKitCatalogo && itemKit.kitId) {
                    const kitCompleto = kits.find((k: any) => k.id === itemKit.kitId);
                    if (kitCompleto) {
                        const itensEstoque = (kitCompleto.items || []).map((kitItem: any) => ({
                            nome: kitItem.material?.nome || 'Material',
                            codigo: kitItem.material?.sku || '',
                            custoUnit: kitItem.material?.preco || 0,
                            valorVenda: kitItem.material?.valorVenda || kitItem.material?.preco || 0,
                            quantidade: kitItem.quantidade,
                            unidadeMedida: kitItem.material?.unidadeMedida || 'un',
                            tipo: 'MATERIAL',
                            subtotal: (kitItem.quantidade || 0) * (kitItem.material?.valorVenda || kitItem.material?.preco || 0)
                        }));
                        const itensBancoFrio = ((kitCompleto as any).itensFaltantes || []).map((item: any) => {
                            if (item.tipo === 'SERVICO') {
                                const servicoCompleto = servicos.find((s: any) => s.id === item.servicoId);
                                if (servicoCompleto) {
                                    return {
                                        nome: servicoCompleto.nome,
                                        codigo: servicoCompleto.codigo,
                                        custoUnit: servicoCompleto.custo || 0,
                                        valorVenda: servicoCompleto.preco || 0,
                                        quantidade: item.quantidade || 0,
                                        unidadeMedida: servicoCompleto.unidade || 'un',
                                        tipo: 'SERVICO',
                                        subtotal: (item.quantidade || 0) * (servicoCompleto.preco || 0)
                                    };
                                }
                            } else if (item.tipo === 'COTACAO') {
                                const cotacaoCompleta = cotacoes.find((c: any) => c.id === item.cotacaoId);
                                if (cotacaoCompleta) {
                                    return {
                                        nome: cotacaoCompleta.nome,
                                        codigo: cotacaoCompleta.fornecedorNome || cotacaoCompleta.sku || '',
                                        custoUnit: cotacaoCompleta.valorUnitario || 0,
                                        valorVenda: cotacaoCompleta.valorVenda || cotacaoCompleta.valorUnitario * 1.4 || 0,
                                        quantidade: item.quantidade || 0,
                                        unidadeMedida: cotacaoCompleta.unidadeMedida || 'un',
                                        tipo: 'COTACAO',
                                        subtotal: (item.quantidade || 0) * (cotacaoCompleta.valorVenda || cotacaoCompleta.valorUnitario * 1.4 || 0),
                                        dataUltimaCotacao: cotacaoCompleta.dataAtualizacao
                                    };
                                }
                            }
                            return {
                                nome: item.nome || 'Item',
                                codigo: item.codigo || '',
                                custoUnit: item.valorUnitario || item.custo || 0,
                                valorVenda: item.precoUnit || item.preco || 0,
                                quantidade: item.quantidade || 0,
                                unidadeMedida: item.unidadeMedida || 'un',
                                tipo: item.tipo || 'COTACAO',
                                subtotal: (item.quantidade || 0) * (item.precoUnit || item.preco || 0),
                                dataUltimaCotacao: item.dataUltimaCotacao
                            };
                        }).filter(Boolean);
                        const todosItens = [...itensEstoque, ...itensBancoFrio];
                        setItensSubKitParaVisualizar(todosItens);
                        setNomeSubKitParaVisualizar(kitCompleto.nome);
                        setShowModalDetalhesSubKit(true);
                    } else {
                        toast.error('Kit não encontrado', { description: 'Não foi possível carregar os detalhes do kit' });
                    }
                }
            }}
        />

        <ModalItensKit
            open={showModalDetalhesSubKit}
            onClose={() => {
                setShowModalDetalhesSubKit(false);
                setItensSubKitParaVisualizar([]);
                setNomeSubKitParaVisualizar('');
            }}
            itens={itensSubKitParaVisualizar}
            nomeKit={nomeSubKitParaVisualizar}
            empresas={empresas}
            empresaCNPJ={formState.empresaCNPJ}
            numeroOrcamento={proximoNumero ?? undefined}
            usuarioGerador={authContext?.user?.name || undefined}
        />

        {/* Modal de Edição de Kit Unificado */}
        {showModalEditarKit && kitEmEdicao && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        solicitarFecharModalKitEdicao();
                    }
                }}
            >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-700 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-md">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Editar Kit Unificado
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                        {kitEmEdicao.item.nome} - {itensKitEdicao.length} {itensKitEdicao.length === 1 ? 'item' : 'itens'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={solicitarFecharModalKitEdicao}
                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Buscar na composição (use * ou % como coringa)
                            </label>
                            <input
                                type="text"
                                value={buscaKitEdicao}
                                onChange={(e) => setBuscaKitEdicao(e.target.value)}
                                placeholder="Ex: cabo * 70 * ver ou código parcial..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-3">
                            {itensKitEdicao.map((itemKit: any, index: number) => {
                                if (!itemKitPassaBuscaEdicao(itemKit)) return null;
                                const valorVenda = itemKit.valorVenda || 0;
                                const quantidade = itemKit.quantidade || 1;
                                const subtotal = valorVenda * quantidade;
                                const empresaKit = empresas.find(e => e.cnpj === formState.empresaCNPJ);
                                const aliquotaMaterialKit = empresaKit?.aliquotaMaterial ?? 8;
                                const custoAgregadoUnit = itemKit.custoAgregadoUnit ?? (itemKit.custoUnit ?? 0) + (valorVenda * aliquotaMaterialKit / 100);
                                const custoTotal = custoAgregadoUnit * quantidade;
                                const lucroLiquido = subtotal - custoTotal;
                                const percentualSobreVenda = subtotal > 0 ? (lucroLiquido / subtotal) * 100 : 0;
                                const tipoItem = itemKit.tipo || 'MATERIAL';
                                
                                return (
                                    <div
                                        key={index}
                                        className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Info do Item */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {itemKit.nome}
                                                    </h4>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        tipoItem === 'MATERIAL' ? 'bg-green-100 text-green-800' :
                                                        tipoItem === 'COTACAO' ? 'bg-blue-100 text-blue-800' :
                                                        tipoItem === 'SERVICO' ? 'bg-purple-100 text-purple-800' :
                                                        tipoItem === 'KIT' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {tipoItem === 'MATERIAL' && '📦 Estoque'}
                                                        {tipoItem === 'COTACAO' && '❄️ Banco Frio'}
                                                        {tipoItem === 'SERVICO' && '⚙️ Serviço'}
                                                        {tipoItem === 'KIT' && '🎁 Kit'}
                                                        {!['MATERIAL', 'COTACAO', 'SERVICO', 'KIT'].includes(tipoItem) && tipoItem}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                                                        <p className="font-medium text-gray-700 dark:text-gray-300">{itemKit.codigo || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Quantidade</p>
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            <input
                                                                type="number"
                                                                min={0.001}
                                                                step="any"
                                                                value={quantidade}
                                                                onChange={(e) => handleQuantidadeKitItemChange(index, e.target.value)}
                                                                className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                                            />
                                                            <span className="text-xs text-gray-600 dark:text-gray-400">{formatarUnidadeOrcamento(itemKit.unidadeMedida)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Valor Unit.</p>
                                                        <p className="font-semibold text-teal-700 dark:text-teal-400">
                                                            R$ {valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Subtotal</p>
                                                        <p className="font-bold text-purple-700 dark:text-purple-400">
                                                            R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-2 flex items-center gap-4 text-xs">
                                                    <span className="text-red-600 dark:text-red-400">
                                                        💵 Custo agregado: R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                        Lucro líquido: R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • {percentualSobreVenda.toFixed(1)}% sobre venda
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botões de Ação */}
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleBaixarItemParaLista(index)}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                                                    title="Baixar item para lista do orçamento"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                    </svg>
                                                    Baixar
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleRemoverItemDoKit(index)}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                                                    title="Remover item do kit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {buscaKitEdicao.trim() && itensKitEdicao.length > 0 && !itensKitEdicao.some((ik) => itemKitPassaBuscaEdicao(ik)) && (
                                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-600 rounded-xl">
                                    Nenhum item encontrado para &quot;{buscaKitEdicao}&quot;. Ajuste os coringas (* ou %) ou limpe a busca.
                                </div>
                            )}
                        </div>

                        {/* Resumo Financeiro */}
                        {itensKitEdicao.length > 0 && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded-xl border border-teal-200 dark:border-gray-600">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Custo Total (agregado)</p>
                                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                            R$ {totaisResumoKitEdicao.custoAgTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Valor de Venda Total</p>
                                        <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
                                            R$ {totaisResumoKitEdicao.vendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Lucro do Kit</p>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                            💰 R$ {totaisResumoKitEdicao.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
                        <div className="flex justify-between items-center">
                            <button
                                onClick={handleDesunificarKit}
                                className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            >
                                📦 Desunificar Kit
                            </button>
                            
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={solicitarFecharModalKitEdicao}
                                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSalvarEdicaoKit}
                                    className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg hover:from-amber-700 hover:to-amber-600 transition-all shadow-md"
                                >
                                    ✓ Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <AlertDialog open={showConfirmarCancelarEdicaoKit} onOpenChange={setShowConfirmarCancelarEdicaoKit}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se você cancelar vai perder suas mudanças, deseja sair?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel type="button">Voltar</AlertDialogCancel>
                    <AlertDialogAction
                        type="button"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={confirmarCancelarEdicaoKit}
                    >
                        Sim, sair
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};

export default NovoOrcamentoPage;
