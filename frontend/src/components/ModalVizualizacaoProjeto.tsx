import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS, getUploadUrl } from '../config/api';
import { alocacaoMateriaisService } from '../services/alocacaoMateriaisService';

import { useEscapeKey } from '../hooks/useEscapeKey';
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
}
interface OrcamentoRef { id: string; status: string; precoVenda?: number; items?: OrcamentoItemRef[] }

export interface ProjetoDetalhe {
  id: string;
  titulo: string;
  descricao?: string | null;
  cliente: ClienteRef;
  orcamento?: OrcamentoRef;
  status: ProjetoStatus;
  valorTotal?: number;
  createdAt?: string;
}

type Aba = 'Visão Geral' | 'Materiais' | 'Kanban' | 'Qualidade';

interface ModalVizualizacaoProjetoProps {
  projeto: ProjetoDetalhe;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Aba;
  onRefresh?: () => void; // chamado após alterações (ex: mudança de status)
  onViewBudget?: (budgetId: string) => void; // navegar para orçamento
  onViewClient?: (clientId: string) => void; // navegar para cliente
  onViewSale?: (saleId: string) => void; // navegar para venda
  onViewObra?: (obraId: string) => void; // navegar para obra
  onNavigate?: (view: string, ...args: any[]) => void; // navegar para outras páginas
}

const TABS: Aba[] = ['Visão Geral', 'Materiais', 'Kanban', 'Qualidade'];

const ModalVizualizacaoProjeto: React.FC<ModalVizualizacaoProjetoProps> = ({ projeto, isOpen, onClose, initialTab = 'Visão Geral', onRefresh, onViewBudget, onViewClient, onViewSale, onViewObra, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<Aba>(initialTab);
  const [loadingAcao, setLoadingAcao] = useState(false);


  // Tasks Kanban
  interface Task {
    id: string;
    titulo: string;
    descricao: string;
    status: 'A Fazer' | 'Em Andamento' | 'Concluído';
    prazo: string;
    responsavelId?: string;
    responsavelNome?: string;
  }
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskEditando, setTaskEditando] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ titulo: '', descricao: '', prazo: '', responsavelId: '', status: 'A Fazer' as 'A Fazer' | 'Em Andamento' | 'Concluído' });
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<any[]>([]);

  // Documentos
  const [documentos, setDocumentos] = useState<Array<{ id: string; nome: string; tipo: string; url: string }>>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [documentoVisualizar, setDocumentoVisualizar] = useState<{ id: string; nome: string; tipo: string; url: string } | null>(null);
  const [uploadForm, setUploadForm] = useState({ tipo: 'ART', observacoes: '', arquivo: null as File | null });
  const [uploading, setUploading] = useState(false);
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

  // Estados para alocação de materiais
  const [materialParaAlocar, setMaterialParaAlocar] = useState<{
    item: OrcamentoItemRef;
    materialId: string;
    quantidade: number;
    nomeMaterial: string;
    estoqueDisponivel: number;
  } | null>(null);
  const [confirmarAlocacaoOpen, setConfirmarAlocacaoOpen] = useState(false);
  const [alocacoesPorItem, setAlocacoesPorItem] = useState<Record<string, string>>({}); // itemId -> status de alocação
  const [materiaisAlocados, setMateriaisAlocados] = useState<Set<string>>(new Set()); // Set de materialIds já alocados

  useEffect(() => {
    if (isOpen && activeTab === 'Kanban') {
      carregarUsuarios();
      carregarTasks();
    }
    if (isOpen && activeTab === 'Materiais' && projeto.orcamento?.id) {
      carregarOrcamentoCompleto();
    }
    if (isOpen && activeTab === 'Visão Geral' && projeto.orcamento?.id) {
      carregarOrcamentoCompleto();
    }
    if (isOpen && activeTab === 'Visão Geral') {
      carregarObraVinculada();
      carregarDocumentos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, projeto?.id]);

  async function carregarUsuarios() {
    try {
      const response = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
      const todosUsuarios = (response.success && response.data) ? response.data : [];
      // Filtrar apenas roles: admin, desenvolvedor, gerente, tecnico, engenheiro
      const usuariosFiltrados = Array.isArray(todosUsuarios) 
        ? todosUsuarios.filter((u: any) => 
            ['admin', 'desenvolvedor', 'gerente', 'tecnico', 'engenheiro'].includes(u.role?.toLowerCase())
          )
        : [];
      setUsuariosDisponiveis(usuariosFiltrados);
      console.log('👥 Usuários carregados:', usuariosFiltrados.length, usuariosFiltrados);
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
          prazo: t.prazo ? new Date(t.prazo).toISOString().split('T')[0] : '',
          responsavelId: t.responsavel || '',
          responsavelNome: t.responsavel || ''
        }));
        setTasks(tasksFormatadas);
      }
    } catch (error) {
      console.error('Erro ao carregar tasks:', error);
      setTasks([]);
    }
  }

  async function carregarOrcamentoCompleto() {
    if (!projeto.orcamento?.id) return;
    try {
      setLoadingOrcamento(true);
      const response = await axiosApiService.get<any>(`/api/orcamentos/${projeto.orcamento.id}`);
      if (response.success && response.data) {
        setOrcamentoCompleto(response.data);
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
        const obra = {
          id: response.data.id, 
          nome: response.data.nome || response.data.nomeObra || 'Obra vinculada'
        };
        setObraVinculada(obra);
        
        // Carregar materiais já alocados para esta obra
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
        
        // Atualizar estado de alocação por item baseado nos materiais alocados
        if (orcamentoCompleto?.items) {
          const novasAlocacoes: Record<string, string> = {};
          orcamentoCompleto.items.forEach((item: any) => {
            if (item.material?.id && materiaisIds.has(item.material.id)) {
              novasAlocacoes[item.id] = 'Alocado';
            }
          });
          setAlocacoesPorItem(prev => ({ ...prev, ...novasAlocacoes }));
        }
      } else {
        setMateriaisAlocados(new Set());
      }
    } catch (error) {
      console.error('Erro ao carregar materiais alocados:', error);
      setMateriaisAlocados(new Set());
    }
  }

  async function handleAlocacaoChange(item: OrcamentoItemRef, value: string) {
    // Se não for "Reservar do estoque", apenas atualizar o estado local
    if (value !== 'Reservar do estoque') {
      setAlocacoesPorItem(prev => ({
        ...prev,
        [item.id]: value
      }));
      return;
    }

    // Verificar se há obra vinculada
    if (!obraVinculada?.id) {
      toast.error('Obra não encontrada', {
        description: 'É necessário ter uma obra vinculada ao projeto para alocar materiais.'
      });
      setAlocacoesPorItem(prev => ({
        ...prev,
        [item.id]: 'Não alocado'
      }));
      return;
    }

    // Verificar se o item tem material (não pode alocar itens de banco frio ou sem material)
    if (!item.material?.id || item.tipo?.toUpperCase() === 'COTACAO') {
      toast.error('Material não pode ser alocado', {
        description: 'Apenas materiais do estoque real podem ser alocados. Itens do banco frio precisam ser comprados primeiro.'
      });
      setAlocacoesPorItem(prev => ({
        ...prev,
        [item.id]: 'Não alocado'
      }));
      return;
    }

    const quantidadeNecessaria = Number(item.quantidade ?? 0);
    const estoqueDisponivel = Number(item.material?.estoque ?? 0);
    const nomeMaterial = item.material?.nome || 'Material';

    // Verificar se há estoque suficiente
    if (estoqueDisponivel < quantidadeNecessaria) {
      toast.error('Estoque insuficiente', {
        description: `${nomeMaterial}: Disponível ${estoqueDisponivel}, Necessário ${quantidadeNecessaria}`
      });
      setAlocacoesPorItem(prev => ({
        ...prev,
        [item.id]: 'Não alocado'
      }));
      return;
    }

    // Preparar dados para confirmação
    setMaterialParaAlocar({
      item,
      materialId: item.material.id,
      quantidade: quantidadeNecessaria,
      nomeMaterial,
      estoqueDisponivel
    });
    setConfirmarAlocacaoOpen(true);
  }

  async function confirmarAlocacao() {
    if (!materialParaAlocar || !obraVinculada?.id) {
      toast.error('Erro ao alocar material');
      return;
    }

    try {
      console.log('🔄 [ModalProjeto] Iniciando alocação de material:', {
        obraId: obraVinculada.id,
        materialId: materialParaAlocar.materialId,
        quantidade: materialParaAlocar.quantidade
      });

      const response = await alocacaoMateriaisService.alocarMaterialParaObra(
        obraVinculada.id,
        {
          materialId: materialParaAlocar.materialId,
          quantidade: materialParaAlocar.quantidade,
          projetoId: projeto.id
        }
      );

      console.log('📥 [ModalProjeto] Resposta da alocação:', response);

      if (response.success) {
        console.log('✅ [ModalProjeto] Alocação bem-sucedida, mostrando toast de sucesso');
        toast.success('✅ Material alocado com sucesso!', {
          description: `${materialParaAlocar.nomeMaterial} foi alocado para a obra "${obraVinculada.nome || 'vinculada'}".`
        });

        // Adicionar material ao Set de materiais alocados
        setMateriaisAlocados(prev => new Set([...prev, materialParaAlocar.materialId]));

        // Atualizar estado de alocação
        setAlocacoesPorItem(prev => ({
          ...prev,
          [materialParaAlocar.item.id]: 'Alocado'
        }));

        // Recarregar orçamento para atualizar estoque
        await carregarOrcamentoCompleto();

        // Fechar dialog
        setConfirmarAlocacaoOpen(false);
        setMaterialParaAlocar(null);
      } else {
        console.error('❌ [ModalProjeto] Alocação falhou:', response.error);
        toast.error('Erro ao alocar material', {
          description: response.error || 'Não foi possível alocar o material.'
        });
        setAlocacoesPorItem(prev => ({
          ...prev,
          [materialParaAlocar.item.id]: 'Não alocado'
        }));
      }
    } catch (error: any) {
      console.error('❌ [ModalProjeto] Erro ao alocar material:', error);
      toast.error('Erro ao alocar material', {
        description: error?.message || 'Ocorreu um erro ao processar a alocação.'
      });
      setAlocacoesPorItem(prev => ({
        ...prev,
        [materialParaAlocar.item.id]: 'Não alocado'
      }));
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

  const podeGerarObra = useMemo(() => projeto.status === 'APROVADO', [projeto.status]);
  const podeValidar = useMemo(() => projeto.status === 'PROPOSTA', [projeto.status]);
  const podeAprovar = useMemo(() => projeto.status === 'VALIDADO', [projeto.status]);

  async function handleValidarProjeto() {
    setAlertConfig({
      title: '✅ Validar Proposta',
      description: 'Deseja validar esta proposta tecnicamente? Após validada, poderá ser enviada para aprovação do cliente.',
      onConfirm: async () => {
        try {
          setLoadingAcao(true);
          await axiosApiService.put(`${ENDPOINTS.PROJETOS}/${projeto.id}/status`, { status: 'VALIDADO' });
          toast.success('✅ Proposta validada com sucesso!');
          if (onRefresh) onRefresh();
        } catch (error) {
          toast.error('❌ Erro ao validar proposta');
        } finally {
          setLoadingAcao(false);
        }
      }
    });
    setAlertOpen(true);
  }

  async function handleAprovarProjeto() {
    setAlertConfig({
      title: '🎉 Aprovar Projeto',
      description: 'Deseja aprovar este projeto? Isso reservará os materiais do estoque e permitirá iniciar a obra.',
      onConfirm: async () => {
        try {
          setLoadingAcao(true);
          const response = await axiosApiService.put(`${ENDPOINTS.PROJETOS}/${projeto.id}/status`, { status: 'APROVADO' });
          
          if (response.success) {
            toast.success('🎉 Projeto aprovado com sucesso!', {
              description: 'Materiais reservados do estoque. O projeto está pronto para iniciar a obra.'
            });
            if (onRefresh) onRefresh();
          } else {
            // Erro pode conter informação de items frios
            const mensagemErro = response.error || 'Erro ao aprovar projeto';
            
            // Verificar se é erro de items frios
            if (mensagemErro.includes('BLOQUEADA') || mensagemErro.includes('sem estoque')) {
              toast.error('⚠️ Aprovação Bloqueada!', {
                description: mensagemErro,
                duration: 10000
              });
            } else {
              toast.error('❌ Erro ao aprovar projeto', {
                description: mensagemErro
              });
            }
          }
        } catch (error: any) {
          const mensagemErro = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erro desconhecido';
          
          // Verificar se é erro de items frios
          if (mensagemErro.includes('BLOQUEADA') || mensagemErro.includes('sem estoque')) {
            toast.error('⚠️ Aprovação Bloqueada!', {
              description: mensagemErro,
              duration: 10000,
              action: {
                label: 'Ver Detalhes',
                onClick: () => {
                  alert(mensagemErro);
                }
              }
            });
          } else {
            toast.error('❌ Erro ao aprovar projeto', {
              description: mensagemErro
            });
          }
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
      await axiosApiService.put(`${ENDPOINTS.PROJETOS}/${projeto.id}/status`, { status: 'EXECUCAO' });
      if (onRefresh) onRefresh();
      setActiveTab('Kanban');
    } finally {
      setLoadingAcao(false);
    }
  }

  // Fechar modais com ESC
  useEscapeKey(taskModalOpen, () => setTaskModalOpen(false));
  useEscapeKey(uploadModalOpen, () => setUploadModalOpen(false));
  useEscapeKey(clienteModalOpen, () => setClienteModalOpen(false));

  // Funções de Tasks
  function handleAbrirModalTask(task?: Task) {
    if (task) {
      setTaskEditando(task);
      setTaskForm({
        titulo: task.titulo,
        descricao: task.descricao,
        prazo: task.prazo,
        responsavelId: task.responsavelId || '',
        status: task.status
      });
    } else {
      setTaskEditando(null);
      setTaskForm({ titulo: '', descricao: '', prazo: '', responsavelId: '', status: 'A Fazer' });
    }
    setTaskModalOpen(true);
  }

  async function handleSalvarTask() {
    if (!taskForm.titulo || !taskForm.descricao || !taskForm.prazo) {
      toast.error('❌ Preencha todos os campos obrigatórios');
      return;
    }

    const usuario = usuariosDisponiveis.find(u => u.id === taskForm.responsavelId);
    
    // Mapear status do frontend para o backend
    const statusBackend = taskForm.status === 'A Fazer' ? 'ToDo' : taskForm.status === 'Em Andamento' ? 'Doing' : 'Done';

    try {
      if (taskEditando) {
        // Editar task existente
        const response = await axiosApiService.put(`/api/projetos/${projeto.id}/tasks/${taskEditando.id}`, {
          titulo: taskForm.titulo,
          descricao: taskForm.descricao,
          prazo: taskForm.prazo,
          status: statusBackend,
          responsavel: taskForm.responsavelId || null
        });

        if (response.success) {
          toast.success('✅ Tarefa atualizada com sucesso!');
          await carregarTasks(); // Recarregar tasks do backend
        } else {
          toast.error('❌ Erro ao atualizar tarefa');
        }
      } else {
        // Criar nova task
        const response = await axiosApiService.post(`/api/projetos/${projeto.id}/tasks`, {
          titulo: taskForm.titulo,
          descricao: taskForm.descricao,
          prazo: taskForm.prazo,
          status: statusBackend,
          responsavel: taskForm.responsavelId || null
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
      setTaskForm({ titulo: '', descricao: '', prazo: '', responsavelId: '', status: 'A Fazer' });
    } catch (error: any) {
      console.error('Erro ao salvar task:', error);
      toast.error('❌ Erro ao salvar tarefa: ' + (error.message || 'Erro desconhecido'));
    }
  }

  async function handleMoverTask(taskId: string, novoStatus: 'A Fazer' | 'Em Andamento' | 'Concluído') {
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
    // TODO: Buscar obras do backend quando integrado
    const obrasTotal = projeto.status === 'EXECUCAO' || projeto.status === 'CONCLUIDO' ? 1 : 0;
    const obrasConcluidas = projeto.status === 'CONCLUIDO' ? 1 : 0;
    
    // Calcular totais
    const totalItens = tasksTotal + obrasTotal;
    const totalConcluidos = tasksConcluidas + obrasConcluidas;
    
    const percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
    
    return {
      percentual,
      tasksTotal,
      tasksConcluidas,
      obrasTotal,
      obrasConcluidas,
      totalItens,
      totalConcluidos
    };
  }, [tasks, projeto.status]);

  async function handleIniciarObra() {

    try {
      // ✅ Verificar disponibilidade de estoque antes de criar obra
      setLoadingAcao(true);
      console.log('🔍 Verificando disponibilidade de estoque para o projeto:', projeto.id);
      
      const verificacaoResponse = await axiosApiService.get(`/api/obras/verificar-estoque/${projeto.id}`);
      
      if (!verificacaoResponse.success || !verificacaoResponse.data) {
        toast.error('Erro ao verificar estoque', {
          description: 'Não foi possível verificar a disponibilidade de estoque. Tente novamente.',
        });
        setLoadingAcao(false);
        return;
      }

      const verificacao = verificacaoResponse.data;
      
      if (!verificacao.disponivel) {
        const itensSemEstoque = verificacao.itensSemEstoque || [];
        const itensBancoFrio = itensSemEstoque.filter((item: any) => item.origem === 'Banco Frio');
        const itensEstoqueReal = itensSemEstoque.filter((item: any) => item.origem === 'Estoque Real');
        const itensKit = itensSemEstoque.filter((item: any) => item.origem === 'Kit');
        
        // Construir mensagem detalhada
        let mensagem = '❌ Não é possível criar a obra. Os seguintes materiais estão faltando em estoque:\n\n';
        
        if (itensBancoFrio.length > 0) {
          mensagem += '⚠️ ITENS DO BANCO FRIO (precisam ser comprados):\n';
          itensBancoFrio.slice(0, 5).forEach((item: any, idx: number) => {
            mensagem += `  ${idx + 1}. ${item.nome} - Necessário: ${item.quantidadeNecessaria} unidades${item.falta > 0 ? ` (Faltam: ${item.falta})` : ''}\n`;
          });
          if (itensBancoFrio.length > 5) {
            mensagem += `  ... e mais ${itensBancoFrio.length - 5} item(ns) do banco frio\n`;
          }
          mensagem += '\n';
        }
        
        if (itensEstoqueReal.length > 0) {
          mensagem += '📦 ITENS DO ESTOQUE REAL (faltam unidades):\n';
          itensEstoqueReal.slice(0, 5).forEach((item: any, idx: number) => {
            mensagem += `  ${idx + 1}. ${item.nome} - Necessário: ${item.quantidadeNecessaria}, Disponível: ${item.quantidadeDisponivel} (Faltam: ${item.falta})\n`;
          });
          if (itensEstoqueReal.length > 5) {
            mensagem += `  ... e mais ${itensEstoqueReal.length - 5} item(ns) do estoque real\n`;
          }
          mensagem += '\n';
        }
        
        if (itensKit.length > 0) {
          mensagem += '🧩 COMPONENTES DE KIT (faltam unidades):\n';
          itensKit.slice(0, 5).forEach((item: any, idx: number) => {
            mensagem += `  ${idx + 1}. ${item.nome}${item.origemKit ? ` (${item.origemKit})` : ''} - Necessário: ${item.quantidadeNecessaria}, Disponível: ${item.quantidadeDisponivel} (Faltam: ${item.falta})\n`;
          });
          if (itensKit.length > 5) {
            mensagem += `  ... e mais ${itensKit.length - 5} componente(s) de kit\n`;
          }
          mensagem += '\n';
        }
        
        mensagem += '⚠️ Por favor, realize as compras necessárias antes de criar a obra.';
        
        toast.error('Materiais pendentes para iniciar a obra', {
          description: mensagem,
          duration: 8000,
        });
        
        setActiveTab('Materiais');
        setLoadingAcao(false);
        return;
      }
      
      // ✅ Estoque validado, prosseguir com criação da obra
      console.log('✅ Validação de estoque passou. Todos os materiais estão disponíveis.');
    } catch (error: any) {
      console.error('❌ Erro ao verificar estoque:', error);
      toast.error('Erro ao verificar estoque', {
        description: error?.response?.data?.message || error?.message || 'Não foi possível verificar a disponibilidade de estoque. Tente novamente.',
      });
      setLoadingAcao(false);
      return;
    }

    // Se chegou aqui, a validação passou
    setAlertConfig({
      title: '🚀 Iniciar Obra',
      description: 'Todos os materiais estão disponíveis em estoque. Deseja iniciar a obra? Isso criará automaticamente uma nova entrada no Kanban de Obras na etapa Backlog.',
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
            // Obra não existe, pode prosseguir
            console.log('✅ Nenhuma obra existente, criando nova...');
          }
          

          // Gerar obra automaticamente (backend já valida estoque novamente e atualiza status do projeto)
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

          
          // Se o erro for relacionado a estoque, mostrar mensagem mais detalhada
          if (mensagem.includes('materiais estão faltando') || mensagem.includes('estoque')) {
            toast.error('❌ Não foi possível criar a obra', {
              description: mensagem,
              duration: 8000,
            });
          } else {
            toast.error(`❌ ${mensagem}`);
          }
        } finally {
          setLoadingAcao(false);
        }
      }
    });
    setAlertOpen(true);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-7xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border" style={{ backgroundColor: '#0a1a2f' }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
          </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{projeto.titulo}</h2>
              <p className="text-sm text-white/80 mt-1">Cliente: {projeto.cliente?.nome}</p>
            </div>
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-medium' 
                    : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-dark-hover'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
          {activeTab === 'Visão Geral' && (
              <div className="space-y-6 animate-fade-in">
                {/* Cards de Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Status */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6 shadow-soft">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status do Projeto</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{projeto.status}</p>
                  </div>

                  {/* Data de Criação */}
                  {projeto.createdAt && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6 shadow-soft">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                </div>
                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Data de Criação</h3>
                      </div>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                        {new Date(projeto.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card de Progresso do Projeto */}
                <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Progresso do Projeto
                    </h3>
                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {progressoProjeto.percentual}%
                    </span>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 rounded-full"
                        style={{ width: `${progressoProjeto.percentual}%` }}
                      />
                    </div>
                  </div>

                  {/* Detalhes do Progresso */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Tasks */}
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tasks Kanban</div>
                      <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                        {progressoProjeto.tasksConcluidas}/{progressoProjeto.tasksTotal}
                      </div>
                    </div>
                    
                    {/* Obras */}
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Obras</div>
                      <div className="text-lg font-bold text-orange-700 dark:text-orange-400">
                        {progressoProjeto.obrasConcluidas}/{progressoProjeto.obrasTotal}
                      </div>
                    </div>
                  </div>

                  {/* Informação */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        O progresso é calculado com base em: <strong>Tasks concluídas</strong> + <strong>Obras concluídas</strong>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Botão Validar Proposta */}
                {podeValidar && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">📋 Proposta Pendente</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Este projeto está em fase de proposta. Valide tecnicamente antes de enviar para aprovação do cliente.
                        </p>
                      </div>
                  <button
                        onClick={handleValidarProjeto}
                    disabled={loadingAcao}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                        {loadingAcao ? '⏳ Validando...' : '✅ Validar Proposta'}
                  </button>
                    </div>
                  </div>
                )}

                {/* Botão Aprovar Projeto */}
                {podeAprovar && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">✅ Proposta Validada</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          A proposta foi validada tecnicamente. Agora pode ser aprovada pelo cliente para gerar a venda.
                        </p>
              </div>
                      <button
                        onClick={handleAprovarProjeto}
                        disabled={loadingAcao}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {loadingAcao ? '⏳ Aprovando...' : '🎉 Aprovar Projeto'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Botão Iniciar Obra */}
                {(podeGerarObra || projeto.status === 'VALIDADO') && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {podeGerarObra ? '🏗️ Iniciar Execução' : '🚧 Obra Pré-Aprovada'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {podeGerarObra 
                            ? 'O projeto foi aprovado e está pronto. Clique para iniciar a obra e criar entrada no Kanban de Obras.'
                            : 'O projeto foi validado. Aguarde aprovação do cliente para iniciar a obra.'}
                        </p>
                      </div>
                      <button
                        onClick={handleIniciarObra}
                        disabled={loadingAcao || !podeGerarObra}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {loadingAcao ? '⏳ Iniciando...' : '🚀 INICIAR OBRA'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Links Rápidos e Documentos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Links Rápidos */}
                  <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Links Rápidos
                    </h3>
                    <div className="space-y-3">
                      {projeto.orcamento && (
                        <button
                          onClick={() => {
                            if (onViewBudget) {
                              onViewBudget(projeto.orcamento!.id);
                              onClose(); // Fechar o modal atual
                            } else if (onNavigate) {
                              onNavigate('Orçamentos');
                              onClose(); // Fechar modal
                            } else {
                              toast.info('📋 Navegando para orçamento...');
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-left"
                        >
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">Orçamento Vinculado</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Ver detalhes do orçamento</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      {vendaVinculada && vendaVinculada.id && (
                        <button
                          onClick={() => {
                            if (onViewSale && vendaVinculada.id) {
                              onViewSale(vendaVinculada.id);
                              onClose(); // Fechar modal
                            } else if (onNavigate) {
                              onNavigate('Vendas');
                              onClose(); // Fechar modal
                            } else {
                              toast.info('📋 Navegando para página de vendas...');
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-left"
                        >
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">Venda Vinculada</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Ver detalhes da venda</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      {obraVinculada && obraVinculada.id && (
                        <button
                          onClick={() => {
                            if (onViewObra && obraVinculada.id) {
                              onViewObra(obraVinculada.id);
                              onClose(); // Fechar modal
                            } else if (onNavigate) {
                              onNavigate('DetalhesObra', obraVinculada.id);
                              onClose(); // Fechar modal
                            } else {
                              toast.info('🏗️ Navegando para obra...');
                            }
                          }}
                          disabled={loadingObra}
                          className="w-full flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3H12M8.25 9h7.5" />
                          </svg>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">Obra Vinculada</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{obraVinculada.nome || 'Ver detalhes da obra'}</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (onViewClient && projeto.cliente?.id) {
                            onViewClient(projeto.cliente.id);
                            onClose(); // Fechar modal
                          } else if (onNavigate) {
                            onNavigate('Clientes');
                            onClose(); // Fechar modal
                          } else {
                            carregarCliente();
                          }
                        }}
                        disabled={loadingCliente}
                        className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">Perfil do Cliente</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{projeto.cliente.nome}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Documentos Técnicos */}
                  <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Documentos
                      </h3>
                      <button
                        onClick={() => setUploadModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all font-semibold text-sm"
                      >
                        + Upload
                      </button>
                    </div>
                    {documentos.length === 0 ? (
                      <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl">
                        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum documento</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">ART, TRT, etc.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documentos.map(doc => (
                          <div key={doc.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
                            <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{doc.nome}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{doc.tipo}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  // Abrir documento em nova aba
                                  window.open(doc.url, '_blank');
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Visualizar documento"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <a
                                href={doc.url}
                                download={doc.nome}
                                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="Baixar documento"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações do Cliente e Endereço */}
                <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Informações do Cliente e Local
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cliente</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{projeto.cliente?.nome}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Endereço da Obra</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {(projeto as any).enderecoObra || 'Não informado'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cidade/Estado</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {(projeto as any).cidade || 'Não informado'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Responsável na Obra</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {(projeto as any).responsavelObra || 'Não atribuído'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Descrição do Projeto */}
              {projeto.descricao && (
                  <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descrição do Projeto
                    </h3>
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {projeto.descricao}
                    </div>
                  </div>
                )}

                {/* Informações do Orçamento */}
                {projeto.orcamento && (
                  <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Informações do Orçamento
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status do Orçamento</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{projeto.orcamento.status}</p>
                      </div>
                      {projeto.orcamento.precoVenda && (
                        <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Preço de Venda</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            R$ {projeto.orcamento.precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {projeto.orcamento.items && (
                        <div className="bg-gray-50 dark:bg-dark-bg rounded-xl p-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Itens</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{projeto.orcamento.items.length} itens</p>
                        </div>
                      )}
                    </div>
                </div>
              )}
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
                  <input
                    type="text"
                      placeholder="🔍 Buscar materiais..."
                      className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                  />
                    <button className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all">
                    Localizar
                  </button>
                </div>
              </div>

                <div className="overflow-x-auto bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl shadow-soft">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-dark-bg border-b-2 border-gray-200 dark:border-dark-border">
                      <tr>
                        <th className="text-center px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Foto</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Item</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">SKU / NCM</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Quantidade</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Subtotal</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Disponibilidade</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Alocação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingOrcamento ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className="font-medium">Carregando materiais...</p>
                            </div>
                          </td>
                        </tr>
                      ) : ((orcamentoCompleto?.items || projeto.orcamento?.items || []) as OrcamentoItemRef[]).map((item, idx) => {
                        const nomeMaterial = item.material?.nome || item.kit?.nome || item.servico?.nome || item.cotacao?.nome || item.descricao || 'Item sem identificação';
                        const skuDisplay = item.material?.sku || item.cotacao?.ncm || '-';
                        const quantidadeNecessariaRaw = Number(item.quantidade ?? 0);
                        const quantidadeNecessaria = Number.isFinite(quantidadeNecessariaRaw) ? quantidadeNecessariaRaw : 0;
                        const quantidadeFormatada = quantidadeNecessaria.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(quantidadeNecessaria) ? 0 : 2 });
                        const estoqueDisponivelRaw = Number(item.material?.estoque ?? 0);
                        const estoqueDisponivel = Number.isFinite(estoqueDisponivelRaw) ? estoqueDisponivelRaw : 0;
                        const estoqueFormatado = estoqueDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(estoqueDisponivel) ? 0 : 2 });
                        const isBancoFrio = (item.tipo || '').toUpperCase() === 'COTACAO' || !!item.cotacao;
                        const possuiEstoque = quantidadeNecessaria <= 0 ? estoqueDisponivel > 0 : estoqueDisponivel >= quantidadeNecessaria;
                        const dataCotacao = item.cotacao?.dataAtualizacao ? new Date(item.cotacao.dataAtualizacao).toLocaleDateString('pt-BR') : null;
                        const rowClasses = `border-t border-gray-200 dark:border-dark-border transition-colors ${
                          possuiEstoque ? 'hover:bg-gray-50 dark:hover:bg-dark-hover' : 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                        }`;

                        const fotoUrl = item.material?.imagemUrl;

                        return (
                          <tr key={item.id || idx} className={rowClasses}>
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
                              <div>{nomeMaterial}</div>
                              <div className="mt-1 space-y-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                                {isBancoFrio && (
                                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:border-purple-800">
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
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 align-top">
                              {skuDisplay}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white align-top">
                              {quantidadeNecessaria > 0 ? quantidadeFormatada : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400 align-top">
                              {item.subtotal != null ? `R$ ${item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm align-top">
                              <div className={`flex items-center gap-2 font-semibold ${possuiEstoque ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {possuiEstoque ? '✅ Em estoque' : '⚠️ Comprar / receber'}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Necessário: {quantidadeNecessaria > 0 ? quantidadeFormatada : '0'} • Disponível: {estoqueFormatado}
                              </p>
                              {!possuiEstoque && isBancoFrio && (
                                <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                                  Item proveniente do banco frio. Finalize a compra e receba no estoque.
                                </p>
                              )}
                              {!possuiEstoque && !isBancoFrio && (
                                <p className="text-xs text-red-500 dark:text-red-300 mt-1">
                                  Estoque insuficiente. Regularize antes de iniciar a obra.
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm align-top">
                              {alocacoesPorItem[item.id] === 'Alocado' || (item.material?.id && materiaisAlocados.has(item.material.id)) ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
                                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-green-700 dark:text-green-300 font-semibold">Alocado</span>
                                </div>
                              ) : (
                                <select
                                  value={alocacoesPorItem[item.id] || 'Não alocado'}
                                  onChange={(e) => handleAlocacaoChange(item, e.target.value)}
                                  disabled={!item.material?.id || isBancoFrio || !obraVinculada?.id || (item.material?.id && materiaisAlocados.has(item.material.id))}
                                  className={`px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white ${
                                    (!item.material?.id || isBancoFrio || !obraVinculada?.id || (item.material?.id && materiaisAlocados.has(item.material.id)))
                                      ? 'opacity-50 cursor-not-allowed'
                                      : ''
                                  }`}
                                >
                                  <option>Não alocado</option>
                                  <option disabled={!possuiEstoque || !item.material?.id || isBancoFrio || (item.material?.id && materiaisAlocados.has(item.material.id))}>
                                    Reservar do estoque
                                  </option>
                                  <option>Solicitar compra</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!loadingOrcamento && (!orcamentoCompleto?.items || orcamentoCompleto.items.length === 0) && (!projeto.orcamento?.items || projeto.orcamento.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                              <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <p className="font-medium">Nenhum material cadastrado</p>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    Tarefas do Projeto
                  </h3>
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
                        {tasks.filter(t => t.status === 'A Fazer').length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {tasks.filter(t => t.status === 'A Fazer').map(task => (
                        <div key={task.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 cursor-pointer hover:shadow-medium transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{task.titulo}</h5>
                            <div className="flex gap-1">
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
                            <span className="text-gray-600 dark:text-gray-400">
                              📅 {new Date(task.prazo).toLocaleDateString('pt-BR')}
                            </span>
                            {task.responsavelNome && (
                              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full font-medium">
                                👤 {task.responsavelNome.split(' ')[0]}
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
                      {tasks.filter(t => t.status === 'A Fazer').length === 0 && (
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
                        {tasks.filter(t => t.status === 'Em Andamento').length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {tasks.filter(t => t.status === 'Em Andamento').map(task => (
                        <div key={task.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 cursor-pointer hover:shadow-medium transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">{task.titulo}</h5>
                            <div className="flex gap-1">
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
                            <span className="text-gray-600 dark:text-gray-400">
                              📅 {new Date(task.prazo).toLocaleDateString('pt-BR')}
                            </span>
                            {task.responsavelNome && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full font-medium">
                                👤 {task.responsavelNome.split(' ')[0]}
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
                      {tasks.filter(t => t.status === 'Em Andamento').length === 0 && (
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
                        {tasks.filter(t => t.status === 'Concluído').length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[200px]">
                      {tasks.filter(t => t.status === 'Concluído').map(task => (
                        <div key={task.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 cursor-pointer opacity-75 hover:opacity-100 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm line-through">{task.titulo}</h5>
                            <div className="flex gap-1">
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
                            {task.responsavelNome && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full font-medium">
                                👤 {task.responsavelNome.split(' ')[0]}
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
                      {tasks.filter(t => t.status === 'Concluído').length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                          Nenhuma tarefa
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {activeTab === 'Qualidade' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Controle de Qualidade
                </h3>

                {/* Visita Técnica */}
                <div className="bg-white dark:bg-dark-card border-2 border-purple-200 dark:border-purple-800 rounded-2xl p-6 shadow-soft">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Visita Técnica
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Status da Visita */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status da Visita</p>
                        <select className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white font-semibold">
                          <option value="pendente">⏳ Pendente</option>
                          <option value="agendada">📅 Agendada</option>
                          <option value="realizada">✅ Realizada</option>
                          <option value="cancelada">❌ Cancelada</option>
                        </select>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data da Visita</p>
                        <input
                          type="date"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white"
                        />
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Responsável</p>
                        <input
                          type="text"
                          placeholder="Nome do técnico"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Checklist de Qualidade */}
                    <div className="bg-gray-50 dark:bg-dark-bg border-2 border-gray-200 dark:border-dark-border rounded-xl p-6">
                      <h5 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Checklist de Verificação
                      </h5>
                      <div className="space-y-3">
                        {[
                          'Inspeção do local',
                          'Medições realizadas',
                          'Fotos documentadas',
                          'Condições elétricas verificadas',
                          'Requisitos técnicos confirmados',
                          'Orçamento validado com cliente'
                        ].map((item, idx) => (
                          <label key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer transition-all">
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Observações da Visita */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Observações da Visita Técnica
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Descreva detalhes importantes da visita técnica, condições encontradas, pontos de atenção..."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white"
                      />
                    </div>

                    {/* Fotos da Visita */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        📸 Fotos da Visita Técnica
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-8 text-center hover:border-purple-400 dark:hover:border-purple-600 transition-all cursor-pointer">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Clique para fazer upload de fotos</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">PNG, JPG até 10MB</p>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3">
                      <button className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-medium font-semibold">
                        💾 Salvar Visita Técnica
                      </button>
                      <button className="px-6 py-3 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all font-semibold">
                        🖨️ Gerar Relatório
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inspeções e Aprovações */}
                <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl p-6 shadow-soft">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Inspeções e Aprovações
                  </h4>
                  
                  <div className="space-y-3">
                    {[
                      { nome: 'Inspeção Inicial', status: 'pendente' },
                      { nome: 'Aprovação do Cliente', status: 'pendente' },
                      { nome: 'Teste de Qualidade', status: 'pendente' },
                      { nome: 'Vistoria Final', status: 'pendente' }
                    ].map((inspecao, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl hover:shadow-soft transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            inspecao.status === 'aprovado' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}>
                            {inspecao.status === 'aprovado' ? (
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{inspecao.nome}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {inspecao.status === 'aprovado' ? '✅ Aprovado' : '⏳ Pendente'}
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all font-semibold text-sm">
                          Aprovar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Modal de Task */}
        {taskModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">{taskEditando ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                </div>
                <button 
                  onClick={() => setTaskModalOpen(false)} 
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📝 Título da Tarefa *
                  </label>
                  <input
                    type="text"
                    value={taskForm.titulo}
                    onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })}
                    placeholder="Ex: Instalação de quadro elétrico"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📄 Descrição Detalhada *
                  </label>
                  <textarea
                    rows={4}
                    value={taskForm.descricao}
                    onChange={(e) => setTaskForm({ ...taskForm, descricao: e.target.value })}
                    placeholder="Descreva o que deve ser feito pelos engenheiros e técnicos..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                  />
                </div>

                {/* Grid com Prazo e Responsável */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Prazo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📅 Prazo *
                    </label>
                    <input
                      type="date"
                      value={taskForm.prazo}
                      onChange={(e) => setTaskForm({ ...taskForm, prazo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                    />
                  </div>

                  {/* Responsável */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      👤 Responsável
                    </label>
                    <select
                      value={taskForm.responsavelId}
                      onChange={(e) => setTaskForm({ ...taskForm, responsavelId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                    >
                      <option value="">Selecione um responsável</option>
                      {usuariosDisponiveis.map(usuario => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.name || usuario.nome} - {usuario.role || usuario.funcao || 'Usuário'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status */}
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

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
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
          </div>
        )}

        {/* Modal de Upload de Documentos */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-strong overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-purple-600 to-purple-500">
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white"
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
                    className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-8 text-center hover:border-purple-400 dark:hover:border-purple-600 transition-all cursor-pointer"
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white"
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
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
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

        {/* AlertDialog para Confirmação de Alocação de Material */}
        <AlertDialog open={confirmarAlocacaoOpen} onOpenChange={setConfirmarAlocacaoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Alocação de Material</AlertDialogTitle>
              {materialParaAlocar && (
                <div className="space-y-2 mt-2">
                  <AlertDialogDescription asChild>
                    <div>
                      <p>
                        <strong>Material:</strong> {materialParaAlocar.nomeMaterial}
                      </p>
                      <p>
                        <strong>Quantidade necessária:</strong> {materialParaAlocar.quantidade} {materialParaAlocar.item.material?.unidadeMedida || 'un'}
                      </p>
                      <p>
                        <strong>Estoque disponível:</strong> {materialParaAlocar.estoqueDisponivel} {materialParaAlocar.item.material?.unidadeMedida || 'un'}
                      </p>
                    </div>
                  </AlertDialogDescription>
                  <div className="mt-4">
                    <p className="font-semibold text-orange-600 dark:text-orange-400">
                      Esta ação dará baixa imediata no estoque e alocará o material para a obra "{obraVinculada?.nome || 'obra vinculada'}".
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Deseja confirmar a alocação?
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => {
                  setConfirmarAlocacaoOpen(false);
                  if (materialParaAlocar) {
                    setAlocacoesPorItem(prev => ({
                      ...prev,
                      [materialParaAlocar.item.id]: 'Não alocado'
                    }));
                  }
                  setMaterialParaAlocar(null);
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmarAlocacao}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Confirmar Alocação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
};

export default ModalVizualizacaoProjeto;


