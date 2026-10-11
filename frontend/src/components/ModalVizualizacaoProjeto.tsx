import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  serverDateToInput,
  inputDateToServer,
  formatDateDisplay,
  localYmdFromDate,
  addDaysToYmd,
  isDateStrBeforeLocalToday
} from '../utils/date';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS, getUploadUrl } from '../config/api';
import { alocacaoMateriaisService } from '../services/alocacaoMateriaisService';
import { AuthContext } from '../contexts/AuthContext';
import { isAdmin, isDeveloper } from '../utils/permissions';

import { useEscapeKey } from '../hooks/useEscapeKey';
import { useF1Key } from '../hooks/useF1Key';
import ModalApontamentoOs from './ModalApontamentoOs';
import ScrollableRow from './ui/ScrollableRow';
import { ModalDetailHeader } from './ui/ModalDetailHeader';
import { scrollableNavItemClasses, compactNavTabClasses, modalOverlayPaddingClasses, mobileTabBarStripClasses } from '../utils/responsiveNav';
import { apropriacaoOsService, type CmvOsResumo } from '../services/apropriacaoOsService';
import type { ApontamentoOs } from '../services/apropriacaoOsService';
import {
  type ResultadoOsCalculado,
} from '../utils/apropriacaoOs';
import { projetosService } from '../services/projetosService';
import { ordemServicosService } from '../services/ordemServicosService';
import OsVisaoGeralTab from './os/OsVisaoGeralTab';
import { statusBadgeClass, statusLabel } from '../utils/osStatus.util';
import {
  entregaQuadroVazia,
  exigeFormularioEntregaQuadro,
  extrairEntregaQuadro,
  isOsTipoQuadrosPainels,
  podeConcluirOsQuadros,
  validarEntregaQuadroForm,
  type EntregaQuadroMetadados,
} from '../utils/osWorkflow.util';
import OsEntregaQuadroForm from './os/OsEntregaQuadroForm';
import { listarUsuariosResponsavelOs } from '../utils/usuariosResponsavelOs.util';
import OsCronogramaAlocacaoTab from './os/OsCronogramaAlocacaoTab';
import OsResultadoTab from './os/OsResultadoTab';
import { useOsEditForm } from '../hooks/useOsEditForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import UserSearchMultiSelect from './ui/UserSearchMultiSelect';
import {
  agregarItensFaltantesParaCompra,
  montarPresetCompraAvulsaOs,
} from '../utils/compraAvulsaFaltantes';
import KitComposicaoDisponibilidadeModal, {
  type ComposicaoDisponibilidadeData,
} from './KitComposicaoDisponibilidadeModal';
import {
  createVirtualCatalogKitHeader,
  expandItensDoKitHierarquia,
  flattenKitEntityToComposicao,
  parseKitIdFromExpandKey,
  resolveComposicaoCatalogoKit,
} from '../utils/bomKitExpand';
import ModalDefinirChegada, {
  type DadosDefinirChegada,
  type ItemDefinirChegada,
} from './os/ModalDefinirChegada';
import {
  previsaoChegadaService,
  type PrevisaoChegadaMaterial,
} from '../services/previsaoChegadaService';
import {
  linhaBomAceitaChegada,
  rotuloReferenciaChegada,
  statusPrevisaoChegada,
} from '../utils/previsaoChegadaBom.util';

type ProjetoStatus = 'PROPOSTA' | 'VALIDADO' | 'APROVADO' | 'EXECUCAO' | 'CONCLUIDO';

interface ClienteRef { id: string; nome: string }
interface MaterialRef {
  id?: string;
  nome?: string;
  sku?: string;
  estoque?: number;
  unidadeMedida?: string | null;
  imagemUrl?: string | null;
  updatedAt?: string;
}

interface CotacaoRef {
  id: string;
  nome?: string;
  fornecedorNome?: string | null;
  dataAtualizacao?: string | null;
  ncm?: string | null;
  materialVinculadoId?: string | null; // ID do material do estoque vinculado
}

interface OrcamentoItemRef { 
  id: string; 
  material?: MaterialRef | null; 
  kit?: { nome?: string | null } | null; 
  servico?: { nome?: string | null } | null;
  cotacao?: CotacaoRef | null;
  quantidade?: number; 
  subtotal?: number;
  tipo?: string;
  descricao?: string | null;
  materialVinculadoId?: string | null; // Para itens do banco frio vinculados
  itensDoKit?: Array<{ nome?: string; codigo?: string; quantidade?: number; valorVenda?: number; materialId?: string; cotacaoId?: string; servicoId?: string; tipo?: string; kitId?: string; unidadeMedida?: string; subtotal?: number }>; // Kit unificado (pode ter material, cotação, serviço ou kit do catálogo)
  kit?: { id: string; nome?: string; items?: Array<{ materialId: string; quantidade: number; material?: MaterialRef }> }; // Kit do catálogo (quando item.kitId)
}
interface OrcamentoRef { id: string; status: string; precoVenda?: number; numeroSequencial?: number | null; items?: OrcamentoItemRef[] }

export interface ProjetoDetalhe {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string;
  cliente: ClienteRef;
  orcamento?: OrcamentoRef;
  status: ProjetoStatus;
  valorTotal?: number;
  createdAt?: string;
  semObra?: boolean;
  responsavelId?: string;
  responsavel?: { id: string; nome: string };
  dataInicio?: string;
  dataPrevisao?: string;
  dataConclusao?: string | null;
  dataFim?: string | null;
  concluidoPorId?: string | null;
  concluidoPor?: { id: string; nome: string } | null;
  horasEngenhariaOrcadas?: number;
  diariasEquipeOrcadas?: number;
  valorHoraEngenharia?: number | null;
  valorDiariaEquipe?: number | null;
  justificativaSemObra?: string | null;
  alocacoes?: Array<{ id: string }>;
  clienteId?: string;
  exigeVistoriaCelesc?: boolean;
  entregaQuadro?: EntregaQuadroMetadados | null;
}

type Aba = 'Visão Geral' | 'Materiais' | 'Kanban' | 'Cronograma & Alocação' | 'Resultado';

const MSG_BLOQUEIO_CONCLUSAO_ENG =
  'Essa ordem de serviço não pode ser concluída pois o projeto ainda não está concluído. Pressione a equipe de projetos!';

function mensagemErroConclusaoOs(erro?: string | null): string {
  const text = (erro || '').trim();
  if (
    text.includes('engenharia') ||
    text.includes('não pode ser concluída') ||
    text.includes('Não é possível concluir') ||
    text === 'Erro ao atualizar status do projeto' ||
    text === 'Erro ao concluir ordem de serviço'
  ) {
    if (text.length > 20 && !text.startsWith('Erro ao atualizar status')) {
      return text;
    }
    return MSG_BLOQUEIO_CONCLUSAO_ENG;
  }
  return text || 'Não foi possível concluir a ordem de serviço. Verifique os requisitos e tente novamente.';
}

interface ModalVizualizacaoProjetoProps {
  projeto: ProjetoDetalhe;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Aba;
  onRefresh?: () => void | Promise<void>; // chamado após alterações (ex: mudança de status)
  onViewBudget?: (budgetId: string) => void; // navegar para orçamento
  onViewClient?: (clientId: string) => void; // navegar para cliente
  onViewSale?: (saleId: string) => void; // navegar para venda
  onViewObra?: (obraId: string) => void; // navegar para obra
  onNavigate?: (view: string, ...args: any[]) => void; // navegar para outras páginas
  engenhariaAtribuicao?: {
    precisaEquipeEngenharia: boolean;
    atribuido: boolean;
    responsavelNome?: string | null;
    statusEngenharia?: string | null;
  };
  onAtribuirEngenharia?: () => void;
}

const TABS: Aba[] = ['Visão Geral', 'Materiais', 'Kanban', 'Cronograma & Alocação', 'Resultado'];

// Retorna os nomes dos responsáveis (suporta múltiplos)
function getNomesResponsaveisTask(task: { responsavelId?: string; responsaveisIds?: string[] }, usuariosDisponiveis: any[]): string {
  const ids = (task.responsaveisIds && task.responsaveisIds.length) ? task.responsaveisIds : (task.responsavelId ? [task.responsavelId] : []);
  if (!ids.length) return 'Não atribuído';
  const nomes = ids.map(id => usuariosDisponiveis.find((u: any) => u.id === id)?.name || id).filter(Boolean);
  return nomes.length ? nomes.join(', ') : 'Não atribuído';
}

const ModalVizualizacaoProjeto: React.FC<ModalVizualizacaoProjetoProps> = ({ projeto, isOpen, onClose, initialTab = 'Visão Geral', onRefresh, onViewBudget, onViewClient, onViewSale, onViewObra, onNavigate, engenhariaAtribuicao, onAtribuirEngenharia }) => {
  const { user } = useContext(AuthContext) || {};
  const [activeTab, setActiveTab] = useState<Aba>(initialTab);
  const [loadingAcao, setLoadingAcao] = useState(false);
  const [apontamentoOpen, setApontamentoOpen] = useState(false);
  const [resumoApropriacao, setResumoApropriacao] = useState<ResultadoOsCalculado | null>(null);
  const [apontamentosResultado, setApontamentosResultado] = useState<ApontamentoOs[]>([]);
  const [loadingApontamentosResultado, setLoadingApontamentosResultado] = useState(false);
  const [cmvOs, setCmvOs] = useState<CmvOsResumo | null>(null);
  const [loadingCmvOs, setLoadingCmvOs] = useState(false);
  const [estoqueEscapeOpen, setEstoqueEscapeOpen] = useState(false);
  const [materiaisFaltantesEstoque, setMateriaisFaltantesEstoque] = useState<
    Array<{ nome: string; necessario: number; disponivel: number; falta: number; bancoFrio?: boolean }>
  >([]);
  interface Task {
    id: string;
    titulo: string;
    descricao: string;
    status: 'A Fazer' | 'Em Andamento' | 'Concluído';
    prazo: string;
    dataInicio?: string;
    createdAt?: string;
    responsavelId?: string;
    responsaveisIds?: string[];
    responsavelNome?: string;
    criadoPorNome?: string;
    metadados?: unknown;
  }
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alterandoTipoOs, setAlterandoTipoOs] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskEditando, setTaskEditando] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    titulo: '',
    descricao: '',
    prazo: '',
    dataInicio: '',
    responsavelId: '',
    responsavelIds: [] as string[],
    status: 'A Fazer' as 'A Fazer' | 'Em Andamento' | 'Concluído',
    entregaQuadro: entregaQuadroVazia(),
  });
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<any[]>([]);
  const [kanbanSearch, setKanbanSearch] = useState('');
  const isPrivileged = useMemo(() => isAdmin(user as any) || isDeveloper(user as any), [user]);

  // Documentos
  const [documentos, setDocumentos] = useState<Array<{ id: string; nome: string; tipo: string; url: string }>>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [documentoVisualizar, setDocumentoVisualizar] = useState<{ id: string; nome: string; tipo: string; url: string } | null>(null);
  const [uploadForm, setUploadForm] = useState({ tipo: 'ART', observacoes: '', arquivo: null as File | null });
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const docIdToDeleteRef = React.useRef<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Estado para orçamento completo
  const [orcamentoCompleto, setOrcamentoCompleto] = useState<OrcamentoRef | null>(null);
  const [loadingOrcamento, setLoadingOrcamento] = useState(false);
  
  // Estado para venda vinculada
  const [vendaVinculada, setVendaVinculada] = useState<{ id: string } | null>(null);
  
  // Estado para obra vinculada
  const [obraVinculada, setObraVinculada] = useState<{ id: string; nome?: string } | null>(null);
  const [loadingObra, setLoadingObra] = useState(false);

  // Modal de visualização de cliente
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [clienteData, setClienteData] = useState<any>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);

  // AlertDialog
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: '',
    description: '',
    onConfirm: () => {}
  });
  const [aprovacaoNegadaOpen, setAprovacaoNegadaOpen] = useState(false);
  const [aprovacaoNegadaDetalhe, setAprovacaoNegadaDetalhe] = useState<string | null>(null);

  const osEdit = useOsEditForm({
    projeto: projeto as any,
    onRefresh,
  });

  const handleRequestClose = () => {
    osEdit.tryClose(onClose);
  };

  function abrirModalAprovacaoNegada(detalhe?: string) {
    setAprovacaoNegadaDetalhe(detalhe || null);
    setAprovacaoNegadaOpen(true);
  }

  const [materiaisAlocados, setMateriaisAlocados] = useState<Set<string>>(new Set()); // Set de materialIds já alocados

  // Previsão de chegada de compras (coluna "Chegada" da BOM), indexada pelo id da linha
  const [previsoesChegada, setPrevisoesChegada] = useState<Record<string, PrevisaoChegadaMaterial>>({});
  const [selecionadosChegada, setSelecionadosChegada] = useState<Set<string>>(new Set());
  const [modalChegadaItens, setModalChegadaItens] = useState<ItemDefinirChegada[] | null>(null);
  const [salvandoChegada, setSalvandoChegada] = useState(false);
  
  // Estados para vinculação de itens do banco frio
  const [vinculacoesBancoFrio, setVinculacoesBancoFrio] = useState<Record<string, string>>({}); // itemId -> materialId
  const [materiaisEstoque, setMateriaisEstoque] = useState<MaterialRef[]>([]); // Lista de materiais do estoque
  
  // IDs/keys de nós de kit que foram expandidos na aba Materiais (suporta kit raiz e kits aninhados)
  const [kitsDesunificados, setKitsDesunificados] = useState<Set<string>>(new Set());
  const [kitComposicaoPlanoCache, setKitComposicaoPlanoCache] = useState<Record<string, any[]>>({});
  const [kitsComposicaoCarregando, setKitsComposicaoCarregando] = useState<Set<string>>(new Set());
  const [kitDispCache, setKitDispCache] = useState<Record<string, ComposicaoDisponibilidadeData>>({});
  const [kitComposicaoModal, setKitComposicaoModal] = useState<{
    open: boolean;
    loading: boolean;
    data: ComposicaoDisponibilidadeData | null;
  }>({ open: false, loading: false, data: null });
  const [modalVinculacaoOpen, setModalVinculacaoOpen] = useState(false);
  const [itemParaVincular, setItemParaVincular] = useState<OrcamentoItemRef | null>(null);
  const [parentKitParaVinculacao, setParentKitParaVinculacao] = useState<OrcamentoItemRef | null>(null); // Para sub-itens de kit unificado
  const [itensDoKitIndexParaVinculacao, setItensDoKitIndexParaVinculacao] = useState<number | null>(null);
  const [buscaMaterialVinculacao, setBuscaMaterialVinculacao] = useState(''); // Busca no modal de vinculação
  const [buscaMateriaisAba, setBuscaMateriaisAba] = useState(''); // Busca na aba Materiais (filtra ao digitar)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && activeTab === 'Kanban') {
      carregarUsuarios();
      carregarTasks();
    }
    if (isOpen && activeTab === 'Materiais' && projeto.orcamento?.id) {
      carregarOrcamentoCompleto();
      carregarMateriaisEstoque(); // Sempre atualizar lista de materiais/estoque ao abrir a aba (reflete compras e entradas)
      void carregarPrevisoesChegada();
      // Garantir que a aba Materiais já saiba quais materiais tiveram baixa/alocação na OS.
      // Isso habilita o check verde em "Alocado" logo ao abrir a aba.
      if (projeto?.id) carregarObraVinculada();
    }
    if (isOpen && activeTab === 'Visão Geral' && projeto.orcamento?.id) {
      carregarOrcamentoCompleto();
    }
    if (isOpen && activeTab === 'Visão Geral') {
      carregarTasks();
      carregarObraVinculada();
      carregarDocumentos();
      void carregarResumoApropriacao();
    }
    if (isOpen && projeto?.id && (activeTab === 'Resultado' || projeto.status !== 'CANCELADO')) {
      void carregarResumoApropriacao();
    }
    if (isOpen && projeto?.id && activeTab === 'Resultado') {
      void carregarApontamentosResultado();
      void carregarCmvOs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, projeto?.id]);

  async function carregarResumoApropriacao() {
    if (!projeto?.id) return;
    try {
      const res = await apropriacaoOsService.obterResumo(projeto.id);
      if (res.success && res.data) setResumoApropriacao(res.data);
    } catch {
      /* silencioso */
    }
  }

  async function carregarCmvOs() {
    if (!projeto?.id) return;
    try {
      setLoadingCmvOs(true);
      const res = await apropriacaoOsService.obterCmv(projeto.id);
      if (res.success && res.data) setCmvOs(res.data);
    } catch {
      setCmvOs(null);
    } finally {
      setLoadingCmvOs(false);
    }
  }

  async function carregarApontamentosResultado() {
    if (!projeto?.id) return;
    try {
      setLoadingApontamentosResultado(true);
      const res = await apropriacaoOsService.listar(projeto.id, 100);
      if (res.success && Array.isArray(res.data)) {
        setApontamentosResultado(res.data);
      }
    } catch {
      setApontamentosResultado([]);
    } finally {
      setLoadingApontamentosResultado(false);
    }
  }

  const podeApontar =
    isOpen && projeto.status !== 'CANCELADO' && !apontamentoOpen;

  useF1Key(podeApontar, () => setApontamentoOpen(true));

  async function carregarUsuarios() {
    try {
      const response = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
      const todosUsuarios = (response.success && response.data) ? response.data : [];
      // Incluir todos os usuários retornados pelo backend (sem filtrar)
      const usuariosList = Array.isArray(todosUsuarios) ? todosUsuarios : [];
      setUsuariosDisponiveis(usuariosList);
      console.log('👥 Usuários carregados (todos):', usuariosList.length, usuariosList);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setUsuariosDisponiveis([]);
    }
  }

  async function carregarTasks() {
    try {
      const response = await axiosApiService.get<any[]>(`/api/projetos/${projeto.id}/tasks`);
      if (response.success && response.data && Array.isArray(response.data)) {
        // Mapear tasks do backend para o formato do frontend
        const tasksFormatadas: Task[] = response.data.map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          descricao: t.descricao || '',
          status: t.status === 'ToDo' ? 'A Fazer' : t.status === 'Doing' ? 'Em Andamento' : 'Concluído',
          prazo: t.prazo ? serverDateToInput(t.prazo) : '',
          dataInicio: t.dataInicio ? serverDateToInput(t.dataInicio) : '',
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
          responsavelId: t.responsavel || '',
          responsaveisIds: Array.isArray(t.responsaveisIds) ? t.responsaveisIds : (t.responsavel ? [t.responsavel] : []),
          criadoPorNome: t.criadoPor?.name || undefined,
          metadados: t.metadados ?? undefined,
        }));
        setTasks(tasksFormatadas);
      }
    } catch (error) {
      console.error('Erro ao carregar tasks:', error);
      setTasks([]);
    }
  }

  function getPrazoYmdParaKanban(task: Task): string {
    if (task.prazo) return serverDateToInput(task.prazo);
    if (task.createdAt) return addDaysToYmd(localYmdFromDate(new Date(task.createdAt)), 1);
    return addDaysToYmd(localYmdFromDate(new Date()), 1);
  }

  function isTaskAtrasada(task: Task): boolean {
    if (task.status === 'Concluído') return false;
    return isDateStrBeforeLocalToday(getPrazoYmdParaKanban(task));
  }

  function canSeeAtraso(task: Task): boolean {
    if (isPrivileged) return true;
    const uid = (user as any)?.id;
    if (!uid) return false;
    const ids = (task.responsaveisIds && task.responsaveisIds.length) ? task.responsaveisIds : (task.responsavelId ? [task.responsavelId] : []);
    return ids.some(id => String(id) === String(uid));
  }

  async function carregarOrcamentoCompleto() {
    if (!projeto.orcamento?.id) return;
    try {
      setLoadingOrcamento(true);
      const response = await axiosApiService.get<any>(`/api/orcamentos/${projeto.orcamento.id}`);
      if (response.success && response.data) {
        setOrcamentoCompleto(response.data);
        // Sincronizar vinculações banco frio salvas no backend (item raiz e sub-itens de kit unificado em itensDoKit)
        const items = response.data?.items || [];
        const vinculos: Record<string, string> = {};
        items.forEach((it: any) => {
          if ((it.tipo === 'COTACAO' || it.cotacaoId) && it.materialId) {
            vinculos[it.id] = it.materialId;
          }
          const arr = it.itensDoKit;
          if (Array.isArray(arr)) {
            arr.forEach((sub: any, idx: number) => {
              if (sub.cotacaoId && sub.materialVinculadoId) {
                vinculos[`${it.id}-sub-${idx}`] = sub.materialVinculadoId;
              }
            });
          }
        });
        setVinculacoesBancoFrio(vinculos);
        // Buscar venda vinculada ao orçamento
        if (response.data.vendaId) {
          setVendaVinculada({ id: response.data.vendaId });
        } else {
          // Tentar buscar venda pelo orcamentoId
          try {
            const vendasResponse = await axiosApiService.get<any>(`/api/vendas?orcamentoId=${projeto.orcamento.id}`);
            if (vendasResponse.success && vendasResponse.data) {
              // Verificar se é array ou objeto único
              const vendas = Array.isArray(vendasResponse.data) ? vendasResponse.data : [vendasResponse.data];
              if (vendas.length > 0) {
                setVendaVinculada({ id: vendas[0].id });
              }
            }
          } catch (err) {
            console.log('Nenhuma venda encontrada para este orçamento');
          }
        }
        
        // Se houver obra vinculada, carregar materiais alocados e atualizar estado
        if (obraVinculada?.id) {
          await carregarMateriaisAlocados(obraVinculada.id);
        }
        if (activeTab === 'Materiais') {
          void prefetchKitsDisponibilidade(items as OrcamentoItemRef[]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar orçamento completo:', error);
    } finally {
      setLoadingOrcamento(false);
    }
  }

  async function carregarObraVinculada() {
    try {
      setLoadingObra(true);
      const response = await axiosApiService.get<any>(`/api/obras/projeto/${projeto.id}`);
      if (response.success && response.data) {
        const data = response.data;
        const obra = {
          id: data.id,
          nome: data.nome || data.nomeObra || 'Obra vinculada',
        };
        setObraVinculada(obra);

        await carregarMateriaisAlocados(obra.id);
      } else {
        setObraVinculada(null);
        setMateriaisAlocados(new Set());
      }
    } catch (error) {
      console.error('Erro ao carregar obra vinculada:', error);
      setObraVinculada(null);
      setMateriaisAlocados(new Set());
    } finally {
      setLoadingObra(false);
    }
  }

  async function carregarMateriaisAlocados(obraId: string) {
    try {
      const response = await alocacaoMateriaisService.listarMateriaisObra(obraId);
      if (response.success && response.data) {
        // Criar um Set com os IDs dos materiais já alocados
        const materiaisIds = new Set(
          response.data.map((mov: any) => mov.materialId || mov.material?.id).filter(Boolean)
        );
        setMateriaisAlocados(materiaisIds);
        console.log(`✅ Materiais já alocados carregados: ${materiaisIds.size} materiais`);
      } else {
        setMateriaisAlocados(new Set());
      }
    } catch (error) {
      console.error('Erro ao carregar materiais alocados:', error);
      setMateriaisAlocados(new Set());
    }
  }

  function aplicarPrevisoesChegada(lista: PrevisaoChegadaMaterial[]) {
    setPrevisoesChegada(Object.fromEntries(lista.map((p) => [p.itemKey, p])));
  }

  async function carregarPrevisoesChegada() {
    if (!projeto?.id) return;
    try {
      const res = await previsaoChegadaService.listar(projeto.id);
      if (res.success && Array.isArray(res.data)) aplicarPrevisoesChegada(res.data);
    } catch (error) {
      console.error('Erro ao carregar previsões de chegada:', error);
    }
  }

  async function salvarPrevisaoChegada(dados: DadosDefinirChegada) {
    const itens = modalChegadaItens || [];
    if (!itens.length) return;
    try {
      setSalvandoChegada(true);
      const res = await previsaoChegadaService.definir(projeto.id, {
        itens: itens.map((it) => ({ itemKey: it.itemKey, descricao: it.nome, materialId: it.materialId })),
        ...dados,
      });
      if (!res.success) throw new Error(res.error || 'Não foi possível salvar a data de chegada.');
      aplicarPrevisoesChegada(res.data || []);
      setSelecionadosChegada((prev) => {
        const next = new Set(prev);
        itens.forEach((it) => next.delete(it.itemKey));
        return next;
      });
      setModalChegadaItens(null);
      toast.success('Data de chegada definida', {
        description: `${itens.length} item(ns) com chegada prevista para ${formatDateDisplay(dados.dataChegada)}.`,
      });
    } catch (error: any) {
      toast.error('Erro ao definir data de chegada', { description: error?.message });
    } finally {
      setSalvandoChegada(false);
    }
  }

  async function removerPrevisaoChegada() {
    const keys = (modalChegadaItens || []).map((it) => it.itemKey).filter((k) => previsoesChegada[k]);
    if (!keys.length) return;
    try {
      setSalvandoChegada(true);
      const res = await previsaoChegadaService.remover(projeto.id, keys);
      if (!res.success) throw new Error(res.error || 'Não foi possível remover a previsão.');
      aplicarPrevisoesChegada(res.data || []);
      setModalChegadaItens(null);
      toast.success('Previsão de chegada removida');
    } catch (error: any) {
      toast.error('Erro ao remover previsão de chegada', { description: error?.message });
    } finally {
      setSalvandoChegada(false);
    }
  }


  async function carregarCliente() {
    if (!projeto.cliente?.id) return;
    try {
      setLoadingCliente(true);
      const response = await axiosApiService.get<any>(`/api/clientes/${projeto.cliente.id}`);
      if (response.success && response.data) {
        setClienteData(response.data);
        setClienteModalOpen(true);
      } else {
        toast.error('❌ Erro ao carregar dados do cliente');
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast.error('❌ Erro ao carregar dados do cliente');
    } finally {
      setLoadingCliente(false);
    }
  }

  // Carregar materiais do estoque para vinculação
  async function carregarMateriaisEstoque() {
    try {
      const response = await axiosApiService.get<MaterialRef[]>('/api/materiais');
      if (response.success && response.data) {
        setMateriaisEstoque(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Erro ao carregar materiais do estoque:', error);
      toast.error('Erro ao carregar materiais do estoque');
    }
  }

  // Abrir modal de vinculação
  function handleAbrirVinculacao(item: OrcamentoItemRef, row?: { parentKit?: OrcamentoItemRef; itensDoKitIndex?: number }) {
    setItemParaVincular(item);
    setParentKitParaVinculacao(row?.parentKit ?? null);
    setItensDoKitIndexParaVinculacao(row?.itensDoKitIndex ?? null);
    setModalVinculacaoOpen(true);
    setBuscaMaterialVinculacao('');
    if (materiaisEstoque.length === 0) {
      carregarMateriaisEstoque();
    }
  }

  // Vincular ou alterar vinculação de item do banco frio a material do estoque (item raiz ou sub-item de kit unificado)
  async function handleVincularMaterial(materialId: string) {
    if (!itemParaVincular) return;
    const orcamentoId = projeto.orcamento?.id;
    if (!orcamentoId) return;

    try {
      const vinculacaoAtual = vinculacoesBancoFrio[itemParaVincular.id] || itemParaVincular.materialVinculadoId;
      const isAlteracao = !!vinculacaoAtual;

      let response: any;
      if (parentKitParaVinculacao != null && itensDoKitIndexParaVinculacao !== null) {
        response = await axiosApiService.put(
          `/api/orcamentos/${orcamentoId}/items/${parentKitParaVinculacao.id}/itens-do-kit/vincular`,
          { subIndex: itensDoKitIndexParaVinculacao, materialId }
        );
      } else {
        response = await axiosApiService.put(
          `/api/orcamentos/${orcamentoId}/items/${itemParaVincular.id}/vincular-material`,
          { materialId }
        );
      }

      if (response.success) {
        const materialSelecionado = materiaisEstoque.find(m => m.id === materialId);
        if (isAlteracao) {
          toast.success('✅ Vinculação alterada!', {
            description: `Material atualizado para: ${materialSelecionado?.nome || 'Material selecionado'}`
          });
        } else {
          toast.success('✅ Material vinculado!', {
            description: `${materialSelecionado?.nome || 'Material'} vinculado ao item do banco frio.`
          });
        }
        setVinculacoesBancoFrio(prev => ({ ...prev, [itemParaVincular.id]: materialId }));
        setModalVinculacaoOpen(false);
        setItemParaVincular(null);
        setParentKitParaVinculacao(null);
        setItensDoKitIndexParaVinculacao(null);
        setBuscaMaterialVinculacao('');
        await carregarOrcamentoCompleto();
      } else {
        toast.error('Erro ao vincular material', {
          description: response.error || 'Não foi possível vincular o material.'
        });
      }
    } catch (error: any) {
      console.error('Erro ao vincular material:', error);
      toast.error('Erro ao vincular material', {
        description: error?.message || 'Ocorreu um erro ao vincular.'
      });
    }
  }

  // Expansão/recolhimento de qualquer nó de kit (raiz ou aninhado)
  const fetchKitComposicaoPlano = async (kitId: string): Promise<any[]> => {
    if (kitComposicaoPlanoCache[kitId]?.length) return kitComposicaoPlanoCache[kitId];
    setKitsComposicaoCarregando((prev) => {
      if (prev.has(kitId)) return prev;
      return new Set(prev).add(kitId);
    });
    try {
      const r = await axiosApiService.get<any>(`/api/kits/${kitId}/composicao?depth=4`);
      if (r.success && r.data) {
        const flat = flattenKitEntityToComposicao(r.data, kitId);
        setKitComposicaoPlanoCache((prev) =>
          prev[kitId]?.length ? prev : { ...prev, [kitId]: flat },
        );
        return flat;
      }
    } catch (e) {
      console.error('Erro ao carregar composição do kit:', e);
    } finally {
      setKitsComposicaoCarregando((prev) => {
        const next = new Set(prev);
        next.delete(kitId);
        return next;
      });
    }
    return [];
  };

  const toggleKitDesunificado = (key: string, kitId?: string) => {
    setKitsDesunificados((prev) => {
      const next = new Set(prev);
      const adding = !next.has(key);
      if (adding) next.add(key);
      else next.delete(key);
      if (adding) {
        const idFromKey = kitId || parseKitIdFromExpandKey(key);
        if (idFromKey) {
          void fetchKitComposicaoPlano(idFromKey);
        }
      }
      return next;
    });
  };

  const cacheKeyKitDisp = (kitId: string, qtd: number, orcamentoItemId?: string) =>
    orcamentoItemId ? `item:${orcamentoItemId}` : `kit:${kitId}:${qtd}`;

  const fetchKitDisponibilidade = async (
    kitId: string,
    quantidade: number,
    orcamentoItemId?: string,
  ): Promise<ComposicaoDisponibilidadeData | null> => {
    const key = cacheKeyKitDisp(kitId, quantidade, orcamentoItemId);
    if (kitDispCache[key]) return kitDispCache[key];
    try {
      let data: ComposicaoDisponibilidadeData | null = null;
      if (orcamentoItemId && projeto.id) {
        const r = await axiosApiService.get<ComposicaoDisponibilidadeData>(
          `/api/projetos/${projeto.id}/bom/itens/${orcamentoItemId}/kit-disponibilidade`,
        );
        if (r.success && r.data) data = r.data as ComposicaoDisponibilidadeData;
      }
      if (!data) {
        const r = await axiosApiService.get<ComposicaoDisponibilidadeData>(
          `/api/kits/${kitId}/composicao-disponibilidade?quantidade=${quantidade}`,
        );
        if (r.success && r.data) data = r.data as ComposicaoDisponibilidadeData;
      }
      if (data) {
        setKitDispCache((prev) => ({ ...prev, [key]: data }));
      }
      return data;
    } catch (e) {
      console.error('Erro ao verificar kit:', e);
      return null;
    }
  };

  const collectKitsParaDisponibilidade = (itensSource: OrcamentoItemRef[]) => {
    const jobs: Array<{ kitId: string; qtd: number; orcamentoItemId?: string }> = [];
    const seen = new Set<string>();

    const add = (kitId: string, qtd: number, orcamentoItemId?: string) => {
      const key = orcamentoItemId ? `item:${orcamentoItemId}` : `kit:${kitId}:${qtd}`;
      if (seen.has(key)) return;
      seen.add(key);
      jobs.push({ kitId, qtd, orcamentoItemId });
    };

    for (const item of itensSource) {
      if ((item.tipo || '').toUpperCase() === 'KIT' && item.kitId) {
        const qtd = Number(item.quantidade) || 1;
        add(item.kitId, qtd, item.id);
      }
      const subs = Array.isArray((item as any).itensDoKit) ? (item as any).itensDoKit : [];
      const multPai = Number(item.quantidade) || 1;
      for (const sub of subs) {
        if (sub?.kitId && String(sub.tipo || '').toUpperCase() === 'KIT') {
          add(sub.kitId, (Number(sub.quantidade) || 1) * multPai);
        }
      }
    }
    return jobs;
  };

  const prefetchKitsDisponibilidade = async (itensSource?: OrcamentoItemRef[]) => {
    const itens = (itensSource ||
      orcamentoCompleto?.items ||
      projeto.orcamento?.items ||
      []) as OrcamentoItemRef[];
    const jobs = collectKitsParaDisponibilidade(itens).map(({ kitId, qtd, orcamentoItemId }) =>
      fetchKitDisponibilidade(kitId, qtd, orcamentoItemId).then(() => undefined),
    );
    await Promise.allSettled(jobs);
  };

  const abrirComposicaoKit = async (
    kitId: string,
    quantidade: number,
    orcamentoItemId?: string,
  ) => {
    setKitComposicaoModal({ open: true, loading: true, data: null });
    const data = await fetchKitDisponibilidade(kitId, quantidade, orcamentoItemId);
    setKitComposicaoModal({ open: true, loading: false, data });
  };

  // Itens planos para exibição: expande kits (unificado e catálogo) desunificados; serviços não contam estoque e não entram no PDF
  const itensParaExibicao = useMemo(() => {
    const itens = (orcamentoCompleto?.items || projeto.orcamento?.items || []) as OrcamentoItemRef[];
    const resultado: Array<{ item: OrcamentoItemRef & { material?: MaterialRef | null; cotacao?: CotacaoRef | null }; isSubItem: boolean; parentKit?: OrcamentoItemRef; isFirstSubItem?: boolean; itensDoKitIndex?: number; expandKey?: string }> = [];

    const ehKitUnificado = (i: OrcamentoItemRef) => (i.tipo || '').toUpperCase() === 'KIT' && !i.kitId && (i as any).itensDoKit && Array.isArray((i as any).itensDoKit) && (i as any).itensDoKit.length > 0;
    const ehKitCatalogo = (i: OrcamentoItemRef) =>
      (i.tipo || '').toUpperCase() === 'KIT' && !!(i as any).kitId;

    for (const item of itens) {
      const desunificadoUnificado = ehKitUnificado(item) && kitsDesunificados.has(item.id);
      const desunificadoCatalogo = ehKitCatalogo(item) && kitsDesunificados.has(item.id);

      if (desunificadoUnificado) {
        // Kit unificado (criado no orçamento): expandir itensDoKit; reconhecer serviço (não contabiliza estoque)
        const qtdKit = Number(item.quantidade ?? 1);
        const arr = (item as any).itensDoKit as any[];
        let subIdx = 0;
        for (let i = 0; i < arr.length; i++) {
          const sub = arr[i];
          const subKitId = sub.kitId;
          const ehServico = !!(sub.servicoId || ((sub.tipo || '').toUpperCase() === 'SERVICO'));
          if (subKitId) {
            const qtdSubKit = (Number(sub.quantidade) || 1) * qtdKit;
            const composicaoSub = resolveComposicaoCatalogoKit(
              sub,
              subKitId,
              itens as any[],
              kitComposicaoPlanoCache,
            );
            const { item: headerItem, expandKey } = createVirtualCatalogKitHeader({
              parentItemId: item.id,
              sub,
              subKitId,
              qtdKitMult: qtdKit,
              itensDoKit: composicaoSub,
            });
            resultado.push({
              item: headerItem as OrcamentoItemRef,
              isSubItem: true,
              parentKit: item,
              isFirstSubItem: i === 0,
              expandKey,
            });
            if (kitsDesunificados.has(expandKey) && composicaoSub.length > 0) {
              const nested = expandItensDoKitHierarquia({
                composicao: composicaoSub,
                rootKitId: subKitId,
                parentOrcamentoItem: item as any,
                parentKitForRows: headerItem,
                qtdKitMult: qtdSubKit,
                kitsDesunificados,
                materiaisEstoque,
                idPrefix: `${item.id}-sub-${subKitId}`,
              });
              for (const row of nested) {
                resultado.push(row as typeof resultado[0]);
              }
            }
          } else {
            const qtdSub = (sub.quantidade ?? 1) * qtdKit;
            const materialRef = sub.materialId ? materiaisEstoque.find(m => m.id === sub.materialId) : null;
            const syntheticId = `${item.id}-sub-${i}`; // ID estável para persistir vinculação (parentId-sub-índice em itensDoKit)
            const virtualItem: OrcamentoItemRef & { material?: MaterialRef | null; cotacao?: CotacaoRef | null; codigo?: string; servico?: { nome?: string } } = {
              id: syntheticId,
              quantidade: qtdSub,
              subtotal: (sub.subtotal ?? (sub.valorVenda ?? 0) * (sub.quantidade ?? 1)) * qtdKit,
              tipo: ehServico ? 'SERVICO' : sub.materialId ? 'MATERIAL' : sub.cotacaoId ? 'COTACAO' : 'MATERIAL',
              descricao: sub.nome,
              material: materialRef || undefined,
              materialVinculadoId: sub.materialVinculadoId || null,
              cotacao: sub.cotacaoId ? { 
                id: sub.cotacaoId, 
                nome: sub.nome, 
                ncm: sub.ncm || sub.codigo || undefined 
              } : undefined,
              cotacaoId: sub.cotacaoId || undefined,
              codigo: sub.codigo || sub.sku,
              servico: ehServico ? { nome: sub.nome } : undefined
            };
            resultado.push({ item: virtualItem, isSubItem: true, parentKit: item, isFirstSubItem: i === 0, itensDoKitIndex: i });
          }
        }
      } else if (desunificadoCatalogo) {
        const qtdKit = Number(item.quantidade ?? 1);
        const kitIdRoot = String((item as any).kitId);
        let composicao = Array.isArray((item as any).itensDoKit)
          ? ((item as any).itensDoKit as any[])
          : [];
        if (composicao.length === 0 && (item as any).kit) {
          composicao = flattenKitEntityToComposicao((item as any).kit, kitIdRoot);
        }
        if (composicao.length === 0 && kitComposicaoPlanoCache[kitIdRoot]?.length) {
          composicao = kitComposicaoPlanoCache[kitIdRoot];
        }
        const nested = expandItensDoKitHierarquia({
          composicao,
          rootKitId: kitIdRoot,
          parentOrcamentoItem: item as any,
          parentKitForRows: item as any,
          qtdKitMult: qtdKit,
          kitsDesunificados,
          materiaisEstoque,
          idPrefix: `${item.id}-cat`,
        });
        for (const row of nested) {
          resultado.push(row as typeof resultado[0]);
        }
      } else {
        resultado.push({ item, isSubItem: false });
      }
    }
    return resultado;
  }, [orcamentoCompleto?.items, projeto.orcamento?.items, kitsDesunificados, materiaisEstoque, kitComposicaoPlanoCache]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'Materiais') return;
    const itens = (orcamentoCompleto?.items || projeto.orcamento?.items) as OrcamentoItemRef[] | undefined;
    if (!itens?.length) return;
    void prefetchKitsDisponibilidade(itens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, orcamentoCompleto?.items, projeto.orcamento?.items, kitsDesunificados]);

  // Lista filtrada pela busca da aba Materiais (cada caractere digitado filtra em tempo real)
  const itensFiltradosPorBusca = useMemo(() => {
    const termo = (buscaMateriaisAba || '').trim().toLowerCase();
    if (!termo) return itensParaExibicao;
    return itensParaExibicao.filter(row => {
      const item = row.item;
      const nome = (item.material?.nome || item.kit?.nome || item.cotacao?.nome || item.descricao || item.servico?.nome || '').toLowerCase();
      const sku = (item.material?.sku ?? (item as any).codigo ?? '').toString().toLowerCase();
      const ncm = (item.material?.ncm ?? item.cotacao?.ncm ?? '').toString().toLowerCase();
      return nome.includes(termo) || sku.includes(termo) || ncm.includes(termo);
    });
  }, [itensParaExibicao, buscaMateriaisAba]);

  const linhaJaAlocada = (item: OrcamentoItemRef) => !!(item.material?.id && materiaisAlocados.has(item.material.id));
  const linhaPodeDefinirChegada = (item: OrcamentoItemRef) => linhaBomAceitaChegada(item) && !linhaJaAlocada(item);
  const itemChegadaDaLinha = (item: OrcamentoItemRef): ItemDefinirChegada => ({
    itemKey: item.id,
    nome: item.material?.nome || item.cotacao?.nome || item.descricao || 'Item sem identificação',
    materialId: item.material?.id || vinculacoesBancoFrio[item.id] || item.materialVinculadoId || null,
  });

  const itensChegadaVisiveis = itensFiltradosPorBusca
    .filter((row) => linhaPodeDefinirChegada(row.item))
    .map((row) => itemChegadaDaLinha(row.item));
  // Seleção sobrevive à busca, mas some se o kit for recolhido (linha deixa de existir)
  const itensChegadaSelecionados = itensParaExibicao
    .filter((row) => selecionadosChegada.has(row.item.id) && linhaPodeDefinirChegada(row.item))
    .map((row) => itemChegadaDaLinha(row.item));
  const qtdVisiveisSelecionados = itensChegadaVisiveis.filter((it) => selecionadosChegada.has(it.itemKey)).length;
  const todosVisiveisSelecionados =
    itensChegadaVisiveis.length > 0 && qtdVisiveisSelecionados === itensChegadaVisiveis.length;
  const hojeYmdChegada = localYmdFromDate(new Date());

  function toggleSelecionadoChegada(itemKey: string) {
    setSelecionadosChegada((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  }

  function toggleSelecionarTodosChegada() {
    setSelecionadosChegada((prev) => {
      const next = new Set(prev);
      itensChegadaVisiveis.forEach((it) => {
        if (todosVisiveisSelecionados) next.delete(it.itemKey);
        else next.add(it.itemKey);
      });
      return next;
    });
  }

  function handleComprarFaltantes() {
    const items = agregarItensFaltantesParaCompra(kitDispCache, itensParaExibicao, {
      vinculacoesBancoFrio,
      materiaisEstoque,
    });

    if (items.length === 0) {
      toast.info('Nenhum item pendente', {
        description: 'Todos os materiais estão com estoque suficiente.',
      });
      return;
    }

    const numeroOS = (projeto as any).orcamento?.numeroSequencial;
    const preset = montarPresetCompraAvulsaOs({
      projetoId: projeto.id,
      projetoTitulo: projeto.titulo,
      clienteNome: projeto.cliente?.nome,
      numeroSequencial: numeroOS,
      items,
    });

    sessionStorage.setItem('s3e_compra_avulsa_preset', JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent('s3e-navigate-compras-avulsa'));
    toast.success('Abrindo compra avulsa', {
      description: `${items.length} item(ns) sugeridos para esta OS.`,
    });
  }

  // Gerar PDF com lista de itens com estoque insuficiente (para solicitação de compra)
  async function handleGerarPDFItensFaltantes() {
    let toastId: string | number | undefined;
    try {
      const hasEstoqueInsuficienteParaLinha = (row: typeof itensParaExibicao[number]) => {
        const item = row.item;
        const tipoItem = String(item.tipo || '').toUpperCase();
        const isServico = tipoItem === 'SERVICO' || !!item.servico;
        if (isServico) return false;

        if (!!(item as any).vendaDiretaFornecedor) return false;

        const quantidadeNecessaria = Number(item.quantidade ?? 0);
        if (quantidadeNecessaria <= 0) return false;

        const isBancoFrio = tipoItem === 'COTACAO' || !!item.cotacao || !!item.cotacaoId;
        const materialVinculadoId = vinculacoesBancoFrio[item.id] || item.materialVinculadoId;

        // Banco frio sem vinculação sempre precisa de ação
        if (isBancoFrio && !materialVinculadoId) return true;

        const isKit = tipoItem === 'KIT';
        const kitIdCatalogo = (item as any).kitId as string | undefined;
        if (isKit && kitIdCatalogo) {
          const dispKey = cacheKeyKitDisp(
            kitIdCatalogo,
            quantidadeNecessaria || 1,
            row.isSubItem ? undefined : item.id,
          );
          const kitDispInfo = kitDispCache[dispKey] ?? null;
          if (kitDispInfo) {
            // Kit de catálogo completo NÃO deve entrar no PDF de faltantes
            return !kitDispInfo.completo;
          }
        }

        const materialVinculado = materialVinculadoId
          ? materiaisEstoque.find((m) => m.id === materialVinculadoId)
          : null;
        const estoqueDisponivel = materialVinculado
          ? Number(materialVinculado.estoque ?? 0)
          : (isBancoFrio ? 0 : Number(item.material?.estoque ?? 0));

        return estoqueDisponivel < quantidadeNecessaria;
      };

      // Usar a mesma lista plana da tabela (inclui sub-itens de kits desunificados)
      // Regra: mostrar todos com estoque insuficiente + todos os itens do banco frio não vinculados
      const itensComEstoqueInsuficiente = itensParaExibicao
        .filter((row) => hasEstoqueInsuficienteParaLinha(row))
        .map(row => {
          const item = row.item;
          const isBancoFrio = (item.tipo || '').toUpperCase() === 'COTACAO' || !!item.cotacao || !!item.cotacaoId;
          const materialVinculadoId = vinculacoesBancoFrio[item.id] || item.materialVinculadoId;
          const materialVinculado = materialVinculadoId ? materiaisEstoque.find(m => m.id === materialVinculadoId) : null;
          
          // Para itens do banco frio não vinculados, garantir que estoque = 0
          const estoqueDisponivel = isBancoFrio && !materialVinculadoId 
            ? 0 // Banco frio não vinculado = sempre sem estoque
            : materialVinculado 
              ? Number(materialVinculado.estoque ?? 0) 
              : Number(item.material?.estoque ?? 0);

          const nomeItem = item.material?.nome || item.kit?.nome || item.cotacao?.nome || item.descricao || 'Item sem identificação';
          
          // Log para debug
          if (isBancoFrio) {
            console.log(`📋 PDF: ${materialVinculadoId ? '🔗 VINCULADO' : '❄️ BANCO FRIO'} - ${nomeItem} (Estoque: ${estoqueDisponivel})`);
          }

          return {
            id: item.id,
            nome: nomeItem,
            quantidade: item.quantidade,
            estoqueDisponivel,
            sku: item.material?.sku || item.codigo,
            ncm: item.cotacao?.ncm || item.material?.ncm,
            // Campos extras para debug se necessário
            isBancoFrio,
            materialVinculadoId,
            tipo: item.tipo
          };
        });

      // Debug: Mostrar resumo dos itens que serão incluídos no PDF
      const resumoItens = {
        total: itensComEstoqueInsuficiente.length,
        bancoFrioNaoVinculado: itensComEstoqueInsuficiente.filter(i => i.isBancoFrio && !i.materialVinculadoId).length,
        bancoFrioVinculado: itensComEstoqueInsuficiente.filter(i => i.isBancoFrio && i.materialVinculadoId).length,
        materiaisNormais: itensComEstoqueInsuficiente.filter(i => !i.isBancoFrio).length
      };
      console.log('📋 RESUMO PDF ITENS FALTANTES:', resumoItens);
      console.log('📋 ITENS INCLUÍDOS:', itensComEstoqueInsuficiente.map(i => `${i.nome} (${i.isBancoFrio ? 'Banco Frio' : 'Material'}) - Estoque: ${i.estoqueDisponivel}`));

      if (itensComEstoqueInsuficiente.length === 0) {
        toast.success('✅ Estoque OK', {
          description: 'Não há materiais com estoque insuficiente. Todos os itens possuem quantidade disponível!'
        });
        return;
      }

      const numeroOS = (projeto as any).orcamento?.numeroSequencial ?? projeto.id?.substring(0, 8) ?? 'N/A';
      const userName = user?.name ?? 'Usuário';
      const userRole = user?.role ?? 'Usuário';

      toastId = toast.loading('Gerando PDF...', { description: 'Aguarde, abrindo em instantes.' });

      const blob = await axiosApiService.postBlob(
        `/api/projetos/${projeto.id}/pdf-itens-faltantes`,
        {
          itens: itensComEstoqueInsuficiente.map(item => ({
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            estoqueDisponivel: item.estoqueDisponivel,
            sku: item.sku,
            ncm: item.ncm
          })),
          numeroOS: String(numeroOS),
          userName,
          userRole
        }
      );

      toast.dismiss(toastId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('PDF gerado com sucesso!', {
        description: `Solicitação de compra com ${itensComEstoqueInsuficiente.length} item(ns) com estoque insuficiente.`
      });
      // Liberar o blob URL após um delay (nova aba já carregou)
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      if (toastId != null) toast.dismiss(toastId);
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF', {
        description: error?.message || 'Não foi possível gerar o PDF.'
      });
    }
  }

  async function carregarDocumentos() {
    try {
      const response = await axiosApiService.get<any[]>(`/api/projetos/${projeto.id}/documentos`);
      if (response.success && response.data) {
        const docs = Array.isArray(response.data) ? response.data : [];
        // URL base da API deve vir do VITE_API_URL (produção)
        const baseUrl = import.meta.env.VITE_API_URL;
        if (!baseUrl) {
          console.error('VITE_API_URL não está definido. Configure a URL da API para produção.');
        }

        // Obter token do localStorage para passar na URL
        const token = localStorage.getItem('token');
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

        setDocumentos(
          docs.map((doc: any) => ({
            id: doc.id,
            nome: doc.nome,
            tipo: doc.tipo,
            url: `${baseUrl || ''}/api/projetos/${projeto.id}/documentos/${doc.id}/visualizar${tokenParam}`
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setDocumentos([]);
    }
  }

  async function handleUploadDocumento(e: React.FormEvent) {
    e.preventDefault();
    
    if (!uploadForm.arquivo) {
      toast.error('Selecione um arquivo');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('arquivo', uploadForm.arquivo);
      formData.append('tipo', uploadForm.tipo);
      if (uploadForm.observacoes) {
        formData.append('observacoes', uploadForm.observacoes);
      }

      const response = await axiosApiService.post(`/api/projetos/${projeto.id}/documentos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.success) {
        toast.success('✅ Documento enviado com sucesso!');
        setUploadModalOpen(false);
        setUploadForm({ tipo: 'ART', observacoes: '', arquivo: null });
        await carregarDocumentos();
        if (onRefresh) onRefresh();
      } else {
        toast.error('❌ Erro ao enviar documento', {
          description: response.error || 'Tente novamente'
        });
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('❌ Erro ao enviar documento', {
        description: error.message || 'Tente novamente'
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleExcluirDocumento(docId: string) {
    try {
      setDeletingDocId(docId);
      const response = await axiosApiService.delete(`/api/projetos/${projeto.id}/documentos/${docId}`);
      if (response.success) {
        toast.success('✅ Documento excluído com sucesso!');
        await carregarDocumentos();
        if (onRefresh) onRefresh();
      } else {
        toast.error('❌ Erro ao excluir documento', {
          description: (response as any).error || 'Tente novamente'
        });
      }
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast.error('❌ Erro ao excluir documento', {
        description: error?.response?.data?.error || error?.message || 'Tente novamente'
      });
    } finally {
      setDeletingDocId(null);
    }
  }

  const podeGerarObra = useMemo(() => projeto.status === 'APROVADO', [projeto.status]);
  const podeAprovar = useMemo(
    () => projeto.status === 'PROPOSTA' || projeto.status === 'VALIDADO',
    [projeto.status]
  );
  const podeVoltarParaAprovada = useMemo(
    () => projeto.status === 'CONCLUIDO' && String(user?.role || '').toLowerCase() !== 'eletricista',
    [projeto.status, user?.role]
  );
  const podeRemoverObra = useMemo(() => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'eletricista' || projeto.status === 'CANCELADO') return false;
    const temAlocacao = Array.isArray(projeto.alocacoes) && projeto.alocacoes.length > 0;
    return !projeto.semObra || Boolean(obraVinculada) || temAlocacao;
  }, [user?.role, projeto.status, projeto.semObra, projeto.alocacoes, obraVinculada]);

  async function handleVoltarParaAprovada() {
    setAlertConfig({
      title: 'Voltar para Aprovada',
      description:
        'A OS voltará ao status Aprovada. A obra vinculada será removida e o estoque alocado será estornado. Deseja continuar?',
      onConfirm: async () => {
        try {
          setLoadingAcao(true);
          const response = await ordemServicosService.reverterStatus(projeto.id, 'APROVADO');
          if (response.success) {
            toast.success('OS revertida para Aprovada');
            if (onRefresh) onRefresh();
          } else {
            toast.error(response.error || 'Erro ao reverter status');
          }
        } catch (error: any) {
          toast.error(error?.response?.data?.error || error?.message || 'Erro ao reverter status');
        } finally {
          setLoadingAcao(false);
        }
      },
    });
    setAlertOpen(true);
  }

  async function handleAprovarProjeto() {
    setAlertConfig({
      title: '🎉 Aprovar OS',
      description: 'Deseja aprovar esta ordem de serviço? Em seguida você poderá iniciar a obra. A baixa de estoque (parcial se necessário) ocorre ao iniciar a obra.',
      onConfirm: async () => {
        try {
          setLoadingAcao(true);
          const response = await axiosApiService.put(`${ENDPOINTS.PROJETOS}/${projeto.id}/status`, { status: 'APROVADO' });
          
          if (response.success) {
            toast.success('🎉 OS aprovada com sucesso!', {
              description: 'Clique em "Iniciar obra" quando quiser alocar materiais e criar a obra.'
            });
            if (onRefresh) onRefresh();
          } else {
            toast.error('❌ Erro ao aprovar OS', {
              description: response.error || 'Erro ao aprovar projeto'
            });
          }
        } catch (error: any) {
          const mensagemErro = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erro desconhecido';
          toast.error('❌ Erro ao aprovar OS', {
            description: mensagemErro
          });
        } finally {
          setLoadingAcao(false);
        }
      }
    });
    setAlertOpen(true);
  }

  async function handleGerarObra() {
    try {
      setLoadingAcao(true);
      const response = (await projetosService.atualizarStatus(projeto.id, 'EXECUCAO')) as {
        success: boolean;
        error?: string;
      };
      if (response.success) {
        toast.success('Obra iniciada — OS em execução');
        if (onRefresh) await onRefresh();
        setActiveTab('Kanban');
      } else {
        toast.error(response.error || 'Erro ao iniciar obra');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao iniciar obra');
    } finally {
      setLoadingAcao(false);
    }
  }

  async function handleIniciarSemEstoque() {
    try {
      setLoadingAcao(true);
      await projetosService.atualizarStatus(projeto.id, 'EXECUCAO', true);
      toast.warning('Obra iniciada sem materiais em estoque');
      setEstoqueEscapeOpen(false);
      if (onRefresh) await onRefresh();
      setActiveTab('Kanban');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao iniciar sem estoque');
    } finally {
      setLoadingAcao(false);
    }
  }

  // Fechar modais com ESC
  useEscapeKey(taskModalOpen, () => setTaskModalOpen(false));
  useEscapeKey(uploadModalOpen, () => setUploadModalOpen(false));
  useEscapeKey(clienteModalOpen, () => setClienteModalOpen(false));
  useEscapeKey(
    isOpen && !taskModalOpen && !uploadModalOpen && !clienteModalOpen && !osEdit.dirtyDialogOpen,
    handleRequestClose,
  );

  async function handleAlterarTipoOs(novoTipo: string) {
    if (projeto.status === 'CONCLUIDO' || novoTipo === projeto.tipo) return;
    setAlterandoTipoOs(true);
    try {
      const response = await projetosService.atualizar(projeto.id, { tipo: novoTipo });
      if (response.success) {
        const criadas = (response as { tasksWorkflowCriadas?: number }).tasksWorkflowCriadas ?? 0;
        toast.success(
          criadas > 0
            ? `Tipo atualizado. ${criadas} tarefa(s) adicionadas ao Kanban.`
            : 'Tipo da ordem de serviço atualizado.',
        );
        if (onRefresh) await onRefresh();
        await carregarTasks();
        if (criadas > 0) setActiveTab('Kanban');
      } else {
        toast.error(response.error || 'Erro ao alterar tipo da OS');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Erro ao alterar tipo da OS';
      toast.error(message);
    } finally {
      setAlterandoTipoOs(false);
    }
  }

  // Funções de Tasks
  async function carregarEntregaQuadroSalva(): Promise<EntregaQuadroMetadados | null> {
    try {
      const res = await axiosApiService.get(`/api/projetos/${projeto.id}/entrega-quadro`);
      if (res.success && res.data?.entrega) {
        return {
          ...entregaQuadroVazia(),
          ...res.data.entrega,
          romaneio: {
            ...entregaQuadroVazia().romaneio,
            ...(res.data.entrega.romaneio || {}),
          },
        };
      }
    } catch {
      /* fallback */
    }
    if (projeto.entregaQuadro) {
      return {
        ...entregaQuadroVazia(),
        ...projeto.entregaQuadro,
        romaneio: {
          ...entregaQuadroVazia().romaneio,
          ...(projeto.entregaQuadro.romaneio || {}),
        },
      };
    }
    return null;
  }

  async function handleAbrirModalTask(task?: Task) {
    if (task) {
      setTaskEditando(task);
      const ids = (task.responsaveisIds && task.responsaveisIds.length) ? task.responsaveisIds : (task.responsavelId ? [task.responsavelId] : []);
      let entregaForm = entregaQuadroVazia();
      if (exigeFormularioEntregaQuadro(projeto.tipo, task.titulo)) {
        const daTask = extrairEntregaQuadro(task.metadados);
        const salva = await carregarEntregaQuadroSalva();
        entregaForm = {
          ...entregaQuadroVazia(),
          ...(daTask || {}),
          ...(salva || {}),
          romaneio: {
            ...entregaQuadroVazia().romaneio,
            ...(daTask?.romaneio || {}),
            ...(salva?.romaneio || {}),
          },
        };
      }
      setTaskForm({
        titulo: task.titulo,
        descricao: task.descricao,
        prazo:
          task.prazo ||
          addDaysToYmd(localYmdFromDate(new Date(task.createdAt || new Date().toISOString())), 1),
        dataInicio: task.dataInicio || localYmdFromDate(new Date()),
        responsavelId: ids[0] || '',
        responsavelIds: ids,
        status: task.status,
        entregaQuadro: entregaForm,
      });
    } else {
      setTaskEditando(null);
      setTaskForm({
        titulo: '',
        descricao: '',
        prazo: '',
        dataInicio: localYmdFromDate(new Date()),
        responsavelId: '',
        responsavelIds: [],
        status: 'A Fazer',
        entregaQuadro: entregaQuadroVazia(),
      });
    }
    setTaskModalOpen(true);
  }

  async function handleSalvarTask() {
    if (!taskForm.titulo || !taskForm.descricao) {
      toast.error('❌ Preencha todos os campos obrigatórios');
      return;
    }

    const tituloEfetivo = taskForm.titulo;
    const exigeEntrega = exigeFormularioEntregaQuadro(projeto.tipo, tituloEfetivo);
    const statusBackend = taskForm.status === 'A Fazer' ? 'ToDo' : taskForm.status === 'Em Andamento' ? 'Doing' : 'Done';

    if (exigeEntrega && statusBackend === 'Done') {
      const erroEntrega = validarEntregaQuadroForm(taskForm.entregaQuadro);
      if (erroEntrega) {
        toast.error(erroEntrega);
        return;
      }
    }

    const responsaveis = (taskForm.responsavelIds && taskForm.responsavelIds.length) ? taskForm.responsavelIds : (taskForm.responsavelId ? [taskForm.responsavelId] : []);
    const prazoEfetivo = taskForm.prazo || addDaysToYmd(localYmdFromDate(new Date()), 1);
    const payloadBase: Record<string, unknown> = {
      titulo: taskForm.titulo,
      descricao: taskForm.descricao,
      prazo: prazoEfetivo,
      dataInicio: taskForm.dataInicio || null,
      status: statusBackend,
      responsaveis: responsaveis.length ? responsaveis : undefined,
    };
    if (exigeEntrega) {
      payloadBase.metadados = { entregaQuadro: taskForm.entregaQuadro };
      try {
        await axiosApiService.put(`/api/projetos/${projeto.id}/entrega-quadro`, {
          entrega: taskForm.entregaQuadro,
        });
      } catch (err: any) {
        toast.error(err?.message || 'Erro ao salvar dados de entrega do quadro');
        return;
      }
    }

    try {
      if (taskEditando) {
        const response = await axiosApiService.put(`/api/projetos/${projeto.id}/tasks/${taskEditando.id}`, payloadBase);

        if (response.success) {
          toast.success('✅ Tarefa atualizada com sucesso!');
          await carregarTasks(); // Recarregar tasks do backend
        } else {
          toast.error('❌ Erro ao atualizar tarefa');
        }
      } else {
        const response = await axiosApiService.post(`/api/projetos/${projeto.id}/tasks`, {
          ...payloadBase,
          dataInicio: taskForm.dataInicio || undefined,
        });

        if (response.success) {
          toast.success('✅ Tarefa criada com sucesso!');
          await carregarTasks(); // Recarregar tasks do backend
        } else {
          toast.error('❌ Erro ao criar tarefa');
        }
      }

      setTaskModalOpen(false);
      setTaskEditando(null);
      setTaskForm({
        titulo: '',
        descricao: '',
        prazo: '',
        dataInicio: localYmdFromDate(new Date()),
        responsavelId: '',
        responsavelIds: [],
        status: 'A Fazer',
        entregaQuadro: entregaQuadroVazia(),
      });
    } catch (error: any) {
      console.error('Erro ao salvar task:', error);
      toast.error('❌ Erro ao salvar tarefa: ' + (error.response?.data?.message || error.message || 'Erro desconhecido'));
    }
  }

  async function handleMoverTask(taskId: string, novoStatus: 'A Fazer' | 'Em Andamento' | 'Concluído') {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (
      novoStatus === 'Concluído' &&
      exigeFormularioEntregaQuadro(projeto.tipo, task.titulo)
    ) {
      const salva = await carregarEntregaQuadroSalva();
      const daTask = extrairEntregaQuadro(task.metadados);
      const entrega = {
        ...entregaQuadroVazia(),
        ...(daTask || {}),
        ...(salva || {}),
      };
      const erro = validarEntregaQuadroForm(entrega);
      if (erro) {
        toast.info('Complete o checklist de entrega do quadro antes de concluir a tarefa.');
        setTaskEditando(task);
        const ids = (task.responsaveisIds && task.responsaveisIds.length) ? task.responsaveisIds : (task.responsavelId ? [task.responsavelId] : []);
        setTaskForm({
          titulo: task.titulo,
          descricao: task.descricao,
          prazo:
            task.prazo ||
            addDaysToYmd(localYmdFromDate(new Date(task.createdAt || new Date().toISOString())), 1),
          dataInicio: task.dataInicio || localYmdFromDate(new Date()),
          responsavelId: ids[0] || '',
          responsavelIds: ids,
          status: 'Concluído',
          entregaQuadro: entrega,
        });
        setTaskModalOpen(true);
        return;
      }
    }

    // Mapear status do frontend para o backend
    const statusBackend = novoStatus === 'A Fazer' ? 'ToDo' : novoStatus === 'Em Andamento' ? 'Doing' : 'Done';
    
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const response = await axiosApiService.put(`/api/projetos/${projeto.id}/tasks/${taskId}`, {
        status: statusBackend
      });

      if (response.success) {
        await carregarTasks(); // Recarregar tasks do backend
      } else {
        toast.error('❌ Erro ao mover tarefa');
      }
    } catch (error: any) {
      console.error('Erro ao mover task:', error);
      toast.error('❌ Erro ao mover tarefa: ' + (error.message || 'Erro desconhecido'));
    }
  }

  function handleExcluirTask(taskId: string) {
    setAlertConfig({
      title: '🗑️ Excluir Tarefa',
      description: 'Deseja realmente excluir esta tarefa? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const response = await axiosApiService.delete(`/api/projetos/${projeto.id}/tasks/${taskId}`);
          if (response.success) {
            toast.success('✅ Tarefa excluída com sucesso!');
            await carregarTasks(); // Recarregar tasks do backend
          } else {
            toast.error('❌ Erro ao excluir tarefa');
          }
        } catch (error: any) {
          console.error('Erro ao excluir task:', error);
          toast.error('❌ Erro ao excluir tarefa: ' + (error.message || 'Erro desconhecido'));
        }
      }
    });
    setAlertOpen(true);
  }

  // Calcular progresso do projeto baseado em Tasks Kanban + Obras
  const progressoProjeto = useMemo(() => {
    // Tasks concluídas
    const tasksTotal = tasks.length;
    const tasksConcluidas = tasks.filter(t => t.status === 'Concluído').length;

    // Obras concluídas (simulado - será integrado com o backend)
    // Quando projeto.semObra === true, ignoramos obras na conta de progresso
    const obrasTotal = projeto.semObra ? 0 : (projeto.status === 'EXECUCAO' || projeto.status === 'CONCLUIDO' ? 1 : 0);
    const obrasConcluidas = projeto.semObra ? 0 : (projeto.status === 'CONCLUIDO' ? 1 : 0);

    // Calcular totais
    const totalItens = tasksTotal + obrasTotal;
    const totalConcluidos = tasksConcluidas + obrasConcluidas;

    let percentual = 0;

    if (projeto.semObra) {
      // Quando não há obra, o progresso é apurado apenas pelas tasks do Kanban (e status CONCLUÍDO = 100%)
      if (projeto.status === 'CONCLUIDO') {
        percentual = 100; // OS concluída (botão Concluir ou todas as tarefas fechadas) = 100%
      } else if (tasksTotal === 0) {
        percentual = 0;
      } else {
        percentual = Math.round((tasksConcluidas / tasksTotal) * 100);
        if (tasksConcluidas === tasksTotal) percentual = 100; // Todas as tarefas do Kanban concluídas = 100%
      }
    } else {
      percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
    }

    return {
      percentual,
      tasksTotal,
      tasksConcluidas,
      obrasTotal,
      obrasConcluidas,
      totalItens,
      totalConcluidos
    };
  }, [tasks, projeto.status, projeto.semObra, projeto.orcamento?.id]);

  // Estado e handlers para marcar "sem obra"
  const [modalSemObraOpen, setModalSemObraOpen] = useState(false);
  const [justificativaSemObraText, setJustificativaSemObraText] = useState('');
  const [modalRemoverObraOpen, setModalRemoverObraOpen] = useState(false);
  const [justificativaRemoverObra, setJustificativaRemoverObra] = useState('');
  const [concluirModalOpen, setConcluirModalOpen] = useState(false);
  const [concluirText, setConcluirText] = useState('');
  // Local/obra edit
  const [editLocalOpen, setEditLocalOpen] = useState(false);
  const [localForm, setLocalForm] = useState({
    enderecoObra: (projeto as any).enderecoObra || projeto.orcamento?.enderecoObra || '',
    bairro: (projeto as any).bairro || projeto.orcamento?.bairro || '',
    cidade: (projeto as any).cidade || projeto.orcamento?.cidade || '',
    estado: (projeto as any).estado || projeto.orcamento?.estado || '',
    cep: (projeto as any).cep || projeto.orcamento?.cep || '',
    responsavelObra: (projeto as any).responsavelObra || projeto.orcamento?.responsavelObra || projeto.responsavel?.nome || '',
    dataPrevistaInicio: serverDateToInput((projeto as any).dataPrevistaInicio || (projeto as any).dataInicio || proyectoFallback(projeto) ),
    dataPrevistaFim: serverDateToInput((projeto as any).dataPrevistaFim || (projeto as any).dataPrevisao || proyectoFallback(projeto) ),
  });

  // Helper fallback to avoid TS issues when projeto may not have fields
  function proyectoFallback(p: any) {
    return p?.dataInicio || p?.dataPrevisao || '';
  }

  // Quando orcamentoCompleto for carregado, preencher localForm para edição (herdar do orçamento)
  useEffect(() => {
    if (orcamentoCompleto) {
      setLocalForm(prev => ({
        ...prev,
        enderecoObra: prev.enderecoObra || orcamentoCompleto.enderecoObra || '',
        bairro: prev.bairro || orcamentoCompleto.bairro || '',
        cidade: prev.cidade || orcamentoCompleto.cidade || '',
        estado: prev.estado || orcamentoCompleto.estado || '',
        cep: prev.cep || orcamentoCompleto.cep || '',
        responsavelObra: prev.responsavelObra || orcamentoCompleto.responsavelObra || '',
        dataPrevistaInicio: prev.dataPrevistaInicio || serverDateToInput(orcamentoCompleto.previsaoInicio as any),
        dataPrevistaFim: prev.dataPrevistaFim || serverDateToInput(orcamentoCompleto.previsaoTermino as any)
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoCompleto]);

  async function handleConfirmRemoverObra() {
    const motivo = (justificativaRemoverObra || '').trim();
    if (motivo.length < 3) return;
    try {
      setLoadingAcao(true);
      const response = await ordemServicosService.removerVinculoObra(projeto.id, motivo);
      if (response.success) {
        toast.success('Obra removida. A OS voltou para Aprovado.');
        setModalRemoverObraOpen(false);
        setJustificativaRemoverObra('');
        await carregarObraVinculada();
        if (onRefresh) await onRefresh();
      } else {
        toast.error(response.error || 'Erro ao remover obra');
      }
    } catch (error: any) {
      console.error('Erro ao remover obra:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Erro ao remover obra');
    } finally {
      setLoadingAcao(false);
    }
  }

  async function handleConfirmSemObra() {
    try {
      if ((justificativaSemObraText || '').trim().length < 3) return;
      const payload: any = {
        semObra: true,
        justificativaSemObra: justificativaSemObraText.trim()
      };
      const response = await axiosApiService.put(`/api/projetos/${projeto.id}`, payload);
      if (response.success) {
        toast.success('Alteração aplicada: ordem marcada como sem obra');
        // Atualizar projeto local
        if (onRefresh) onRefresh();
        setModalSemObraOpen(false);
      } else {
        toast.error('Erro ao salvar alteração');
      }
    } catch (error: any) {
      console.error('Erro ao confirmar sem obra:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar projeto');
    }
  }

  async function tentarAbrirConcluirOs() {
    if (isOsTipoQuadrosPainels(projeto.tipo)) {
      try {
        const res = await axiosApiService.get(`/api/projetos/${projeto.id}/entrega-quadro`);
        const entrega = res.data?.entrega ?? projeto.entregaQuadro;
        const check = podeConcluirOsQuadros(projeto.tipo, entrega);
        if (!check.ok) {
          toast.error(
            `Não é possível concluir: ${check.pendencias.join('; ')}. Abra a tarefa "Entrega" no Kanban e complete o checklist.`,
            { duration: 12000 },
          );
          return;
        }
      } catch {
        toast.error('Não foi possível validar o checklist de entrega do quadro.');
        return;
      }
    }
    setConcluirModalOpen(true);
  }

  async function handleConcluirOS() {
    try {
      if ((concluirText || '').trim().length < 10) {
        toast.error('A justificativa de conclusão precisa ter no mínimo 10 caracteres');
        return;
      }
      const res = await axiosApiService.put(`/api/projetos/${projeto.id}/status`, { status: 'CONCLUIDO' });
      if (res.success) {
        toast.success('Ordem de serviço marcada como CONCLUÍDA');
        if (onRefresh) await onRefresh();
        setConcluirModalOpen(false);
      } else {
        toast.error(mensagemErroConclusaoOs(res.error), { duration: 10000 });
      }
    } catch (err: any) {
      console.error('Erro ao concluir OS:', err);
      toast.error(mensagemErroConclusaoOs(err?.message), { duration: 10000 });
    }
  }

  async function handleIniciarObra() {
    // Avisos informativos (não bloqueiam)
    try {
      const itens = orcamentoCompleto?.items || projeto.orcamento?.items || [];
      const itensBancoFrioNaoVinculados = itens.filter(item => {
        const isBancoFrio = (item.tipo || '').toUpperCase() === 'COTACAO' || !!item.cotacao || !!item.cotacaoId;
        if (!!(item as any).vendaDiretaFornecedor) return false;
        const materialVinculadoId = vinculacoesBancoFrio[item.id] || item.materialVinculadoId;
        return isBancoFrio && !materialVinculadoId;
      });

      if (itensBancoFrioNaoVinculados.length > 0) {
        const nomesMateriais = itensBancoFrioNaoVinculados
          .slice(0, 3)
          .map(item => item.cotacao?.nome || item.descricao || 'Item sem nome')
          .join(', ');
        const outrosMensagem = itensBancoFrioNaoVinculados.length > 3
          ? ` e mais ${itensBancoFrioNaoVinculados.length - 3} item(ns)`
          : '';
        toast.warning('Itens do banco frio não vinculados', {
          description: `${nomesMateriais}${outrosMensagem}. A obra pode ser iniciada mesmo assim; vincule na aba Materiais quando possível.`,
          duration: 6000,
        });
      }

      const verificacaoResponse = await axiosApiService.get(`/api/obras/verificar-estoque/${projeto.id}`);
      if (verificacaoResponse.success && verificacaoResponse.data && !verificacaoResponse.data.disponivel) {
        const qtd = verificacaoResponse.data.itensSemEstoque?.length || 0;
        toast.warning('Estoque incompleto', {
          description: `${qtd} item(ns) sem quantidade suficiente. A obra será iniciada com baixa parcial do disponível.`,
          duration: 6000,
        });
      }
    } catch (error: any) {
      console.warn('Aviso ao consultar estoque (não bloqueia):', error);
    }

    setAlertConfig({
      title: '🚀 Iniciar Obra',
      description: 'Deseja iniciar a obra? Será dada baixa no estoque dos materiais disponíveis (baixa parcial se faltar quantidade). A OS passa para Execução.',
      onConfirm: async () => {
        try {
          setLoadingAcao(true);
          
          console.log('🚀 Iniciando obra para projeto:', projeto.id);
          
          // Verificar se já existe obra para este projeto
          try {
            const obraExistente = await axiosApiService.get(`/api/obras/projeto/${projeto.id}`);
            if (obraExistente && obraExistente.data) {
              toast.warning('⚠️ Já existe uma obra criada para este projeto!');
              setLoadingAcao(false);
              return;
            }
          } catch (err) {
            console.log('✅ Nenhuma obra existente, criando nova...');
          }

          const obraData = {
            projetoId: projeto.id,
            nomeObra: projeto.titulo,
            dataPrevistaInicio: new Date().toISOString(),
            dataPrevistaFim: null
          };
          
          const response = await axiosApiService.post('/api/obras/gerar', obraData);
          
          console.log('✅ Obra criada:', response);
          
          toast.success('✅ Obra iniciada com sucesso! Acesse o Kanban de Obras (Backlog).');
          
          if (onRefresh) onRefresh();
          onClose();
        } catch (error: any) {
          console.error('❌ Erro ao iniciar obra:', error);
          const mensagem = error?.response?.data?.message || error?.message || 'Erro ao iniciar obra';
          toast.error(`❌ ${mensagem}`);
        } finally {
          setLoadingAcao(false);
        }
      }
    });
    setAlertOpen(true);
  }

  // Refresh modal & global projects
  async function handleRefreshAll() {
    try {
      // Recarregar dados do modal
      if (activeTab === 'Kanban') await carregarTasks();
      if (activeTab === 'Materiais' || activeTab === 'Visão Geral') await carregarOrcamentoCompleto();
      await carregarObraVinculada();
      await carregarDocumentos();
      // Solicitar refresh global (lista de projetos)
      if (onRefresh) onRefresh();
      toast.success('Dados atualizados');
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      toast.error('Erro ao atualizar dados');
    }
  }

  async function handleSaveLocal() {
    try {
      const payload: any = {
        enderecoObra: localForm.enderecoObra || null,
        bairro: localForm.bairro || null,
        cidade: localForm.cidade || null,
        estado: localForm.estado || null,
        cep: localForm.cep || null,
        responsavelObra: localForm.responsavelObra || null,
        dataPrevistaInicio: inputDateToServer(localForm.dataPrevistaInicio) || null,
        dataPrevistaFim: inputDateToServer(localForm.dataPrevistaFim) || null,
      };

      const response = await axiosApiService.put(`/api/projetos/${projeto.id}`, payload);
      if (response.success) {
        toast.success('Informações de local/obra atualizadas');
        setEditLocalOpen(false);
        if (onRefresh) onRefresh();
        // Recarregar modal data
        await carregarOrcamentoCompleto();
      } else {
        toast.error('Erro ao salvar alterações');
      }
    } catch (err: any) {
      console.error('Erro ao salvar local/obra:', err);
      toast.error(err?.response?.data?.error || 'Erro ao atualizar projeto');
    }
  }

  if (!isOpen) return null;

  // Preparar exibição de endereço completo e responsável, preferindo dados do orçamento completo (se carregado), depois projeto/orcamento
  const enderecoPartEndereco = (projeto as any).enderecoObra || orcamentoCompleto?.enderecoObra || projeto.orcamento?.enderecoObra || '';
  const enderecoPartBairro = (projeto as any).bairro || orcamentoCompleto?.bairro || projeto.orcamento?.bairro || '';
  const enderecoPartCidade = (projeto as any).cidade || orcamentoCompleto?.cidade || projeto.orcamento?.cidade || '';
  const enderecoPartEstado = (projeto as any).estado || orcamentoCompleto?.estado || projeto.orcamento?.estado || '';
  const enderecoPartCep = (projeto as any).cep || orcamentoCompleto?.cep || projeto.orcamento?.cep || '';

  const enderecoObraDisplay = [enderecoPartEndereco, enderecoPartBairro]
    .filter(p => p && String(p).trim().length > 0)
    .join(', ') || '';

  const cidadeEstadoDisplay = enderecoPartCidade ? `${enderecoPartCidade}${enderecoPartEstado ? `/${enderecoPartEstado}` : ''}` : (enderecoPartEstado || 'Não informado');

  const responsavelObraDisplay = (projeto as any).responsavelObra || orcamentoCompleto?.responsavelObra || projeto.orcamento?.responsavelObra || projeto.responsavel?.nome || 'Não atribuído';

  const numeroOs = projeto.orcamento?.numeroSequencial ?? (projeto as any).orcamento?.numeroSequencial;

  const solicitarExclusaoDocumento = (docId: string) => {
    docIdToDeleteRef.current = docId;
    setAlertConfig({
      title: 'Excluir documento',
      description: 'Tem certeza que deseja excluir este documento? Você poderá enviar um novo arquivo em seguida.',
      onConfirm: () => {
        const id = docIdToDeleteRef.current;
        docIdToDeleteRef.current = null;
        if (id) void handleExcluirDocumento(id);
      },
    });
    setAlertOpen(true);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm ${modalOverlayPaddingClasses} animate-fade-in`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
    >
      <div
        className="w-full max-w-[90rem] bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden max-h-[95dvh] sm:max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalDetailHeader
          title={<>{numeroOs != null ? `OS #${numeroOs} — ` : ''}{osEdit.isEditing ? osEdit.draft.titulo || projeto.titulo : projeto.titulo}</>}
          subtitle={
            <>
              Cliente: {projeto.cliente?.nome}
              {projeto.status === 'CONCLUIDO' && (
                <span className="block text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Concluída em{' '}
                  {formatDateDisplay((projeto.dataConclusao || projeto.dataFim || '') as string) || '—'}
                  {projeto.concluidoPor?.nome ? ` · por ${projeto.concluidoPor.nome}` : ''}
                </span>
              )}
            </>
          }
          onClose={handleRequestClose}
          icon={
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          }
          actions={
            <>
              <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide ${statusBadgeClass(projeto.status)}`}>
                {statusLabel(projeto.status)}
              </span>
              {osEdit.canEdit && !osEdit.isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('Visão Geral');
                    osEdit.startEditing();
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <span aria-hidden>✏️</span>
                  <span className="hidden sm:inline">Editar OS</span>
                </button>
              )}
              {osEdit.isEditing && (
                <>
                  <button
                    type="button"
                    onClick={osEdit.cancelEditing}
                    disabled={osEdit.saving}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void osEdit.saveEditing()}
                    disabled={osEdit.saving}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                  >
                    {osEdit.saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleRefreshAll}
                title="Atualizar"
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8a8 8 0 10-8 8" />
                </svg>
              </button>
            </>
          }
        />

        {/* Abas */}
        <div className={`shrink-0 px-3 sm:px-6 bg-white dark:bg-dark-card ${mobileTabBarStripClasses}`}>
          <ScrollableRow as="nav" ariaLabel="Abas da ordem de serviço" edgeToEdge className="gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${scrollableNavItemClasses} ${compactNavTabClasses} px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </ScrollableRow>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
          {activeTab === 'Visão Geral' && (
            <OsVisaoGeralTab
              projeto={projeto}
              progresso={progressoProjeto}
              resumo={resumoApropriacao}
              enderecoObra={enderecoObraDisplay}
              cidadeEstado={cidadeEstadoDisplay}
              responsavelObra={responsavelObraDisplay}
              engenhariaAtribuicao={engenhariaAtribuicao}
              documentos={documentos}
              deletingDocId={deletingDocId}
              vendaVinculada={vendaVinculada}
              obraVinculada={obraVinculada}
              loadingObra={loadingObra}
              podeAprovar={podeAprovar}
              podeGerarObra={podeGerarObra}
              loadingAcao={loadingAcao}
              onAprovar={handleAprovarProjeto}
              podeVoltarParaAprovada={podeVoltarParaAprovada}
              onVoltarParaAprovada={handleVoltarParaAprovada}
              onIniciarObra={handleIniciarObra}
              onSemObra={() => setModalSemObraOpen(true)}
              podeRemoverObra={podeRemoverObra}
              onRemoverObra={() => {
                setJustificativaRemoverObra('');
                setModalRemoverObraOpen(true);
              }}
              onAtribuirEngenharia={onAtribuirEngenharia}
              onUploadDocumento={() => setUploadModalOpen(true)}
              onExcluirDocumento={solicitarExclusaoDocumento}
              onViewBudget={onViewBudget}
              onViewClient={onViewClient}
              onViewSale={onViewSale}
              onNavigate={onNavigate}
              onClose={handleRequestClose}
              onAbrirCronograma={() => setActiveTab('Cronograma & Alocação')}
              tipoOs={projeto.tipo}
              podeAlterarTipoOs={projeto.status !== 'CONCLUIDO' && projeto.status !== 'CANCELADO'}
              alterandoTipoOs={alterandoTipoOs}
              onAlterarTipoOs={handleAlterarTipoOs}
              podeEditarPrazo={projeto.status !== 'CONCLUIDO' && projeto.status !== 'CANCELADO'}
              onPrazoEstimadoSaved={async () => {
                if (onRefresh) await onRefresh();
                await carregarResumoApropriacao();
              }}
              isEditing={osEdit.isEditing}
              editDraft={osEdit.draft}
              onEditDraftChange={osEdit.patchDraft}
              editSaving={osEdit.saving}
              onSaveEdit={osEdit.saveEditing}
              onCancelEdit={osEdit.cancelEditing}
              clientesOptions={osEdit.clientes.map((c) => ({
                id: c.id,
                nome: c.nome,
                documento: c.cpfCnpj,
              }))}
              usuariosOptions={usuariosDisponiveis.map((u) => ({
                id: u.id,
                nome: u.name || u.nome || '',
                role: u.role || u.funcao,
              }))}
            />
          )}

          {/* Concluir OS: sem obra, ou Quadros/Painéis com Kanban 100% */}
          {activeTab === 'Kanban' &&
            projeto.status !== 'CONCLUIDO' &&
            (tasks.length === 0 || tasks.every((t) => t.status === 'Concluído')) &&
            (projeto.semObra || isOsTipoQuadrosPainels(projeto.tipo)) && (
            <div className="p-6">
              <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft text-center">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {tasks.length === 0
                    ? 'Esta ordem de serviço não possui tarefas no Kanban.'
                    : 'Todas as tarefas do Kanban foram concluídas. Você pode concluir a ordem de serviço.'}
                </p>
                {isOsTipoQuadrosPainels(projeto.tipo) && (
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    Para Quadros/Painéis, o checklist de entrega (foto, materiais, romaneio e recebimento) deve estar completo.
                  </p>
                )}
                <p className="text-sm text-gray-500 mb-4">
                  Ao concluir, registre uma justificativa de conclusão. O progresso será exibido como 100%.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => void tentarAbrirConcluirOs()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold"
                  >
                    Concluir Ordem de Serviço
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Materiais' && (
              <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Materiais do Projeto (BOM)
                  </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleComprarFaltantes}
                    className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    Comprar faltantes
                  </button>
                  <button 
                    onClick={handleGerarPDFItensFaltantes}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF Itens Faltantes
                  </button>
                  <input
                    type="text"
                    value={buscaMateriaisAba}
                    onChange={(e) => setBuscaMateriaisAba(e.target.value)}
                    placeholder="🔍 Buscar materiais..."
                    className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setBuscaMateriaisAba('')}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
                  >
                    Limpar
                  </button>
                </div>
              </div>

                {itensChegadaSelecionados.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      {itensChegadaSelecionados.length} item(ns) selecionado(s)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelecionadosChegada(new Set())}
                        className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white/70 dark:hover:bg-dark-hover"
                      >
                        Limpar seleção
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalChegadaItens(itensChegadaSelecionados)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
                      >
                        Definir data de chegada
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl shadow-soft">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-bg border-b-2 border-gray-200 dark:border-dark-border">
                      <tr>
                        <th className="text-center pl-4 pr-1 py-4 w-10">
                          <input
                            type="checkbox"
                            aria-label="Selecionar todos os produtos"
                            title="Selecionar todos os produtos visíveis"
                            checked={todosVisiveisSelecionados}
                            disabled={itensChegadaVisiveis.length === 0}
                            ref={(el) => {
                              if (el) el.indeterminate = qtdVisiveisSelecionados > 0 && !todosVisiveisSelecionados;
                            }}
                            onChange={toggleSelecionarTodosChegada}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </th>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Foto</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Item</th>
                        <th className="text-left px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">SKU</th>
                        <th className="text-left px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">NCM</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantidade</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Subtotal</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Disponibilidade</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Chegada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingOrcamento ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className="font-medium">Carregando materiais...</p>
                            </div>
                          </td>
                        </tr>
                      ) : itensFiltradosPorBusca.map((row, idx) => {
                        const item = row.item;
                        const ehKitUnificadoItem = !row.isSubItem && (item.tipo || '').toUpperCase() === 'KIT' && !item.kitId && (item as any).itensDoKit && Array.isArray((item as any).itensDoKit);
                        const ehKitCatalogoItem =
                          !row.isSubItem &&
                          (item.tipo || '').toUpperCase() === 'KIT' &&
                          !!(item as any).kitId;
                        const ehKitCatalogoSubItem =
                          row.isSubItem &&
                          (item.tipo || '').toUpperCase() === 'KIT' &&
                          !!(item as any).kitId;
                        const kitIdCatalogo = (item as any).kitId as string | undefined;

                        const nodeKey = (row as any).expandKey || item.id;
                        const kitExpanded = kitsDesunificados.has(nodeKey);
                        const mostrarBotaoDesunificar =
                          (ehKitUnificadoItem || ehKitCatalogoItem || ehKitCatalogoSubItem) &&
                          !kitExpanded;
                        const mostrarBotaoComposicao = !!(kitIdCatalogo && !kitExpanded);
                        const mostrarBotaoUnificar = row.isSubItem && row.isFirstSubItem && row.parentKit;

                        // Identificar tipo do item
                        const isServico = (item.tipo || '').toUpperCase() === 'SERVICO' || !!item.servico;
                        const isBancoFrio = (item.tipo || '').toUpperCase() === 'COTACAO' || !!item.cotacao || !!item.cotacaoId;
                        const isMaterial = (item.tipo || '').toUpperCase() === 'MATERIAL' && !!item.material;
                        
                        const nomeMaterial = item.material?.nome || item.kit?.nome || item.servico?.nome || item.cotacao?.nome || item.descricao || 'Item sem identificação';
                        const skuDisplay = item.material?.sku || (item as any).codigo || '-';
                        const ncmDisplay = item.cotacao?.ncm || item.material?.ncm || '-';
                        const quantidadeNecessariaRaw = Number(item.quantidade ?? 0);
                        const quantidadeNecessaria = Number.isFinite(quantidadeNecessariaRaw) ? quantidadeNecessariaRaw : 0;
                        const quantidadeFormatada = quantidadeNecessaria.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(quantidadeNecessaria) ? 0 : 2 });
                        
                        // Para itens do banco frio vinculados, buscar estoque do material vinculado
                        const materialVinculadoId = vinculacoesBancoFrio[item.id] || item.materialVinculadoId;
                        const materialVinculado = materialVinculadoId ? materiaisEstoque.find(m => m.id === materialVinculadoId) : null;
                        
                        const estoqueDisponivelRaw = materialVinculado ? Number(materialVinculado.estoque ?? 0) : Number(item.material?.estoque ?? 0);
                        const estoqueDisponivel = Number.isFinite(estoqueDisponivelRaw) ? estoqueDisponivelRaw : 0;
                        const estoqueFormatado = estoqueDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(estoqueDisponivel) ? 0 : 2 });

                        const isKit = (item.tipo || '').toUpperCase() === 'KIT';

                        let possuiEstoqueKit: boolean | null = null;
                        let kitDispInfo: ComposicaoDisponibilidadeData | null = null;
                        if (isKit && kitIdCatalogo) {
                          const dispKey = cacheKeyKitDisp(
                            kitIdCatalogo,
                            quantidadeNecessaria || 1,
                            row.isSubItem ? undefined : item.id,
                          );
                          kitDispInfo = kitDispCache[dispKey] ?? null;
                          if (kitDispInfo) {
                            possuiEstoqueKit = kitDispInfo.completo;
                          }
                        }
                        if (isKit && kitIdCatalogo && possuiEstoqueKit == null) {
                          const composicao = Array.isArray((item as any).itensDoKit)
                            ? ((item as any).itensDoKit as any[])
                            : null;
                          if (composicao && composicao.length > 0) {
                            const multKit = Number(item.quantidade ?? 1);
                            let ok = true;
                            for (const [subIndex, sub] of composicao.entries()) {
                              const tipoSub = String(sub?.tipo || '').toUpperCase();
                              if (tipoSub === 'SERVICO' || !!sub?.servicoId) continue;
                              const subKitId = sub?.kitId as string | undefined;
                              if (subKitId) {
                                const qtdSubKit = (Number(sub.quantidade) || 1) * multKit;
                                const subDisp = kitDispCache[cacheKeyKitDisp(subKitId, qtdSubKit)]
                                  ?? kitDispCache[cacheKeyKitDisp(subKitId, Number(sub.quantidade) || 1)];
                                if (subDisp && !subDisp.completo) {
                                  ok = false;
                                  break;
                                }
                                if (subDisp?.completo) continue;
                                // Sem cache do kit filho: não marcar como falta para evitar falso-positivo.
                                // A conferência detalhada ocorrerá ao expandir o kit filho.
                                continue;
                              }
                              const qtdNec = Number(sub?.quantidade ?? 0) * multKit;
                              if (!(qtdNec > 0)) continue;
                              const isBancoFrioSub = tipoSub === 'COTACAO' || !!sub?.cotacaoId;
                              const parentKitToken = String(sub?.parentKitId || kitIdCatalogo || 'root');
                              const tokenSub = sub.kitId || sub.materialId || sub.cotacaoId || sub.servicoId || 'x';
                              const syntheticIdRoot = `${item.id}-cat-node-${parentKitToken}-${subIndex}-${tokenSub}`;
                              const parentMatch = String(item.id || '').match(/^(.*)-sub-kit-(.*)$/);
                              const syntheticIdNested = parentMatch
                                ? `${parentMatch[1]}-sub-${parentMatch[2]}-node-${parentKitToken}-${subIndex}-${tokenSub}`
                                : null;
                              const vinculoPorSyntheticId =
                                vinculacoesBancoFrio[syntheticIdRoot] ||
                                (syntheticIdNested ? vinculacoesBancoFrio[syntheticIdNested] : null);
                              const materialVinculadoIdSub =
                                (sub?.materialVinculadoId as string | null | undefined) ||
                                vinculoPorSyntheticId ||
                                null;
                              const materialIdSub = (sub?.materialId as string | null | undefined) || null;
                              const materialVinculadoSub = materialVinculadoIdSub
                                ? materiaisEstoque.find((m) => m.id === materialVinculadoIdSub)
                                : null;
                              const materialSub = materialIdSub
                                ? materiaisEstoque.find((m) => m.id === materialIdSub)
                                : null;
                              const estoqueSub = isBancoFrioSub
                                ? materialVinculadoSub
                                  ? Number(materialVinculadoSub.estoque ?? 0)
                                  : 0
                                : Number(materialSub?.estoque ?? 0);
                              if (estoqueSub < qtdNec) {
                                ok = false;
                                break;
                              }
                            }
                            possuiEstoqueKit = ok;
                          }
                        }

                        const kitEstoquePendente = isKit && !!kitIdCatalogo && possuiEstoqueKit == null;
                        const possuiEstoque = possuiEstoqueKit != null
                          ? possuiEstoqueKit
                          : isKit && kitIdCatalogo
                            ? true
                            : (quantidadeNecessaria <= 0 ? estoqueDisponivel > 0 : estoqueDisponivel >= quantidadeNecessaria);
                        const dataCotacao = item.cotacao?.dataAtualizacao ? new Date(item.cotacao.dataAtualizacao).toLocaleDateString('pt-BR') : null;

                        const isKitCatalogo = isKit && !!(item as any).kitId;
                        const isKitOrcamento = isKit && !(item as any).kitId;
                        
                        // Classe da linha: serviços sempre neutras, materiais e banco frio com cor baseada em estoque
                        const rowClasses = `border-t border-gray-200 dark:border-dark-border transition-colors ${
                          isServico 
                            ? 'hover:bg-gray-50 dark:hover:bg-dark-hover' 
                            : possuiEstoque 
                              ? 'hover:bg-gray-50 dark:hover:bg-dark-hover' 
                              : 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`;

                        const fotoUrl = item.material?.imagemUrl || materialVinculado?.imagemUrl;
                        const podeDefinirChegada = linhaPodeDefinirChegada(item);
                        const previsaoChegada = previsoesChegada[item.id];
                        const statusChegada = previsaoChegada
                          ? statusPrevisaoChegada(previsaoChegada.dataChegada, hojeYmdChegada)
                          : null;
                        const referenciaChegada = previsaoChegada
                          ? rotuloReferenciaChegada(previsaoChegada.tipoReferencia, previsaoChegada.referencia)
                          : null;

                        return (
                          <tr key={item.id || idx} className={rowClasses}>
                            <td className="pl-4 pr-1 py-4 text-center align-top">
                              {podeDefinirChegada && (
                                <input
                                  type="checkbox"
                                  aria-label={`Selecionar ${nomeMaterial}`}
                                  checked={selecionadosChegada.has(item.id)}
                                  onChange={() => toggleSelecionadoChegada(item.id)}
                                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              )}
                            </td>
                            {/* Coluna de Foto */}
                            <td className="px-4 py-4 text-center align-top">
                              {fotoUrl ? (
                                <img
                                  src={getUploadUrl(fotoUrl)}
                                  alt={nomeMaterial}
                                  className="w-12 h-12 object-cover rounded-lg border border-gray-300 dark:border-gray-600 mx-auto"
                                  onError={(e) => {
                                    const imgElement = e.target as HTMLImageElement;
                                    imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </td>
                            
                            {/* Coluna de Nome */}
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-semibold align-top">
                              <div className="flex items-start justify-between gap-2">
                                <span>{nomeMaterial}</span>
                                <div className="flex flex-col gap-1 shrink-0">
                                  {mostrarBotaoComposicao && kitIdCatalogo && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void abrirComposicaoKit(
                                          kitIdCatalogo,
                                          quantidadeNecessaria || 1,
                                          row.isSubItem ? undefined : item.id,
                                        )
                                      }
                                      className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-all"
                                      title="Ver composição completa do kit do catálogo"
                                    >
                                      Ver composição
                                    </button>
                                  )}
                                  {mostrarBotaoDesunificar && (
                                    <button
                                      type="button"
                                      onClick={() => toggleKitDesunificado(nodeKey, kitIdCatalogo)}
                                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-all flex items-center gap-1"
                                      title="Desunificar para ver os itens individuais na tabela"
                                    >
                                      Desunificar
                                    </button>
                                  )}
                                </div>
                                {mostrarBotaoUnificar && row.parentKit && (
                                  <button
                                    onClick={() => toggleKitDesunificado(row.parentKit!.id)}
                                    className="shrink-0 px-3 py-1.5 bg-gray-600 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-all flex items-center gap-1"
                                    title="Unificar novamente"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                    Unificar
                                  </button>
                                )}
                              </div>
                              <div className="mt-1 space-y-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                                {isKit && (
                                  <div className="inline-flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                                      kitExpanded
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800'
                                        : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-200 dark:border-gray-700'
                                    }`}>
                                      {kitExpanded
                                        ? 'KIT (expandido)'
                                        : isKitCatalogo
                                          ? 'KIT (recolhido) — Desunificar ou Ver composição'
                                          : 'KIT (recolhido) — clique em Desunificar'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800">
                                      {isKitCatalogo ? 'Kit do Catálogo' : isKitOrcamento ? 'Kit do Orçamento' : 'Kit'}
                                    </span>
                                  </div>
                                )}
                                {row.isSubItem && row.parentKit && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50/80 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300 text-xs">
                                    ↳ Componente de: {row.parentKit.descricao || row.parentKit.kit?.nome || 'Kit'}
                                  </div>
                                )}
                                {isKit && kitExpanded && kitIdCatalogo && kitsComposicaoCarregando.has(kitIdCatalogo) && (
                                  <p className="text-[11px] text-teal-600 dark:text-teal-300 animate-pulse">
                                    Carregando micro-peças do kit…
                                  </p>
                                )}
                                {isBancoFrio && (
                                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800">
                                    <span>Banco Frio</span>
                                    {dataCotacao && <span>• {dataCotacao}</span>}
                                  </div>
                                )}
                                {item.cotacao?.fornecedorNome && (
                                  <p>Fornecedor: {item.cotacao.fornecedorNome}</p>
                                )}
                                {item.descricao && (
                                  <p className="italic text-[11px] text-gray-400 dark:text-gray-500">{item.descricao}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 align-top whitespace-nowrap">
                              {skuDisplay}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 align-top whitespace-nowrap">
                              {ncmDisplay}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white align-top">
                              {quantidadeNecessaria > 0 ? quantidadeFormatada : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400 align-top">
                              {item.subtotal != null ? `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm align-top">
                              {isServico ? (
                                // Serviços não tem verificação de estoque
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    💼 Serviço
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Sem controle de estoque
                                  </p>
                                </div>
                              ) : isBancoFrio && !materialVinculadoId ? (
                                // Banco frio não vinculado: mostrar botão Vincular (item raiz ou componente de kit unificado/desunificado)
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                                    <span>🔗 Banco Frio</span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {row.isSubItem ? 'Componente de kit unificado. ' : ''}Vincule a um material do estoque para verificar disponibilidade.
                                  </p>
                                  <button
                                    onClick={() => handleAbrirVinculacao(item, row)}
                                    className="px-3 py-1 bg-yellow-600 text-white text-xs font-semibold rounded-lg hover:bg-yellow-700 transition-all"
                                  >
                                    Vincular Material do Estoque
                                  </button>
                                </div>
                              ) : isBancoFrio && materialVinculadoId ? (
                                // Banco frio vinculado - verificar estoque do material vinculado
                                <div className="space-y-2">
                                  <div className={`flex items-center gap-2 font-semibold ${possuiEstoque ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {possuiEstoque ? '✅ Em estoque' : '⚠️ Comprar / receber'}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Necessário: {quantidadeFormatada} • Disponível: {estoqueFormatado}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-yellow-600 dark:text-yellow-300">
                                      🔗 Vinculado: {materialVinculado?.nome || 'Material não encontrado'}
                                    </span>
                                    <button
                                      onClick={() => handleAbrirVinculacao(item, row)}
                                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                                    >
                                      Ver/Alterar
                                    </button>
                                  </div>
                                  {!possuiEstoque && (
                                    <p className="text-xs text-red-500 dark:text-red-300">
                                      Estoque insuficiente. Regularize antes de iniciar a obra.
                                    </p>
                                  )}
                                </div>
                              ) : isKit && kitIdCatalogo ? (
                                <div className="space-y-1">
                                  <div
                                    className={`flex items-center gap-2 font-semibold ${
                                      kitEstoquePendente
                                        ? 'text-gray-600 dark:text-gray-400'
                                        : possuiEstoque
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-red-600 dark:text-red-400'
                                    }`}
                                  >
                                    {kitEstoquePendente
                                      ? '⏳ Verificando kit…'
                                      : possuiEstoque
                                        ? '✅ Kit completo'
                                        : '⚠️ Kit incompleto'}
                                  </div>
                                  {!kitEstoquePendente && !possuiEstoque && (
                                    <p className="text-xs text-red-500 dark:text-red-300">
                                      Abra &quot;Ver composição&quot; para ver itens em falta (estoque / banco frio).
                                    </p>
                                  )}
                                  {kitDispInfo && kitDispInfo.faltantes.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                      {kitDispInfo.faltantes.length} item(ns) pendente(s)
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className={`flex items-center gap-2 font-semibold ${possuiEstoque ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {possuiEstoque ? '✅ Em estoque' : '⚠️ Comprar / receber'}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Necessário: {quantidadeFormatada} • Disponível: {estoqueFormatado}
                                  </p>
                                  {!possuiEstoque && (
                                    <p className="text-xs text-red-500 dark:text-red-300 mt-1">
                                      Estoque insuficiente. Regularize antes de iniciar a obra.
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm align-top min-w-[190px]">
                              {isServico ? (
                                <span className="text-xs text-gray-400 dark:text-gray-500">Não se aplica</span>
                              ) : isKit ? (
                                kitExpanded ? (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Defina a chegada nos componentes abaixo.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Expanda o kit para definir a chegada dos componentes.
                                    </p>
                                    {mostrarBotaoDesunificar && (
                                      <button
                                        type="button"
                                        onClick={() => toggleKitDesunificado(nodeKey, kitIdCatalogo)}
                                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-all"
                                      >
                                        Expandir kit
                                      </button>
                                    )}
                                  </div>
                                )
                              ) : linhaJaAlocada(item) ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
                                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-green-700 dark:text-green-300 font-semibold">Alocado</span>
                                </div>
                              ) : previsaoChegada ? (
                                <div
                                  className={`px-3 py-2 rounded-lg border-2 space-y-0.5 ${
                                    statusChegada === 'atrasada'
                                      ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                                      : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                                  }`}
                                >
                                  <p
                                    className={`font-semibold ${
                                      statusChegada === 'atrasada'
                                        ? 'text-red-700 dark:text-red-300'
                                        : 'text-blue-700 dark:text-blue-300'
                                    }`}
                                  >
                                    📦 {statusChegada === 'hoje' ? 'Chega hoje' : `Chega ${formatDateDisplay(previsaoChegada.dataChegada)}`}
                                  </p>
                                  {statusChegada === 'atrasada' && (
                                    <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">Chegada atrasada</p>
                                  )}
                                  {referenciaChegada && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300">{referenciaChegada}</p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setModalChegadaItens([itemChegadaDaLinha(item)])}
                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                                  >
                                    Alterar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setModalChegadaItens([itemChegadaDaLinha(item)])}
                                  className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-bg hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium whitespace-nowrap"
                                >
                                  Definir data de chegada
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!loadingOrcamento && itensFiltradosPorBusca.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="font-medium">{buscaMateriaisAba.trim() ? 'Nenhum material corresponde à busca' : 'Nenhum material cadastrado'}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          )}


          {activeTab === 'Kanban' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    Tarefas do Projeto
                    </h3>
                    <div className="hidden sm:flex items-center">
                      <input
                        type="text"
                        placeholder="🔍 Buscar tarefas por título..."
                        value={kanbanSearch}
                        onChange={(e) => setKanbanSearch(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleAbrirModalTask()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-medium font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nova Tarefa
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* A Fazer */}
                  <div className="bg-white dark:bg-dark-card border-2 border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 shadow-soft">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">A Fazer</h4>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {tasks.filter(t => t.status === 'A Fazer' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {tasks.filter(t => t.status === 'A Fazer' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).map(task => (
                        <div
                          key={task.id}
                          className={`bg-yellow-50 dark:bg-yellow-900/20 border rounded-xl p-4 cursor-pointer hover:shadow-medium transition-all ${
                            (canSeeAtraso(task) && isTaskAtrasada(task))
                              ? 'border-red-500 border-2'
                              : 'border-yellow-200 dark:border-yellow-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{task.titulo}</h5>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setPreviewTask(task)}
                                className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/30 rounded"
                                title="Ver conteúdo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleAbrirModalTask(task)}
                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleExcluirTask(task.id)}
                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.descricao}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`flex items-center gap-2 ${(canSeeAtraso(task) && isTaskAtrasada(task)) ? 'text-red-700 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                              {(canSeeAtraso(task) && isTaskAtrasada(task)) && (
                                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold border border-red-700">
                                  ATRASADA
                                </span>
                              )}
                              {(canSeeAtraso(task) || Boolean(isPrivileged)) && (
                                <>📅 {formatDateDisplay(getPrazoYmdParaKanban(task))}</>
                              )}
                            </span>
                            {(task.responsavelId || (task.responsaveisIds && task.responsaveisIds.length)) && (
                              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full font-medium">
                                👤 {getNomesResponsaveisTask(task, usuariosDisponiveis)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleMoverTask(task.id, 'Em Andamento')}
                              className="flex-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all text-xs font-semibold"
                            >
                              → Iniciar
                            </button>
                          </div>
                  </div>
                ))}
                      {tasks.filter(t => t.status === 'A Fazer' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          Nenhuma tarefa
              </div>
                      )}
            </div>
                  </div>

                  {/* Em Andamento */}
                  <div className="bg-white dark:bg-dark-card border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-4 shadow-soft">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Em Andamento</h4>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {tasks.filter(t => t.status === 'Em Andamento' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {tasks.filter(t => t.status === 'Em Andamento' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).map(task => (
                        <div
                          key={task.id}
                          className={`bg-blue-50 dark:bg-blue-900/20 border rounded-xl p-4 cursor-pointer hover:shadow-medium transition-all ${
                            (canSeeAtraso(task) && isTaskAtrasada(task))
                              ? 'border-red-500 border-2'
                              : 'border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{task.titulo}</h5>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setPreviewTask(task)}
                                className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/30 rounded"
                                title="Ver conteúdo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleAbrirModalTask(task)}
                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleExcluirTask(task.id)}
                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.descricao}</p>
                          <div className="flex items-center justify-between text-xs mb-3">
                            <span className={`flex items-center gap-2 ${(canSeeAtraso(task) && isTaskAtrasada(task)) ? 'text-red-700 dark:text-red-400 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
                              {(canSeeAtraso(task) && isTaskAtrasada(task)) && (
                                <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold border border-red-700">
                                  ATRASADA
                                </span>
                              )}
                              {(canSeeAtraso(task) || Boolean(isPrivileged)) && (
                                <>📅 {formatDateDisplay(getPrazoYmdParaKanban(task))}</>
                              )}
                            </span>
                            {(task.responsavelId || (task.responsaveisIds && task.responsaveisIds.length)) && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full font-medium">
                                👤 {getNomesResponsaveisTask(task, usuariosDisponiveis)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMoverTask(task.id, 'A Fazer')}
                              className="flex-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-all text-xs font-semibold"
                            >
                              ← Voltar
                            </button>
                            <button
                              onClick={() => handleMoverTask(task.id, 'Concluído')}
                              className="flex-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-all text-xs font-semibold"
                            >
                              ✓ Concluir
                            </button>
                          </div>
                        </div>
                      ))}
                      {tasks.filter(t => t.status === 'Em Andamento' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          Nenhuma tarefa
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Concluído */}
                  <div className="bg-white dark:bg-dark-card border-2 border-green-200 dark:border-green-800 rounded-2xl p-4 shadow-soft">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white">Concluído</h4>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {tasks.filter(t => t.status === 'Concluído' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {tasks.filter(t => t.status === 'Concluído' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).map(task => (
                        <div key={task.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 cursor-pointer opacity-75 hover:opacity-100 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm line-through">{task.titulo}</h5>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setPreviewTask(task)}
                                className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/30 rounded"
                                title="Ver conteúdo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleAbrirModalTask(task)}
                                className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleExcluirTask(task.id)}
                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.descricao}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              ✓ Concluída
                            </span>
                            {(task.responsavelId || (task.responsaveisIds && task.responsaveisIds.length)) && (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full font-medium">
                                  👤 {getNomesResponsaveisTask(task, usuariosDisponiveis)}
                                </span>
                              )}
                          </div>
                          <button
                            onClick={() => handleMoverTask(task.id, 'Em Andamento')}
                            className="w-full mt-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all text-xs font-semibold"
                          >
                            ↺ Reabrir
                          </button>
                        </div>
                      ))}
                      {tasks.filter(t => t.status === 'Concluído' && t.titulo.toLowerCase().includes(kanbanSearch.toLowerCase())).length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          Nenhuma tarefa
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'Cronograma & Alocação' && (
            <OsCronogramaAlocacaoTab
              projetoId={projeto.id}
              semObra={Boolean((projeto as ProjetoDetalhe).semObra)}
            />
          )}

          {activeTab === 'Resultado' && (
            <OsResultadoTab
              projeto={projeto}
              resumo={resumoApropriacao}
              apontamentos={apontamentosResultado}
              loadingApontamentos={loadingApontamentosResultado}
              cmv={cmvOs}
              loadingCmv={loadingCmvOs}
              onExportCsv={async () => {
                const agora = new Date();
                const competencia = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
                try {
                  await projetosService.baixarCsvHorasCustoContabil(competencia, projeto.id);
                  toast.success('CSV contábil exportado');
                } catch {
                  toast.error('Erro ao exportar CSV contábil');
                }
              }}
            />
          )}
          </div>
        </div>


        {/* Modal de Task — largo quando há checklist de entrega (ERP desktop-first, ainda responsivo) */}
        {taskModalOpen && (() => {
          const mostraEntregaQuadro = exigeFormularioEntregaQuadro(
            projeto.tipo,
            taskForm.titulo || taskEditando?.titulo,
          );
          return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
            <div
              className={`w-full bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden flex flex-col max-h-[min(92vh,920px)] ${
                mostraEntregaQuadro
                  ? 'max-w-6xl'
                  : 'max-w-2xl'
              }`}
            >
              {/* Header */}
              <div className="relative shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex items-center gap-3 pr-10">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                      {taskEditando ? 'Editar Tarefa' : 'Nova Tarefa'}
                      {mostraEntregaQuadro ? ' · Entrega' : ''}
                    </h3>
                    {mostraEntregaQuadro && (
                      <p className="text-xs text-blue-100/90 truncate">
                        Preencha o checklist em duas colunas (desktop) ou em sequência (celular)
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setTaskModalOpen(false)} 
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Título + status lado a lado em telas médias+ */}
                <div className={`grid grid-cols-1 gap-4 ${mostraEntregaQuadro ? 'lg:grid-cols-3' : ''}`}>
                  <div className={mostraEntregaQuadro ? 'lg:col-span-2' : ''}>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📝 Título da Tarefa *
                    </label>
                    <input
                      type="text"
                      value={taskForm.titulo}
                      onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })}
                      placeholder="Ex: Instalação de quadro elétrico"
                      className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                    />
                  </div>
                  {mostraEntregaQuadro && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        🎯 Status
                      </label>
                      <select
                        value={taskForm.status}
                        onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                      >
                        <option value="A Fazer">⏳ A Fazer</option>
                        <option value="Em Andamento">⚡ Em Andamento</option>
                        <option value="Concluído">✓ Concluído</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📄 Descrição Detalhada *
                  </label>
                  <textarea
                    rows={mostraEntregaQuadro ? 2 : 4}
                    value={taskForm.descricao}
                    onChange={(e) => setTaskForm({ ...taskForm, descricao: e.target.value })}
                    placeholder="Descreva o que deve ser feito pelos engenheiros e técnicos..."
                    className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                  />
                </div>

                {/* Datas e responsáveis */}
                <div className={`grid grid-cols-1 gap-4 ${mostraEntregaQuadro ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📆 Data de início
                    </label>
                    <input
                      type="date"
                      value={taskForm.dataInicio}
                      onChange={(e) => setTaskForm({ ...taskForm, dataInicio: e.target.value })}
                      className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                    />
                    {!mostraEntregaQuadro && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Planejamento do início da tarefa (calendário local; sem deslocar um dia ao salvar).
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📅 Prazo
                    </label>
                    <input
                      type="date"
                      value={taskForm.prazo}
                      onChange={(e) => setTaskForm({ ...taskForm, prazo: e.target.value })}
                      className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                    />
                    {!mostraEntregaQuadro && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Se você não definir um prazo, o sistema salva automaticamente para <strong>1 dia após a criação</strong>.
                      </p>
                    )}
                  </div>
                  <div className={mostraEntregaQuadro ? 'md:col-span-2 xl:col-span-1' : 'md:col-span-2'}>
                    <UserSearchMultiSelect
                      label="👤 Responsáveis (busque e selecione um ou mais)"
                      users={usuariosDisponiveis.map(u => ({ id: u.id, name: u.name || u.nome || '', email: u.email, role: u.role || u.funcao }))}
                      value={taskForm.responsavelIds}
                      onChange={(ids) => setTaskForm({ ...taskForm, responsavelIds: ids, responsavelId: ids[0] || '' })}
                      placeholder="Buscar por nome e selecionar..."
                    />
                  </div>
                </div>

                {/* Entrega do quadro (OS Quadros e Painéis) */}
                {mostraEntregaQuadro && (
                  <OsEntregaQuadroForm
                    value={taskForm.entregaQuadro}
                    onChange={(entregaQuadro) => setTaskForm({ ...taskForm, entregaQuadro })}
                    printContext={{
                      numeroOs: projeto.orcamento?.numeroSequencial,
                      tituloOs: projeto.titulo,
                      clienteNome: projeto.cliente?.nome || '',
                      clienteTelefone: taskForm.entregaQuadro.clienteTelefone,
                      clienteEndereco:
                        (projeto as any).enderecoObra ||
                        taskForm.entregaQuadro.localRecebimento ||
                        '',
                    }}
                    produtosSugestao={(orcamentoCompleto?.items || projeto.orcamento?.items || [])
                      .filter((it: any) => {
                        const t = String(it.tipo || '').toUpperCase();
                        return t === 'MATERIAL' || t === 'KIT' || t === 'COTACAO' || !t;
                      })
                      .slice(0, 20)
                      .map((it: any) => ({
                        nome:
                          it.material?.nome ||
                          it.kit?.nome ||
                          it.cotacao?.nome ||
                          it.descricao ||
                          'Item',
                        codigo: it.material?.sku || undefined,
                        quantidade: it.quantidade,
                      }))}
                  />
                )}

                {/* Status — só quando NÃO é entrega (já está no topo) */}
                {!mostraEntregaQuadro && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🎯 Status Inicial
                    </label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                    >
                      <option value="A Fazer">⏳ A Fazer</option>
                      <option value="Em Andamento">⚡ Em Andamento</option>
                      <option value="Concluído">✓ Concluído</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Rodapé fixo */}
              <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/80">
                <button 
                  onClick={() => setTaskModalOpen(false)} 
                  className="px-6 py-2.5 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSalvarTask} 
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-medium"
                >
                  💾 {taskEditando ? 'Atualizar' : 'Criar'} Tarefa
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Preview Task Modal */}
        {previewTask && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fade-in">
            <div
              className={`w-full bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden flex flex-col max-h-[min(90vh,880px)] ${
                exigeFormularioEntregaQuadro(projeto.tipo, previewTask.titulo) ? 'max-w-4xl' : 'max-w-2xl'
              }`}
            >
              <div className="relative shrink-0 px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-gray-800 to-gray-900">
                <h3 className="text-lg font-bold text-white">Visualizar Tarefa</h3>
                <button onClick={() => setPreviewTask(null)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-5">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{previewTask.titulo}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{previewTask.descricao || 'Sem descrição'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-dark-border pt-4">
                  <span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Início: </span>
                    {previewTask.dataInicio ? formatDateDisplay(previewTask.dataInicio) : 'Não informado'}
                  </span>
                  <span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Prazo: </span>
                    {formatDateDisplay(getPrazoYmdParaKanban(previewTask))}
                  </span>
                  <span className="sm:col-span-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Responsável(is): </span>
                    {getNomesResponsaveisTask(previewTask, usuariosDisponiveis)}
                  </span>
                  {exigeFormularioEntregaQuadro(projeto.tipo, previewTask.titulo) && (() => {
                    const entrega = extrairEntregaQuadro(previewTask.metadados);
                    if (!entrega) return null;
                    return (
                      <div className="sm:col-span-2 mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 text-xs space-y-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-200">Entrega do quadro</p>
                        {entrega.dataEntrega && <p>Data: {formatDateDisplay(entrega.dataEntrega)}</p>}
                        {entrega.entregadorNome && <p>Entregue por: {entrega.entregadorNome}</p>}
                        {entrega.recebedorNome && <p>Recebido por: {entrega.recebedorNome}</p>}
                        {entrega.localRecebimento && <p>Local: {entrega.localRecebimento}</p>}
                        <p>{entrega.recebidoNoLocal ? 'Recebido no local' : 'Recebido fora do local'}</p>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Tarefa criada por </span>
                  {previewTask.criadoPorNome?.trim() || '—'}
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = previewTask;
                      setPreviewTask(null);
                      handleAbrirModalTask(t);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Remover obra (volta para Aprovado e apaga vínculo) */}
        {modalRemoverObraOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden">
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-gray-800 to-gray-900">
                <h3 className="text-lg font-bold text-white">Remover obra</h3>
                <button
                  type="button"
                  onClick={() => setModalRemoverObraOpen(false)}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  A ordem de serviço volta para <strong>Aprovado</strong>. A obra antiga e as alocações antigas saem.
                  Eventos do calendário e apontamentos permanecem.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Informe o motivo (mínimo 3 caracteres).</p>
                <textarea
                  value={justificativaRemoverObra}
                  onChange={(e) => setJustificativaRemoverObra(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Ex: Obra lançada por engano — execução segue só no Kanban"
                  minLength={3}
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalRemoverObraOpen(false)}
                    className="px-4 py-2 bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmRemoverObra()}
                    disabled={loadingAcao || (justificativaRemoverObra || '').trim().length < 3}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAcao ? 'Removendo...' : 'Remover obra'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Marcar como sem obra */}
        {modalSemObraOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden">
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-gray-800 to-gray-900">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">Essa ordem de serviço não contém obra?</h3>
                </div>
                <button onClick={() => setModalSemObraOpen(false)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Informe uma justificativa breve (mínimo 3 caracteres).</p>
                <textarea
                  value={justificativaSemObraText}
                  onChange={(e) => setJustificativaSemObraText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Ex: Projeto técnico apenas - consultoria/serviço administrativo"
                  minLength={3}
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setModalSemObraOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                  <button
                    onClick={handleConfirmSemObra}
                    disabled={(justificativaSemObraText || '').trim().length < 3}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Concluir Ordem de Serviço (quando semObra e sem tasks) */}
        {concluirModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden">
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-gray-800 to-gray-900">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">Concluir Ordem de Serviço</h3>
                </div>
                <button onClick={() => setConcluirModalOpen(false)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Preencha a justificativa de conclusão (mínimo 10 caracteres).</p>
                <textarea
                  value={concluirText}
                  onChange={(e) => setConcluirText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Justificativa de conclusão..."
                  minLength={10}
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setConcluirModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                  <button
                    onClick={handleConcluirOS}
                    disabled={(concluirText || '').trim().length < 10}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Concluir Ordem
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Upload de Documentos */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-yellow-600 to-yellow-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Upload de Documentos</h3>
                </div>
                <button 
                  onClick={() => setUploadModalOpen(false)} 
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUploadDocumento} className="p-6 space-y-4">
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📋 Tipo de Documento
                  </label>
                  <select 
                    value={uploadForm.tipo}
                    onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-yellow-500 dark:bg-dark-bg dark:text-white"
                  >
                    <option value="ART">ART - Anotação de Responsabilidade Técnica</option>
                    <option value="TRT">TRT - Termo de Responsabilidade Técnica</option>
                    <option value="PROJETO">Projeto Elétrico</option>
                    <option value="MEMORIAL">Memorial Descritivo</option>
                    <option value="CONTRATO">Contrato</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                {/* Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📎 Arquivo
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 20 * 1024 * 1024) {
                          toast.error('Arquivo muito grande', { description: 'O tamanho máximo é 20MB' });
                          return;
                        }
                        setUploadForm({ ...uploadForm, arquivo: file });
                      }
                    }}
                    className="hidden"
                    required
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-8 text-center hover:border-yellow-400 dark:hover:border-yellow-600 transition-all cursor-pointer"
                  >
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploadForm.arquivo ? (
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{uploadForm.arquivo.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {(uploadForm.arquivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Clique para selecionar arquivo</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG até 20MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    💬 Observações
                  </label>
                  <textarea
                    rows={3}
                    value={uploadForm.observacoes}
                    onChange={(e) => setUploadForm({ ...uploadForm, observacoes: e.target.value })}
                    placeholder="Adicione observações sobre o documento..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-yellow-500 dark:bg-dark-bg dark:text-white"
                  />
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <button 
                    type="button"
                    onClick={() => {
                      setUploadModalOpen(false);
                      setUploadForm({ tipo: 'ART', observacoes: '', arquivo: null });
                    }}
                    disabled={uploading}
                    className="px-6 py-2.5 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={uploading || !uploadForm.arquivo}
                    className="px-6 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-semibold rounded-xl hover:from-yellow-700 hover:to-yellow-600 transition-all shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? '📤 Enviando...' : '📤 Fazer Upload'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Modal de Visualizar Documento */}
        {documentoVisualizar && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden flex flex-col">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <h3 className="text-lg font-bold text-white">{documentoVisualizar.nome}</h3>
                </div>
                <button 
                  onClick={() => setDocumentoVisualizar(null)} 
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Visualizador de Documento */}
              <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
                {documentoVisualizar.tipo.includes('pdf') ? (
                  <iframe 
                    src={documentoVisualizar.url} 
                    className="w-full h-full"
                    title={documentoVisualizar.nome}
                  />
                ) : documentoVisualizar.tipo.includes('image') ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img 
                      src={documentoVisualizar.url} 
                      alt={documentoVisualizar.nome}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Visualização não disponível para este tipo de arquivo
                      </p>
                      <a 
                        href={documentoVisualizar.url} 
                        download={documentoVisualizar.nome}
                        className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all inline-block"
                      >
                        📥 Baixar Arquivo
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer com Ações */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Tipo: {documentoVisualizar.tipo}
                </div>
                <a 
                  href={documentoVisualizar.url} 
                  download={documentoVisualizar.nome}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
                >
                  📥 Baixar
                </a>
              </div>
            </div>
          </div>
        )}

        {/* AlertDialog para Confirmações */}
        {/* Modal de Visualização de Cliente */}
        {clienteModalOpen && clienteData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-3xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-green-600 to-green-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">{clienteData.nome}</h2>
                    <p className="text-sm text-white/80 mt-1">{clienteData.cpfCnpj || 'Documento não informado'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setClienteModalOpen(false);
                    setClienteData(null);
                  }}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Tipo</h3>
                    <p className="text-gray-900 dark:text-white font-medium">{clienteData.tipo || 'Não informado'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Email</h3>
                    <p className="text-gray-900 dark:text-white font-medium">{clienteData.email || 'Não informado'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Telefone</h3>
                    <p className="text-gray-900 dark:text-white font-medium">{clienteData.telefone || 'Não informado'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Cidade/Estado</h3>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {clienteData.cidade && clienteData.estado 
                        ? `${clienteData.cidade}/${clienteData.estado}` 
                        : 'Não informado'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Endereço</h3>
                    <p className="text-gray-900 dark:text-white font-medium">{clienteData.endereco || 'Não informado'}</p>
                  </div>
                  {clienteData.cep && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">CEP</h3>
                      <p className="text-gray-900 dark:text-white font-medium">{clienteData.cep}</p>
                    </div>
                  )}
                </div>

                {/* Orçamentos */}
                {clienteData.orcamentos && clienteData.orcamentos.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Orçamentos ({clienteData.orcamentos.length})</h3>
                    <div className="space-y-2">
                      {clienteData.orcamentos.slice(0, 5).map((orc: any) => (
                        <div key={orc.id} className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Orçamento #{orc.id.slice(0, 8)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Status: {orc.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projetos */}
                {clienteData.projetos && clienteData.projetos.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Projetos ({clienteData.projetos.length})</h3>
                    <div className="space-y-2">
                      {clienteData.projetos.slice(0, 5).map((proj: any) => (
                        <div key={proj.id} className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{proj.titulo}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Status: {proj.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {aprovacaoNegadaOpen && (
          <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden border border-red-200 dark:border-red-900/40">
              <div className="relative px-6 py-4 bg-gradient-to-r from-red-600 to-red-500">
                <h3 className="text-xl font-bold text-white">Aprovação Negada!</h3>
                <button
                  type="button"
                  onClick={() => setAprovacaoNegadaOpen(false)}
                  className="absolute top-3 right-3 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                  aria-label="Fechar alerta de aprovação negada"
                  title="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  Confira os materiais na aba Materiais e veja o que está com estoque insuficiente, somente ao ter todos os itens equivalentes à necessidade, possivelmente seja necessário comprar materiais.
                </p>
                {aprovacaoNegadaDetalhe && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Detalhe técnico</p>
                    <p className="text-xs text-red-700 dark:text-red-200 break-words">{aprovacaoNegadaDetalhe}</p>
                  </div>
                )}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('Materiais');
                      setAprovacaoNegadaOpen(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                  >
                    Ir para aba Materiais
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={alertOpen} onOpenChange={(open) => { setAlertOpen(open); if (!open) docIdToDeleteRef.current = null; }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
              <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAlertOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  alertConfig.onConfirm();
                  setAlertOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={osEdit.dirtyDialogOpen}
          onOpenChange={(open) => {
            if (!open) osEdit.setDirtyDialogOpen(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
              <AlertDialogDescription>
                {osEdit.dirtyDialogMode === 'cancel-edit'
                  ? 'Há alterações na edição da OS. Deseja salvar, descartar ou continuar editando?'
                  : 'Há alterações não salvas. Deseja salvar antes de fechar, descartar ou cancelar?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-wrap sm:flex-nowrap">
              <AlertDialogCancel onClick={() => osEdit.setDirtyDialogOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-gray-600 hover:bg-gray-700"
                onClick={() => {
                  osEdit.confirmDirtyDiscard(
                    osEdit.dirtyDialogMode === 'close' ? onClose : undefined,
                  );
                }}
              >
                Descartar
              </AlertDialogAction>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  void osEdit.confirmDirtySave(
                    osEdit.dirtyDialogMode === 'close' ? onClose : undefined,
                  );
                }}
              >
                Salvar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ModalDefinirChegada
          open={!!modalChegadaItens}
          itens={modalChegadaItens || []}
          previsaoExistente={
            (modalChegadaItens || []).map((it) => previsoesChegada[it.itemKey]).find(Boolean) || null
          }
          quantidadeComPrevisao={(modalChegadaItens || []).filter((it) => previsoesChegada[it.itemKey]).length}
          salvando={salvandoChegada}
          onClose={() => !salvandoChegada && setModalChegadaItens(null)}
          onSalvar={(dados) => void salvarPrevisaoChegada(dados)}
          onRemover={
            (modalChegadaItens || []).some((it) => previsoesChegada[it.itemKey])
              ? () => void removerPrevisaoChegada()
              : undefined
          }
        />

        {/* Modal de Vinculação de Item do Banco Frio */}
        {modalVinculacaoOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="sticky top-0 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Vincular Material do Estoque
                </h3>
                <button
                  onClick={() => {
                    setModalVinculacaoOpen(false);
                    setItemParaVincular(null);
                    setParentKitParaVinculacao(null);
                    setItensDoKitIndexParaVinculacao(null);
                    setBuscaMaterialVinculacao('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {itemParaVincular && (() => {
                const vinculacaoAtual = vinculacoesBancoFrio[itemParaVincular.id] || itemParaVincular.materialVinculadoId;
                const materialAtualVinculado = vinculacaoAtual ? materiaisEstoque.find(m => m.id === vinculacaoAtual) : null;
                
                return (
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Item do Banco Frio:
                    </p>
                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                      {itemParaVincular.cotacao?.nome || itemParaVincular.descricao || 'Item sem identificação'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Quantidade necessária: {Number(itemParaVincular.quantidade ?? 0).toLocaleString('pt-BR')}
                    </p>
                    {materialAtualVinculado && (
                      <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          Vinculação atual:
                        </p>
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {materialAtualVinculado.nome}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          SKU: {materialAtualVinculado.sku || '-'} | Estoque: {Number(materialAtualVinculado.estoque ?? 0).toLocaleString('pt-BR')} {materialAtualVinculado.unidadeMedida || 'un'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      {materialAtualVinculado 
                        ? 'Selecione um novo material para alterar a vinculação:' 
                        : 'Selecione um material do estoque para vincular:'}
                    </p>
                    
                    {/* Campo de busca */}
                    <div className="relative mb-4">
                      <input
                        type="text"
                        value={buscaMaterialVinculacao}
                        onChange={(e) => setBuscaMaterialVinculacao(e.target.value)}
                        placeholder="🔍 Buscar material por nome, SKU ou código..."
                        className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                      />
                      <svg 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {materiaisEstoque.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          Carregando materiais...
                        </p>
                      ) : (() => {
                        // Filtrar materiais com base na busca
                        const materiaisFiltrados = materiaisEstoque.filter(material => {
                          const raw = (buscaMaterialVinculacao || '').trim().toLowerCase();
                          if (!raw) return true;

                          const nome = (material.nome || '').toLowerCase();
                          const sku = (material.sku || '').toLowerCase();

                          // Busca cruzada com curingas (* ou %) e múltiplos termos.
                          // Regra: todos os termos devem casar em (nome OU sku).
                          const termos = raw.split(/\s+/).filter(Boolean);
                          const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          const matchTermo = (texto: string, termo: string) => {
                            if (!termo) return true;
                            const temCuringa = termo.includes('*') || termo.includes('%');
                            if (!temCuringa) return texto.includes(termo);
                            const pattern = '^' + escapeRegex(termo).replace(/\\\*/g, '.*').replace(/\\%/g, '.*') + '$';
                            try {
                              return new RegExp(pattern, 'i').test(texto);
                            } catch {
                              // Fallback seguro: remover curingas e usar includes
                              const simplificado = termo.replace(/[*%]/g, '');
                              return simplificado ? texto.includes(simplificado) : true;
                            }
                          };

                          return termos.every(t => matchTermo(nome, t) || matchTermo(sku, t));
                        });

                        if (materiaisFiltrados.length === 0) {
                          return (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                              Nenhum material encontrado com "{buscaMaterialVinculacao}"
                            </p>
                          );
                        }

                        return materiaisFiltrados.map((material) => (
                          <button
                            key={material.id}
                            onClick={() => handleVincularMaterial(material.id!)}
                            className="w-full text-left px-4 py-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {material.nome}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  SKU: {material.sku || '-'} | Estoque: {Number(material.estoque ?? 0).toLocaleString('pt-BR')} {material.unidadeMedida || 'un'}
                                </p>
                              </div>
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <button
                      onClick={() => {
                        setModalVinculacaoOpen(false);
                        setItemParaVincular(null);
                        setBuscaMaterialVinculacao('');
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>

      <KitComposicaoDisponibilidadeModal
        open={kitComposicaoModal.open}
        onClose={() => setKitComposicaoModal({ open: false, loading: false, data: null })}
        loading={kitComposicaoModal.loading}
        data={kitComposicaoModal.data}
      />

      {podeApontar && (
        <button
          type="button"
          onClick={() => setApontamentoOpen(true)}
          className="fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg text-sm"
          title={
            projeto.status === 'EXECUCAO' || projeto.status === 'CONCLUIDO'
              ? 'Apontamento rápido (F1)'
              : 'Apontamento aguardando execução (F1) — contabiliza ao iniciar a obra'
          }
        >
          Apontar (F1)
        </button>
      )}

      <ModalApontamentoOs
        projetoId={projeto.id}
        projetoTitulo={projeto.titulo}
        isOpen={apontamentoOpen}
        onClose={() => setApontamentoOpen(false)}
        onSaved={(resumo) => {
          setResumoApropriacao(resumo);
          void carregarApontamentosResultado();
        }}
      />

      {estoqueEscapeOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-lg w-full bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-red-200 p-6">
            <h3 className="text-lg font-bold text-red-700 mb-2">Porra, está faltando material</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              A validação de estoque encontrou itens insuficientes para iniciar a obra normalmente.
            </p>
            {materiaisFaltantesEstoque.length > 0 && (
              <ul className="text-xs space-y-2 max-h-40 overflow-y-auto mb-4 text-gray-700 dark:text-gray-300">
                {materiaisFaltantesEstoque.map((m, i) => (
                  <li key={i}>
                    • {m.nome} — falta {m.falta} (disp. {m.disponivel})
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setEstoqueEscapeOpen(false)}>
                Voltar
              </button>
              <button
                type="button"
                className="btn-primary bg-red-600 hover:bg-red-700"
                onClick={handleIniciarSemEstoque}
                disabled={loadingAcao}
              >
                Dar início sem materiais em estoque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalVizualizacaoProjeto;


