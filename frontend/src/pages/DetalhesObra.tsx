import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { AuthContext } from '../contexts/AuthContext';
import { equipeService, type EquipeDTO } from '../services/EquipeService';
import { alocacaoService, type AlocacaoEquipeDTO } from '../services/alocacaoService';
import CalendarioAlocacoes from '../components/CalendarioAlocacoes';
import ModalEquipesDeObra from '../components/Obras/ModalEquipesDeObra';

// Types
interface Obra {
  id: string;
  nomeObra: string;
  clienteNome: string;
  endereco?: string;
  descricao?: string;
  dataPrevistaInicio?: string;
  dataPrevistaFim?: string;
  progresso: number;
}

interface TarefaObra {
  id: string;
  descricao: string;
  atribuidoA?: string;
  atribuidoNome?: string;
  equipeId?: string;
  equipeNome?: string;
  alocacaoId?: string;
  progresso: number;
  dataPrevista?: string;
  dataPrevistaFim?: string;
  dataConclusaoReal?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
  registrosAtividade: RegistroAtividade[];
}

interface RegistroAtividade {
  id: string;
  tarefaId: string;
  dataRegistro: string;
  descricaoAtividade: string;
  horasTrabalhadas: number;
  observacoes?: string;
  imagens: string[];
  createdAt: string;
  eletricistaNome?: string;
}

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DetalhesObraProps {
  toggleSidebar?: () => void;
  obraId: string;
  onNavigate?: (view: string) => void;
}

// Icons
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const PhotoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const DetalhesObra: React.FC<DetalhesObraProps> = ({ toggleSidebar, obraId, onNavigate }) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const [obra, setObra] = useState<Obra | null>(null);
  const [tarefas, setTarefas] = useState<TarefaObra[]>([]);
  const [eletricistas, setEletricistas] = useState<Usuario[]>([]);
  const [equipes, setEquipes] = useState<EquipeDTO[]>([]);
  const [alocacoes, setAlocacoes] = useState<AlocacaoEquipeDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Nova Tarefa
  const [modalNovaTarefa, setModalNovaTarefa] = useState(false);
  const [tipoAtribuicao, setTipoAtribuicao] = useState<'equipe' | 'individual'>('equipe');
  const [formTarefa, setFormTarefa] = useState({
    descricao: '',
    atribuidoA: '',
    equipeId: '',
    dataPrevista: '',
    dataPrevistaFim: '',
    observacoes: ''
  });

  // Modal de Edição de Tarefa
  const [modalEditarTarefa, setModalEditarTarefa] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<TarefaObra | null>(null);
  const [tipoAtribuicaoEdicao, setTipoAtribuicaoEdicao] = useState<'equipe' | 'individual'>('individual');

  // Modal de Visualização de Registro
  const [modalRegistro, setModalRegistro] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<RegistroAtividade | null>(null);

  // Modal de Imagens
  const [modalImagens, setModalImagens] = useState(false);
  const [imagensVisualizacao, setImagensVisualizacao] = useState<string[]>([]);
  const [imagemAtual, setImagemAtual] = useState(0);

  // Modal de Gestão de Equipes
  const [modalEquipes, setModalEquipes] = useState(false);

  // Sistema de Abas
  const [abaAtiva, setAbaAtiva] = useState<'visaoGeral' | 'materiais'>('visaoGeral');

  // Materiais vinculados à obra
  const [materiaisObra, setMateriaisObra] = useState<any[]>([]);
  const [loadingMateriais, setLoadingMateriais] = useState(false);

  // Modal de Visualização de Tarefa
  const [tarefaParaVisualizar, setTarefaParaVisualizar] = useState<TarefaObra | null>(null);
  const [modalVisualizarTarefa, setModalVisualizarTarefa] = useState(false);

  useEffect(() => {
    if (obraId) {
      carregarDados();
    }
  }, [obraId]);

  // Recarregar equipes quando o modal de nova tarefa abrir
  useEffect(() => {
    if (modalNovaTarefa) {
      console.log('🔄 Modal de nova tarefa aberto, recarregando equipes...');
      carregarEquipes();
    }
  }, [modalNovaTarefa]);

  // Recarregar equipes quando o modal de edição de tarefa abrir
  useEffect(() => {
    if (modalEditarTarefa) {
      console.log('🔄 Modal de edição de tarefa aberto, recarregando equipes...');
      carregarEquipes();
    }
  }, [modalEditarTarefa]);

  const carregarDados = async () => {
    if (!obraId) return;
    try {
      setLoading(true);
      await Promise.all([
        carregarObra(),
        carregarTarefas(),
        carregarEletricistas(),
        carregarEquipes(),
        carregarAlocacoes()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarObra = async () => {
    if (!obraId) return;
    try {
      const response = await axiosApiService.get(`/api/obras/${obraId}`);
      setObra(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar obra:', error);
      toast.error('Erro ao carregar obra');
    }
  };

  const carregarTarefas = async () => {
    if (!obraId) return;
    try {
      const response = await axiosApiService.get(`/api/obras/${obraId}/tarefas`);
      setTarefas(response.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
    }
  };

  const carregarEletricistas = async () => {
    try {
      const response = await axiosApiService.get('/api/configuracoes/usuarios?role=eletricista');
      setEletricistas(response.data?.data || response.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar eletricistas:', error);
    }
  };

  const carregarEquipes = async () => {
    try {
      console.log('🔍 Carregando equipes para seleção no modal...');
      
      // Tentar primeiro com o endpoint de obras
      let response = await axiosApiService.get<any>('/api/obras/equipes');
      
      // Se não funcionar, tentar com o serviço padrão
      if (!response.success) {
        response = await equipeService.getAllEquipes();
      }
      
      if (response.success && response.data) {
        const equipesArray = Array.isArray(response.data) ? response.data : [];
        const equipesAtivas = equipesArray.filter((eq: any) => eq.ativa !== false);
        console.log('✅ Equipes carregadas para seleção:', equipesAtivas.length);
        setEquipes(equipesAtivas);
      } else {
        console.warn('⚠️ Resposta sem equipes:', response);
        setEquipes([]);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar equipes:', error);
      setEquipes([]);
    }
  };

  const carregarAlocacoes = async () => {
    if (!obraId) return;
    try {
      const response = await alocacaoService.buscarPorObra(obraId);
      if (response.success && response.data) {
        setAlocacoes(response.data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar alocações:', error);
    }
  };

  const carregarMateriaisObra = async () => {
    if (!obraId || !obra) return;
    try {
      setLoadingMateriais(true);
      // Usar o endpoint específico de materiais da obra
      const response = await axiosApiService.get(`/api/obras/${obraId}/materiais`);
      if (response.success && response.data) {
        const materiaisArray = Array.isArray(response.data) ? response.data : [];
        // Mapear para o formato esperado
        const materiaisVinculados = materiaisArray.map((mov: any) => ({
          ...mov,
          material: mov.material || { nome: 'Material não encontrado', sku: '-', unidadeMedida: 'un' }
        }));
        
        setMateriaisObra(materiaisVinculados);
        console.log(`✅ ${materiaisVinculados.length} materiais encontrados para a obra`);
      } else {
        setMateriaisObra([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar materiais da obra:', error);
      toast.error('Erro ao carregar materiais');
      setMateriaisObra([]);
    } finally {
      setLoadingMateriais(false);
    }
  };

  // Carregar materiais quando a aba de materiais for ativada
  useEffect(() => {
    if (abaAtiva === 'materiais' && obraId && obra) {
      carregarMateriaisObra();
    }
  }, [abaAtiva, obraId, obra]);

  const abrirModalVisualizarTarefa = (tarefa: TarefaObra) => {
    setTarefaParaVisualizar(tarefa);
    setModalVisualizarTarefa(true);
  };

  const handleCriarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!obraId) return;
    
    if (!formTarefa.descricao) {
      toast.error('Descrição da tarefa é obrigatória');
      return;
    }

    // Validar datas se equipe for selecionada
    if (tipoAtribuicao === 'equipe' && formTarefa.equipeId) {
      if (!formTarefa.dataPrevista || !formTarefa.dataPrevistaFim) {
        toast.error('Data de início e fim são obrigatórias para alocação de equipe');
        return;
      }
    }

    try {
      // Verificar conflitos de alocação se for equipe
      if (tipoAtribuicao === 'equipe' && formTarefa.equipeId && formTarefa.dataPrevista && formTarefa.dataPrevistaFim) {
        const conflitosRes = await alocacaoService.verificarConflitos(
          formTarefa.equipeId,
          formTarefa.dataPrevista,
          formTarefa.dataPrevistaFim
        );

        if (conflitosRes.success && conflitosRes.data?.temConflito) {
          const conflitos = conflitosRes.data.conflitos;
          toast.error('⚠️ Conflito de Alocação', {
            description: `Esta equipe já está alocada em ${conflitos.length} tarefa(s) neste período.`,
            duration: 5000
          });
          
          // Mostrar detalhes dos conflitos
          conflitos.forEach(c => {
            console.warn(`Conflito: ${c.equipeNome} - ${c.tarefaDescricao} (${c.dataInicio} - ${c.dataFim})`);
          });
          
          return;
        }
      }

      // Criar a tarefa
      const tarefaData: any = {
        obraId,
        descricao: formTarefa.descricao,
        dataPrevista: formTarefa.dataPrevista,
        dataPrevistaFim: formTarefa.dataPrevistaFim,
        observacoes: formTarefa.observacoes
      };

      if (tipoAtribuicao === 'equipe' && formTarefa.equipeId) {
        tarefaData.equipeId = formTarefa.equipeId;
      } else if (tipoAtribuicao === 'individual' && formTarefa.atribuidoA) {
        tarefaData.atribuidoA = formTarefa.atribuidoA;
      }

      const tarefaRes = await axiosApiService.post('/api/obras/tarefas', tarefaData);
      
      // O axiosApiService já retorna { success, data }, então acessamos diretamente
      if (!tarefaRes.success || !tarefaRes.data) {
        throw new Error(tarefaRes.error || 'Erro ao criar tarefa');
      }
      
      const tarefaCriada = tarefaRes.data;
      
      if (!tarefaCriada.id) {
        throw new Error('Resposta inválida do servidor: tarefa criada sem ID');
      }

      // Se for equipe, criar alocação
      if (tipoAtribuicao === 'equipe' && formTarefa.equipeId && formTarefa.dataPrevista && formTarefa.dataPrevistaFim) {
        await alocacaoService.criar({
          tarefaId: tarefaCriada.id,
          obraId: obraId,
          equipeId: formTarefa.equipeId,
          dataInicio: formTarefa.dataPrevista,
          dataFim: formTarefa.dataPrevistaFim,
          observacoes: formTarefa.observacoes
        });

        const equipe = equipes.find(e => e.id === formTarefa.equipeId);
        toast.success('✅ Tarefa criada e equipe alocada!', {
          description: `Equipe "${equipe?.nome}" alocada de ${new Date(formTarefa.dataPrevista).toLocaleDateString('pt-BR')} até ${new Date(formTarefa.dataPrevistaFim).toLocaleDateString('pt-BR')}`
        });
      } else {
        toast.success('✅ Tarefa criada com sucesso!');
      }
      
      setModalNovaTarefa(false);
      setFormTarefa({ descricao: '', atribuidoA: '', equipeId: '', dataPrevista: '', dataPrevistaFim: '', observacoes: '' });
      carregarTarefas();
      carregarAlocacoes();
    } catch (error: any) {
      console.error('Erro ao criar tarefa:', error);
      toast.error(error?.response?.data?.error || 'Erro ao criar tarefa');
    }
  };

  const handleAtualizarTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tarefaEditando) return;

    try {
      const payload: any = {
        descricao: tarefaEditando.descricao,
        dataPrevista: tarefaEditando.dataPrevista || null,
        dataPrevistaFim: tarefaEditando.dataPrevistaFim || null,
        observacoes: tarefaEditando.observacoes || null,
        progresso: tarefaEditando.progresso
      };

      // Se for equipe, enviar equipeId e limpar atribuidoA
      if (tipoAtribuicaoEdicao === 'equipe' && tarefaEditando.equipeId) {
        payload.equipeId = tarefaEditando.equipeId;
        payload.atribuidoA = null;
      } else if (tipoAtribuicaoEdicao === 'individual' && tarefaEditando.atribuidoA) {
        payload.atribuidoA = tarefaEditando.atribuidoA;
        payload.equipeId = null;
      } else {
        // Se não tiver nenhum, limpar ambos
        payload.atribuidoA = null;
        payload.equipeId = null;
      }

      await axiosApiService.put(`/api/obras/tarefas/${tarefaEditando.id}`, payload);
      toast.success('✅ Tarefa atualizada com sucesso!');
      setModalEditarTarefa(false);
      setTarefaEditando(null);
      carregarTarefas();
      carregarAlocacoes();
    } catch (error: any) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error(error?.response?.data?.error || 'Erro ao atualizar tarefa');
    }
  };

  const handleExcluirTarefa = async (tarefaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await axiosApiService.delete(`/api/obras/tarefas/${tarefaId}`);
      toast.success('✅ Tarefa excluída com sucesso!');
      carregarTarefas();
    } catch (error: any) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error(error?.response?.data?.error || 'Erro ao excluir tarefa');
    }
  };

  const abrirModalEditarTarefa = (tarefa: TarefaObra) => {
    setTarefaEditando(tarefa);
    // Detectar se a tarefa tem equipe ou eletricista individual
    if (tarefa.equipeId) {
      setTipoAtribuicaoEdicao('equipe');
    } else {
      setTipoAtribuicaoEdicao('individual');
    }
    setModalEditarTarefa(true);
  };

  const abrirModalRegistro = (registro: RegistroAtividade) => {
    setRegistroSelecionado(registro);
    setModalRegistro(true);
  };

  const abrirModalImagens = (imagens: string[]) => {
    setImagensVisualizacao(imagens);
    setImagemAtual(0);
    setModalImagens(true);
  };

  const proximaImagem = () => {
    setImagemAtual((prev) => (prev + 1) % imagensVisualizacao.length);
  };

  const imagemAnterior = () => {
    setImagemAtual((prev) => (prev - 1 + imagensVisualizacao.length) % imagensVisualizacao.length);
  };

  const handleVoltar = () => {
    if (onNavigate) {
      onNavigate('Obras');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando dados da obra...</p>
        </div>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4 text-xl">Obra não encontrada</p>
          <button onClick={handleVoltar} className="btn-primary">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        {/* Header da Página */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {toggleSidebar && (
                  <button onClick={toggleSidebar} className="lg:hidden p-2 text-white hover:bg-white/20 rounded-lg transition-colors">
                    <Bars3Icon className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={handleVoltar}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{obra.nomeObra}</h1>
                  <div className="space-y-1 text-orange-50">
                    <p className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="font-medium">Cliente:</span> {obra.clienteNome}
                    </p>
                    {obra.endereco && (
                      <p className="text-sm">📍 {obra.endereco}</p>
                    )}
                    {obra.dataPrevistaInicio && obra.dataPrevistaFim && (
                      <p className="flex items-center gap-2 text-sm">
                        <ClockIcon className="w-4 h-4" />
                        {new Date(obra.dataPrevistaInicio).toLocaleDateString('pt-BR')} até {new Date(obra.dataPrevistaFim).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Progresso Geral */}
            <div className="mt-4 bg-white/20 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">Progresso Geral da Obra</span>
                <span className="text-white font-bold text-xl">{obra.progresso}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full transition-all shadow-lg"
                  style={{ width: `${obra.progresso}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sistema de Abas */}
        <div className="border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex">
              <button
                onClick={() => setAbaAtiva('visaoGeral')}
                className={`px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                  abaAtiva === 'visaoGeral'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-dark-card'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                📋 Visão Geral
              </button>
              <button
                onClick={() => setAbaAtiva('materiais')}
                className={`px-6 py-4 font-semibold text-sm transition-all border-b-2 ${
                  abaAtiva === 'materiais'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-dark-card'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                📦 Materiais
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {abaAtiva === 'visaoGeral' && (
            <>
              {/* Descrição da Obra */}
              {obra.descricao && (
                <div className="card-primary mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Descrição da Obra</h3>
                  <p className="text-gray-700 dark:text-dark-text-secondary whitespace-pre-wrap">{obra.descricao}</p>
                </div>
              )}

              {/* Header de Tarefas */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Tarefas da Obra</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                    {tarefas.length} {tarefas.length === 1 ? 'tarefa' : 'tarefas'} cadastradas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setModalEquipes(true)}
                    className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Gerenciar Equipes
                  </button>
                  <button
                    onClick={() => setModalNovaTarefa(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Nova Tarefa
                  </button>
                </div>
              </div>

              {/* Lista de Tarefas */}
              {tarefas.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                  <p className="text-gray-500 dark:text-dark-text-secondary mb-4">Nenhuma tarefa cadastrada ainda</p>
                  <button
                    onClick={() => setModalNovaTarefa(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Criar primeira tarefa
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {tarefas.map((tarefa) => (
                    <div key={tarefa.id} className="card-secondary border-l-4 border-orange-500">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-dark-text mb-1">{tarefa.descricao}</h4>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                            {/* Mostrar equipe alocada */}
                            {tarefa.equipeNome && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg font-semibold">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                👥 {tarefa.equipeNome}
                              </span>
                            )}
                            {/* Mostrar eletricista individual */}
                            {!tarefa.equipeNome && tarefa.atribuidoNome && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-4 h-4" />
                                {tarefa.atribuidoNome}
                              </span>
                            )}
                            {/* Datas - mostrar período se tiver data fim */}
                            {tarefa.dataPrevista && tarefa.dataPrevistaFim ? (
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                {new Date(tarefa.dataPrevista).toLocaleDateString('pt-BR')} - {new Date(tarefa.dataPrevistaFim).toLocaleDateString('pt-BR')}
                              </span>
                            ) : tarefa.dataPrevista ? (
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                {new Date(tarefa.dataPrevista).toLocaleDateString('pt-BR')}
                              </span>
                            ) : null}
                            {tarefa.dataConclusaoReal && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="w-4 h-4" />
                                Concluída em {new Date(tarefa.dataConclusaoReal).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {/* Botão Visualizar Tarefa - apenas para tarefas atribuídas */}
                          {(tarefa.equipeNome || tarefa.atribuidoNome) && (
                            <button
                              onClick={() => abrirModalVisualizarTarefa(tarefa)}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Visualizar tarefa ativa"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => abrirModalEditarTarefa(tarefa)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar tarefa"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleExcluirTarefa(tarefa.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir tarefa"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Progresso da Tarefa */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-dark-text-secondary">Progresso</span>
                          <span className="font-bold text-gray-900 dark:text-dark-text">{tarefa.progresso}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-orange-600 to-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${tarefa.progresso}%` }}
                          />
                        </div>
                      </div>

                      {/* Observações */}
                      {tarefa.observacoes && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-900 dark:text-blue-300">
                            <strong>Observações:</strong> {tarefa.observacoes}
                          </p>
                        </div>
                      )}

                      {/* Registros de Atividade */}
                      {tarefa.registrosAtividade && tarefa.registrosAtividade.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 dark:border-dark-border pt-4">
                          <h5 className="font-semibold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            Registros de Atividade ({tarefa.registrosAtividade.length})
                          </h5>
                          <div className="space-y-3">
                            {tarefa.registrosAtividade.map((registro) => (
                              <div key={registro.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-dark-text">
                                      {registro.descricaoAtividade}
                                    </p>
                                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                                      <span>{new Date(registro.dataRegistro).toLocaleDateString('pt-BR')}</span>
                                      <span>⏱️ {registro.horasTrabalhadas}h trabalhadas</span>
                                      {registro.imagens.length > 0 && (
                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                          <PhotoIcon className="w-4 h-4" />
                                          {registro.imagens.length} {registro.imagens.length === 1 ? 'foto' : 'fotos'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => abrirModalRegistro(registro)}
                                    className="ml-2 p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Ver detalhes"
                                  >
                                    <EyeIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Calendário de Alocações */}
              <div className="mt-8 pt-8 border-t-2 border-gray-200 dark:border-dark-border">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendário de Alocações de Equipes
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                    Visualize quando cada equipe está alocada nesta obra
                  </p>
                </div>
                
                {obraId && <CalendarioAlocacoes obraId={obraId} />}
              </div>
            </>
          )}

          {abaAtiva === 'materiais' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Materiais Alocados à Obra</h3>
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                    Materiais que foram alocados a esta obra através de baixas no estoque
                  </p>
                </div>
                <button
                  onClick={carregarMateriaisObra}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-hover transition-all font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Atualizar
                </button>
              </div>

              {loadingMateriais ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Carregando materiais...</p>
                </div>
              ) : materiaisObra.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-gray-500 dark:text-dark-text-secondary mb-2">Nenhum material alocado a esta obra</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Os materiais aparecerão aqui quando houver baixas no estoque referenciadas a esta obra
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {materiaisObra.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-dark-card rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-gray-500 dark:text-dark-text-secondary mb-2">Nenhum material alocado a esta obra</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Os materiais aparecerão aqui quando houver alocações do estoque para esta obra
                      </p>
                    </div>
                  ) : (
                    materiaisObra.map((mov: any, index: number) => (
                      <div key={mov.id || `material-${index}`} className="bg-white dark:bg-dark-card border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                                {mov.material?.nome || 'Material não encontrado'}
                              </h4>
                              <span className="px-3 py-1 rounded-lg font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                                ✓ Alocado
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary">
                                <strong className="text-gray-900 dark:text-dark-text">SKU:</strong>
                                <span>{mov.material?.sku || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary">
                                <strong className="text-gray-900 dark:text-dark-text">Quantidade:</strong>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {mov.quantidade} {mov.material?.unidadeMedida || 'un'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary">
                                <ClockIcon className="w-4 h-4" />
                                <strong className="text-gray-900 dark:text-dark-text">Data de Alocação:</strong>
                                <span>{new Date(mov.createdAt || mov.data).toLocaleDateString('pt-BR', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                              {mov.material?.categoria && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-dark-text-secondary">
                                  <strong className="text-gray-900 dark:text-dark-text">Categoria:</strong>
                                  <span>{mov.material.categoria}</span>
                                </div>
                              )}
                            </div>
                            {mov.observacoes && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-900 dark:text-blue-300">
                                  <strong>Observações:</strong> {mov.observacoes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modais - Mesmos do HubTarefasObra */}
      {/* Modal de Nova Tarefa */}
      {modalNovaTarefa && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Nova Tarefa</h3>
              <button
                onClick={() => setModalNovaTarefa(false)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleCriarTarefa} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Descrição da Tarefa *
                </label>
                <textarea
                  value={formTarefa.descricao}
                  onChange={(e) => setFormTarefa({ ...formTarefa, descricao: e.target.value })}
                  className="input-field"
                  rows={3}
                  required
                  placeholder="Descreva o que precisa ser feito..."
                />
              </div>

              {/* Toggle de Tipo de Atribuição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
                  Tipo de Atribuição
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoAtribuicao('equipe')}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                      tipoAtribuicao === 'equipe'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Atribuir Equipe
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoAtribuicao('individual')}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                      tipoAtribuicao === 'individual'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Atribuir Individual
                    </div>
                  </button>
                </div>
              </div>

              {/* Seletor de Equipe */}
              {tipoAtribuicao === 'equipe' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Selecionar Equipe *
                  </label>
                  <select
                    value={formTarefa.equipeId}
                    onChange={(e) => setFormTarefa({ ...formTarefa, equipeId: e.target.value })}
                    className="select-field"
                    required={tipoAtribuicao === 'equipe'}
                    disabled={equipes.length === 0}
                  >
                    <option value="">
                      {equipes.length === 0 ? 'Carregando equipes...' : 'Selecione uma equipe'}
                    </option>
                    {equipes.map((equipe) => (
                      <option key={equipe.id} value={equipe.id}>
                        {equipe.nome} - {equipe.tipo} ({equipe.membros?.length || 0} {equipe.membros?.length === 1 ? 'membro' : 'membros'})
                      </option>
                    ))}
                  </select>
                  
                  {equipes.length === 0 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Nenhuma equipe disponível. Crie equipes na página de Métricas de Equipe.
                    </p>
                  )}
                  
                  {/* Mostrar membros da equipe selecionada */}
                  {formTarefa.equipeId && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 mb-2">
                        👥 Membros da Equipe:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {equipes.find(e => e.id === formTarefa.equipeId)?.membros.map((membro) => (
                          <span
                            key={membro.id}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-lg text-xs font-medium"
                          >
                            {membro.nome} • {membro.funcao}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {equipes.length === 0 && (
                    <p className="text-xs text-orange-600 mt-2">
                      ⚠️ Nenhuma equipe disponível. Crie equipes primeiro na gestão de equipes.
                    </p>
                  )}
                </div>
              )}

              {/* Seletor Individual de Eletricista */}
              {tipoAtribuicao === 'individual' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Atribuir a Eletricista
                  </label>
                  <select
                    value={formTarefa.atribuidoA}
                    onChange={(e) => setFormTarefa({ ...formTarefa, atribuidoA: e.target.value })}
                    className="select-field"
                  >
                    <option value="">Não atribuído</option>
                    {eletricistas.map((eletricista) => (
                      <option key={eletricista.id} value={eletricista.id}>
                        {eletricista.name} ({eletricista.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Datas - Se for equipe, mostrar início e fim */}
              {tipoAtribuicao === 'equipe' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                      Data de Início *
                    </label>
                    <input
                      type="datetime-local"
                      value={formTarefa.dataPrevista}
                      onChange={(e) => setFormTarefa({ ...formTarefa, dataPrevista: e.target.value })}
                      className="input-field"
                      required={tipoAtribuicao === 'equipe'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                      Data de Término *
                    </label>
                    <input
                      type="datetime-local"
                      value={formTarefa.dataPrevistaFim}
                      onChange={(e) => setFormTarefa({ ...formTarefa, dataPrevistaFim: e.target.value })}
                      className="input-field"
                      required={tipoAtribuicao === 'equipe'}
                      min={formTarefa.dataPrevista}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    value={formTarefa.dataPrevista}
                    onChange={(e) => setFormTarefa({ ...formTarefa, dataPrevista: e.target.value })}
                    className="input-field"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Observações
                </label>
                <textarea
                  value={formTarefa.observacoes}
                  onChange={(e) => setFormTarefa({ ...formTarefa, observacoes: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Observações adicionais..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Criar Tarefa
                </button>
                <button type="button" onClick={() => setModalNovaTarefa(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar Tarefa */}
      {modalEditarTarefa && tarefaEditando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Editar Tarefa</h3>
              <button
                onClick={() => {
                  setModalEditarTarefa(false);
                  setTarefaEditando(null);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleAtualizarTarefa} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Descrição da Tarefa *
                </label>
                <textarea
                  value={tarefaEditando.descricao}
                  onChange={(e) => setTarefaEditando({ ...tarefaEditando, descricao: e.target.value })}
                  className="input-field"
                  rows={3}
                  required
                />
              </div>

              {/* Seletor de Tipo de Atribuição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Tipo de Atribuição
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoAtribuicaoEdicao"
                      value="equipe"
                      checked={tipoAtribuicaoEdicao === 'equipe'}
                      onChange={(e) => {
                        setTipoAtribuicaoEdicao('equipe');
                        setTarefaEditando({ ...tarefaEditando, atribuidoA: undefined });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Equipe</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoAtribuicaoEdicao"
                      value="individual"
                      checked={tipoAtribuicaoEdicao === 'individual'}
                      onChange={(e) => {
                        setTipoAtribuicaoEdicao('individual');
                        setTarefaEditando({ ...tarefaEditando, equipeId: undefined });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Eletricista Individual</span>
                  </label>
                </div>
              </div>

              {/* Seletor de Equipe */}
              {tipoAtribuicaoEdicao === 'equipe' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Atribuir a Equipe
                  </label>
                  <select
                    value={tarefaEditando.equipeId || ''}
                    onChange={(e) => setTarefaEditando({ ...tarefaEditando, equipeId: e.target.value })}
                    className="select-field"
                  >
                    <option value="">Selecione uma equipe</option>
                    {equipes.map((equipe) => (
                      <option key={equipe.id} value={equipe.id}>
                        {equipe.nome} - {equipe.tipo} ({equipe.membros?.length || 0} {equipe.membros?.length === 1 ? 'membro' : 'membros'})
                      </option>
                    ))}
                  </select>
                  
                  {tarefaEditando.equipeId && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 mb-2">
                        👥 Membros da Equipe:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {equipes.find(e => e.id === tarefaEditando.equipeId)?.membros.map((membro) => (
                          <span
                            key={membro.id}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded-lg text-xs font-medium"
                          >
                            {membro.nome} • {membro.funcao}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seletor Individual de Eletricista */}
              {tipoAtribuicaoEdicao === 'individual' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Atribuir a Eletricista
                  </label>
                  <select
                    value={tarefaEditando.atribuidoA || ''}
                    onChange={(e) => setTarefaEditando({ ...tarefaEditando, atribuidoA: e.target.value })}
                    className="select-field"
                  >
                    <option value="">Não atribuído</option>
                    {eletricistas.map((eletricista) => (
                      <option key={eletricista.id} value={eletricista.id}>
                        {eletricista.name} ({eletricista.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Datas - Se for equipe, mostrar início e fim */}
              {tipoAtribuicaoEdicao === 'equipe' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                      Data de Início *
                    </label>
                    <input
                      type="datetime-local"
                      value={tarefaEditando.dataPrevista ? new Date(tarefaEditando.dataPrevista).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setTarefaEditando({ ...tarefaEditando, dataPrevista: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                      Data de Término *
                    </label>
                    <input
                      type="datetime-local"
                      value={tarefaEditando.dataPrevistaFim ? new Date(tarefaEditando.dataPrevistaFim).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setTarefaEditando({ ...tarefaEditando, dataPrevistaFim: e.target.value })}
                      className="input-field"
                      required
                      min={tarefaEditando.dataPrevista || ''}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    value={tarefaEditando.dataPrevista ? new Date(tarefaEditando.dataPrevista).toISOString().split('T')[0] : ''}
                    onChange={(e) => setTarefaEditando({ ...tarefaEditando, dataPrevista: e.target.value })}
                    className="input-field"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Progresso (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tarefaEditando.progresso}
                  onChange={(e) => setTarefaEditando({ ...tarefaEditando, progresso: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                  Observações
                </label>
                <textarea
                  value={tarefaEditando.observacoes || ''}
                  onChange={(e) => setTarefaEditando({ ...tarefaEditando, observacoes: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalEditarTarefa(false);
                    setTarefaEditando(null);
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Registro */}
      {modalRegistro && registroSelecionado && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Detalhes do Registro</h3>
              <button
                onClick={() => {
                  setModalRegistro(false);
                  setRegistroSelecionado(null);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">Data do Registro</h4>
                <p className="text-lg text-gray-900 dark:text-dark-text">
                  {new Date(registroSelecionado.dataRegistro).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">Horas Trabalhadas</h4>
                <p className="text-lg text-gray-900 dark:text-dark-text">⏱️ {registroSelecionado.horasTrabalhadas} horas</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-2">Atividades Realizadas</h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-dark-text whitespace-pre-wrap">
                    {registroSelecionado.descricaoAtividade}
                  </p>
                </div>
              </div>

              {registroSelecionado.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-2">Observações</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-blue-900 dark:text-blue-300 whitespace-pre-wrap">
                      {registroSelecionado.observacoes}
                    </p>
                  </div>
                </div>
              )}

              {registroSelecionado.imagens && registroSelecionado.imagens.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-3">
                    Fotos ({registroSelecionado.imagens.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {registroSelecionado.imagens.map((imagem, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-4 hover:ring-orange-500 transition-all"
                        onClick={() => abrirModalImagens(registroSelecionado.imagens)}
                      >
                        <img
                          src={`${import.meta.env.VITE_API_URL || ''}${imagem}`}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setModalRegistro(false);
                    setRegistroSelecionado(null);
                  }}
                  className="btn-primary w-full"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Imagens (Galeria) */}
      {modalImagens && imagensVisualizacao.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4">
          <button
            onClick={() => setModalImagens(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>

          {imagensVisualizacao.length > 1 && (
            <>
              <button
                onClick={imagemAnterior}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={proximaImagem}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="max-w-6xl max-h-[90vh] flex flex-col items-center">
            <img
              src={`${import.meta.env.VITE_API_URL || ''}${imagensVisualizacao[imagemAtual]}`}
              alt={`Imagem ${imagemAtual + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            {imagensVisualizacao.length > 1 && (
              <p className="text-white mt-4 text-lg font-semibold">
                {imagemAtual + 1} / {imagensVisualizacao.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal de Gestão de Equipes */}
      <ModalEquipesDeObra
        isOpen={modalEquipes}
        onClose={() => {
          setModalEquipes(false);
          carregarEquipes(); // Recarregar equipes após fechar modal
        }}
      />

      {/* Modal de Visualização de Tarefa Ativa */}
      {modalVisualizarTarefa && tarefaParaVisualizar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <CheckCircleIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Visualizar Tarefa Ativa</h3>
                  <p className="text-green-100 text-sm mt-1">Detalhes completos da tarefa</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalVisualizarTarefa(false);
                  setTarefaParaVisualizar(null);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Descrição */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-2">
                  Descrição da Tarefa
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-lg text-gray-900 dark:text-dark-text font-medium">
                    {tarefaParaVisualizar.descricao}
                  </p>
                </div>
              </div>

              {/* Informações de Atribuição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tarefaParaVisualizar.equipeNome && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">
                      Equipe Alocada
                    </h4>
                    <p className="text-lg text-purple-900 dark:text-purple-300 font-semibold flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {tarefaParaVisualizar.equipeNome}
                    </p>
                  </div>
                )}
                {!tarefaParaVisualizar.equipeNome && tarefaParaVisualizar.atribuidoNome && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">
                      Eletricista Responsável
                    </h4>
                    <p className="text-lg text-blue-900 dark:text-blue-300 font-semibold flex items-center gap-2">
                      <UserIcon className="w-5 h-5" />
                      {tarefaParaVisualizar.atribuidoNome}
                    </p>
                  </div>
                )}
              </div>

              {/* Datas */}
              {(tarefaParaVisualizar.dataPrevista || tarefaParaVisualizar.dataPrevistaFim) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tarefaParaVisualizar.dataPrevista && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">
                        Data Prevista Início
                      </h4>
                      <p className="text-lg text-gray-900 dark:text-dark-text flex items-center gap-2">
                        <ClockIcon className="w-5 h-5" />
                        {new Date(tarefaParaVisualizar.dataPrevista).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  {tarefaParaVisualizar.dataPrevistaFim && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">
                        Data Prevista Fim
                      </h4>
                      <p className="text-lg text-gray-900 dark:text-dark-text flex items-center gap-2">
                        <ClockIcon className="w-5 h-5" />
                        {new Date(tarefaParaVisualizar.dataPrevistaFim).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  {tarefaParaVisualizar.dataConclusaoReal && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-1">
                        Data de Conclusão
                      </h4>
                      <p className="text-lg text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        {new Date(tarefaParaVisualizar.dataConclusaoReal).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Progresso */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary">
                    Progresso da Tarefa
                  </h4>
                  <span className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {tarefaParaVisualizar.progresso}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-600 to-green-500 h-4 rounded-full transition-all"
                    style={{ width: `${tarefaParaVisualizar.progresso}%` }}
                  />
                </div>
              </div>

              {/* Observações */}
              {tarefaParaVisualizar.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-2">
                    Observações
                  </h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-blue-900 dark:text-blue-300 whitespace-pre-wrap">
                      {tarefaParaVisualizar.observacoes}
                    </p>
                  </div>
                </div>
              )}

              {/* Registros de Atividade */}
              {tarefaParaVisualizar.registrosAtividade && tarefaParaVisualizar.registrosAtividade.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary mb-4">
                    Registros de Atividade ({tarefaParaVisualizar.registrosAtividade.length})
                  </h4>
                  <div className="space-y-3">
                    {tarefaParaVisualizar.registrosAtividade.map((registro) => (
                      <div key={registro.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-dark-text mb-2">
                              {registro.descricaoAtividade}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                              <span>
                                📅 {new Date(registro.dataRegistro).toLocaleDateString('pt-BR')}
                              </span>
                              <span>⏱️ {registro.horasTrabalhadas}h trabalhadas</span>
                              {registro.eletricistaNome && (
                                <span>👤 {registro.eletricistaNome}</span>
                              )}
                              {registro.imagens && registro.imagens.length > 0 && (
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <PhotoIcon className="w-4 h-4" />
                                  {registro.imagens.length} {registro.imagens.length === 1 ? 'foto' : 'fotos'}
                                </span>
                              )}
                            </div>
                            {registro.observacoes && (
                              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                <strong>Observações:</strong> {registro.observacoes}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              abrirModalRegistro(registro);
                              setModalVisualizarTarefa(false);
                            }}
                            className="ml-2 p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver detalhes completos"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!tarefaParaVisualizar.registrosAtividade || tarefaParaVisualizar.registrosAtividade.length === 0) && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400">Nenhum registro de atividade ainda</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setModalVisualizarTarefa(false);
                  setTarefaParaVisualizar(null);
                }}
                className="px-6 py-3 bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all font-semibold"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setModalVisualizarTarefa(false);
                  abrirModalEditarTarefa(tarefaParaVisualizar);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold flex items-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                Editar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DetalhesObra;

