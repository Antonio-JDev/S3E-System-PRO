import React, { useState, useEffect, useMemo } from 'react';
import { useAlocacoes, type NovaAlocacao, type Equipe } from '../../hooks/useAlocacoes';
import ModalGerenciarEquipes from '../../components/ModalGerenciarEquipes';
import GanttChart, { type GanttItem } from '../../components/GanttChart';
import EquipesGantt from '../../components/Obras/EquipesGantt';
import EquipeManagerModal from '../../components/Obras/EquipeManagerModal';

// Ícones
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>;
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>;
const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>;
const ExclamationCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>;

interface GerenciamentoObrasProps {
  toggleSidebar: () => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TIPO_EQUIPE_COLORS = {
  MONTAGEM: 'bg-blue-500',
  CAMPO: 'bg-green-500',
  DISTINTA: 'bg-purple-500'
};

const STATUS_COLORS = {
  Planejada: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  EmAndamento: 'bg-blue-100 text-blue-800 border-blue-300',
  Concluida: 'bg-green-100 text-green-800 border-green-300',
  Cancelada: 'bg-red-100 text-red-800 border-red-300'
};

const GerenciamentoObras: React.FC<GerenciamentoObrasProps> = ({ toggleSidebar }) => {
  const {
    equipes,
    alocacoes,
    estatisticas,
    loading,
    error,
    fetchAlocacoesCalendario,
    fetchEquipesDisponiveis,
    criarAlocacao,
    iniciarAlocacao,
    concluirAlocacao,
    cancelarAlocacao
  } = useAlocacoes();

  // Estado do calendário
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  // Estado do modal de nova alocação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [equipesDisponiveis, setEquipesDisponiveis] = useState<Equipe[]>([]);
  const [formData, setFormData] = useState<NovaAlocacao>({
    equipeId: '',
    projetoId: '',
    dataInicio: '',
    duracaoDias: 20,
    observacoes: ''
  });

  // Estado de detalhes da alocação
  const [alocacaoSelecionada, setAlocacaoSelecionada] = useState<string | null>(null);
  
  // Estado do modal de gerenciar equipes
  const [isModalEquipesOpen, setIsModalEquipesOpen] = useState(false);
  
  // Estado do novo modal de gestão de equipes
  const [isEquipeManagerOpen, setIsEquipeManagerOpen] = useState(false);
  
  // Estado da visualização (calendário, gantt ou timeline)
  const [visualizacao, setVisualizacao] = useState<'calendario' | 'gantt' | 'timeline'>('timeline');

  // Atualizar calendário quando mês/ano mudar
  useEffect(() => {
    fetchAlocacoesCalendario(mesAtual, anoAtual);
  }, [mesAtual, anoAtual, fetchAlocacoesCalendario]);

  // Navegação do calendário
  const handleMesAnterior = () => {
    if (mesAtual === 1) {
      setMesAtual(12);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  };

  const handleProximoMes = () => {
    if (mesAtual === 12) {
      setMesAtual(1);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  };

  const handleMesAtual = () => {
    const hoje = new Date();
    setMesAtual(hoje.getMonth() + 1);
    setAnoAtual(hoje.getFullYear());
  };

  // Converter alocações para formato do Gantt Chart
  const ganttItems: GanttItem[] = useMemo(() => {
    return alocacoes.map(alocacao => {
      const startDate = new Date(alocacao.dataInicio);
      const endDate = alocacao.dataFimPrevisto ? new Date(alocacao.dataFimPrevisto) : new Date(startDate.getTime() + (20 * 24 * 60 * 60 * 1000)); // 20 dias padrão
      
      // Calcular progresso baseado no status e dias decorridos
      let progress = 0;
      if (alocacao.status === 'Concluida') {
        progress = 100;
      } else if (alocacao.status === 'EmAndamento') {
        const hoje = new Date();
        const diasDecorridos = Math.floor((hoje.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const diasTotal = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        progress = Math.min(90, Math.max(10, (diasDecorridos / diasTotal) * 100));
      }

      return {
        id: alocacao.id,
        title: alocacao.projeto.titulo || `Projeto ${alocacao.id}`,
        startDate,
        endDate,
        progress,
        status: alocacao.status === 'Concluida' ? 'completed' : 
                alocacao.status === 'EmAndamento' ? 'in-progress' : 'planned',
        team: alocacao.equipe.nome,
        color: TIPO_EQUIPE_COLORS[alocacao.equipe.tipo as keyof typeof TIPO_EQUIPE_COLORS] || '#6b7280'
      };
    });
  }, [alocacoes]);

  // Calcular período para o Gantt Chart (3 meses a partir do mês atual)
  const ganttStartDate = new Date(anoAtual, mesAtual - 1, 1);
  const ganttEndDate = new Date(anoAtual, mesAtual + 2, 0); // Final do terceiro mês

  // Abrir modal de nova alocação
  const handleAbrirModal = async () => {
    // Calcular período de 30 dias a partir de hoje
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 30);

    const disponiveis = await fetchEquipesDisponiveis(
      dataInicio.toISOString().split('T')[0],
      dataFim.toISOString().split('T')[0]
    );

    setEquipesDisponiveis(disponiveis);
    setIsModalOpen(true);
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setFormData({
      equipeId: '',
      projetoId: '',
      dataInicio: '',
      duracaoDias: 20,
      observacoes: ''
    });
  };

  // Submeter nova alocação
  const handleSubmitAlocacao = async (e: React.FormEvent) => {
    e.preventDefault();

    const resultado = await criarAlocacao(formData);

    if (resultado.success) {
      handleFecharModal();
      fetchAlocacoesCalendario(mesAtual, anoAtual);
      alert('Alocação criada com sucesso!');
    } else {
      alert(`Erro ao criar alocação: ${resultado.error}`);
    }
  };

  // Calcular dias do mês para o calendário
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(anoAtual, mesAtual - 1, 1);
    const ultimoDia = new Date(anoAtual, mesAtual, 0);
    const diasNoMes = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay(); // 0 = Domingo

    const dias = [];
    
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push({ dia: null, alocacoes: [] });
    }

    // Dias do mês
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataAtual = new Date(anoAtual, mesAtual - 1, dia);
      const alocacoesNoDia = alocacoes.filter(alocacao => {
        const inicio = new Date(alocacao.dataInicio);
        const fim = new Date(alocacao.dataFimPrevisto);
        return dataAtual >= inicio && dataAtual <= fim;
      });

      dias.push({ dia, alocacoes: alocacoesNoDia });
    }

    return dias;
  }, [anoAtual, mesAtual, alocacoes]);

  // Status das equipes
  const equipesComStatus = useMemo(() => {
    return equipes.map(equipe => {
      const alocacaoAtiva = alocacoes.find(
        a => a.equipe.id === equipe.id && (a.status === 'EmAndamento' || a.status === 'Planejada')
      );
      return {
        ...equipe,
        ocupada: !!alocacaoAtiva,
        alocacaoAtual: alocacaoAtiva
      };
    });
  }, [equipes, alocacoes]);

  // Ações de alocação
  const handleIniciarAlocacao = async (alocacaoId: string) => {
    const resultado = await iniciarAlocacao(alocacaoId);
    if (resultado.success) {
      fetchAlocacoesCalendario(mesAtual, anoAtual);
      alert('Alocação iniciada!');
    } else {
      alert(`Erro: ${resultado.error}`);
    }
  };

  const handleConcluirAlocacao = async (alocacaoId: string) => {
    const resultado = await concluirAlocacao(alocacaoId);
    if (resultado.success) {
      fetchAlocacoesCalendario(mesAtual, anoAtual);
      alert('Alocação concluída!');
    } else {
      alert(`Erro: ${resultado.error}`);
    }
  };

  const handleCancelarAlocacao = async (alocacaoId: string) => {
    const motivo = prompt('Motivo do cancelamento:');
    if (motivo) {
      const resultado = await cancelarAlocacao(alocacaoId, motivo);
      if (resultado.success) {
        fetchAlocacoesCalendario(mesAtual, anoAtual);
        alert('Alocação cancelada!');
      } else {
        alert(`Erro: ${resultado.error}`);
      }
    }
  };

  return (
    <div className="flex h-screen bg-brand-gray-50">
      {/* Sidebar de Equipes */}
      <aside className="w-80 bg-white border-r border-brand-gray-200 flex flex-col">
        <div className="p-6 border-b border-brand-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <UserGroupIcon className="w-8 h-8 text-brand-blue" />
            <h2 className="text-xl font-bold text-brand-gray-900">Equipes</h2>
          </div>
          
          {/* Estatísticas */}
          {estatisticas && (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-brand-blue-light p-3 rounded-lg">
                <div className="text-2xl font-bold text-brand-blue">{estatisticas.totalEquipes}</div>
                <div className="text-xs text-brand-gray-600">Total</div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{estatisticas.equipesDisponiveis}</div>
                <div className="text-xs text-brand-gray-600">Disponíveis</div>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Equipes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <div className="text-center text-brand-gray-500">Carregando...</div>}
          
          {equipesComStatus.map(equipe => (
            <div
              key={equipe.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                equipe.ocupada
                  ? 'bg-red-50 border-red-300'
                  : 'bg-green-50 border-green-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${TIPO_EQUIPE_COLORS[equipe.tipo]}`}></div>
                <div className="font-bold text-brand-gray-900">{equipe.nome}</div>
              </div>
              
              <div className="text-sm text-brand-gray-600 mb-1">
                Tipo: <span className="font-semibold">{equipe.tipo}</span>
              </div>
              
              <div className="text-sm text-brand-gray-600 mb-2">
                Membros: <span className="font-semibold">{equipe.membros.length}</span>
              </div>

              <div className={`flex items-center gap-2 text-xs font-semibold ${
                equipe.ocupada ? 'text-red-700' : 'text-green-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${equipe.ocupada ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                {equipe.ocupada ? 'OCUPADA' : 'DISPONÍVEL'}
              </div>

              {equipe.alocacaoAtual && (
                <div className="mt-2 pt-2 border-t border-brand-gray-200">
                  <div className="text-xs text-brand-gray-600">
                    <strong>Projeto:</strong> {equipe.alocacaoAtual.projeto.titulo}
                  </div>
                  <div className="text-xs text-brand-gray-600">
                    <strong>Até:</strong> {new Date(equipe.alocacaoAtual.dataFimPrevisto).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-brand-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 text-brand-gray-500 hover:bg-brand-gray-100 rounded-md"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-brand-gray-900">Métricas de Equipe</h1>
                <p className="text-sm text-brand-gray-600">
                  {visualizacao === 'calendario' ? 'Calendário de Alocação de Equipes' : 
                   visualizacao === 'gantt' ? 'Gantt Chart - Cronograma de Projetos' : 
                   'Timeline de Equipes - Visualização Gantt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botões de Visualização */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setVisualizacao('timeline')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    visualizacao === 'timeline'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Timeline
                </button>
                <button
                  onClick={() => setVisualizacao('calendario')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    visualizacao === 'calendario'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  Calendário
                </button>
                <button
                  onClick={() => setVisualizacao('gantt')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    visualizacao === 'gantt'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Gantt
                </button>
              </div>
              
              <button
                onClick={() => setIsEquipeManagerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-brand-blue text-brand-blue font-semibold rounded-lg shadow-sm hover:bg-brand-blue-light transition-colors"
              >
                <UserGroupIcon className="w-5 h-5" />
                Gerenciar Equipe
              </button>
              <button
                onClick={handleAbrirModal}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg shadow-sm hover:bg-brand-blue/90 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Nova Alocação
              </button>
            </div>
          </div>
        </header>

        {/* Navegação do Calendário */}
        {visualizacao === 'calendario' && (
          <div className="bg-white border-b border-brand-gray-200 p-4">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <button
                onClick={handleMesAnterior}
                className="p-2 hover:bg-brand-gray-100 rounded-md transition-colors"
              >
                <ChevronLeftIcon className="w-6 h-6 text-brand-gray-700" />
              </button>

              <div className="flex items-center gap-4">
                <CalendarIcon className="w-6 h-6 text-brand-gray-600" />
                <h2 className="text-xl font-bold text-brand-gray-900">
                  {MESES[mesAtual - 1]} {anoAtual}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleMesAtual}
                  className="px-3 py-1 text-sm font-semibold text-brand-blue hover:bg-brand-blue-light rounded-md transition-colors"
                >
                  Hoje
                </button>
                <button
                  onClick={handleProximoMes}
                  className="p-2 hover:bg-brand-gray-100 rounded-md transition-colors"
                >
                  <ChevronRightIcon className="w-6 h-6 text-brand-gray-700" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-red-800">
              <ExclamationCircleIcon className="w-5 h-5" />
              {error}
            </div>
          )}

          {visualizacao === 'calendario' && (
            <div className="max-w-7xl mx-auto">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                <div key={dia} className="text-center font-semibold text-brand-gray-700 py-2">
                  {dia}
                </div>
              ))}
            </div>

            {/* Grid do calendário */}
            <div className="grid grid-cols-7 gap-2">
              {diasDoMes.map((diaInfo, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 rounded-lg border ${
                    diaInfo.dia
                      ? 'bg-white border-brand-gray-200 hover:border-brand-blue hover:shadow-sm transition-all'
                      : 'bg-brand-gray-50 border-brand-gray-100'
                  }`}
                >
                  {diaInfo.dia && (
                    <>
                      <div className="text-right font-semibold text-brand-gray-700 mb-2">
                        {diaInfo.dia}
                      </div>
                      
                      {/* Alocações do dia */}
                      <div className="space-y-1">
                        {diaInfo.alocacoes.slice(0, 2).map(alocacao => (
                          <button
                            key={alocacao.id}
                            onClick={() => setAlocacaoSelecionada(alocacaoSelecionada === alocacao.id ? null : alocacao.id)}
                            className={`w-full text-left px-2 py-1 rounded text-xs font-medium border ${
                              STATUS_COLORS[alocacao.status]
                            } hover:shadow-md transition-all`}
                          >
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${TIPO_EQUIPE_COLORS[alocacao.equipe.tipo]}`}></div>
                              <span className="truncate">{alocacao.equipe.nome}</span>
                            </div>
                            <div className="truncate text-[10px] mt-0.5">
                              {alocacao.projeto.titulo}
                            </div>
                          </button>
                        ))}
                        
                        {diaInfo.alocacoes.length > 2 && (
                          <div className="text-xs text-brand-gray-500 text-center">
                            +{diaInfo.alocacoes.length - 2} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Lista de Alocações Detalhada */}
          <div className="max-w-7xl mx-auto mt-8">
            <h3 className="text-lg font-bold text-brand-gray-900 mb-4">Alocações do Mês</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alocacoes.map(alocacao => (
                <div
                  key={alocacao.id}
                  className={`p-4 rounded-lg border-2 ${
                    alocacaoSelecionada === alocacao.id
                      ? 'border-brand-blue shadow-lg'
                      : 'border-brand-gray-200'
                  } bg-white`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${TIPO_EQUIPE_COLORS[alocacao.equipe.tipo]}`}></div>
                      <h4 className="font-bold text-brand-gray-900">{alocacao.equipe.nome}</h4>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[alocacao.status]}`}>
                      {alocacao.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-brand-gray-600">
                    <div>
                      <strong>Projeto:</strong> {alocacao.projeto.titulo}
                    </div>
                    <div>
                      <strong>Cliente:</strong> {alocacao.projeto.cliente}
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <strong>Início:</strong> {new Date(alocacao.dataInicio).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <strong>Fim Previsto:</strong> {new Date(alocacao.dataFimPrevisto).toLocaleDateString('pt-BR')}
                    </div>
                    {alocacao.observacoes && (
                      <div className="text-xs italic text-brand-gray-500">
                        {alocacao.observacoes}
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="mt-4 pt-3 border-t border-brand-gray-200 flex gap-2">
                    {alocacao.status === 'Planejada' && (
                      <button
                        onClick={() => handleIniciarAlocacao(alocacao.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                      >
                        <PlayIcon className="w-4 h-4" />
                        Iniciar
                      </button>
                    )}
                    {alocacao.status === 'EmAndamento' && (
                      <button
                        onClick={() => handleConcluirAlocacao(alocacao.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Concluir
                      </button>
                    )}
                    {(alocacao.status === 'Planejada' || alocacao.status === 'EmAndamento') && (
                      <button
                        onClick={() => handleCancelarAlocacao(alocacao.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {visualizacao === 'timeline' && (
          <div className="max-w-7xl mx-auto p-6">
            <EquipesGantt
              onEquipeClick={(equipe) => {
                console.log('Equipe clicada:', equipe);
                // Aqui você pode implementar ações quando uma equipe é clicada
              }}
              onAlocacaoClick={(alocacao) => {
                console.log('Alocação clicada:', alocacao);
                setAlocacaoSelecionada(alocacao.id);
              }}
            />
          </div>
        )}

        {visualizacao === 'gantt' && (
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Cronograma de Projetos - {MESES[mesAtual - 1]} {anoAtual}
            </h2>
            <p className="text-gray-600">
              Visualização em Gantt Chart das alocações de equipes nos próximos 3 meses
            </p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
            </div>
          ) : ganttItems.length > 0 ? (
            <GanttChart
              items={ganttItems}
              startDate={ganttStartDate}
              endDate={ganttEndDate}
              onItemClick={(item) => {
                const alocacao = alocacoes.find(a => a.id === item.id);
                if (alocacao) {
                  setAlocacaoSelecionada(alocacao.id);
                }
              }}
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <p className="text-gray-600">Nenhuma alocação encontrada</p>
              <p className="text-sm text-gray-500 mt-2">Crie uma nova alocação para ver o cronograma</p>
            </div>
          )}
        </div>
        )}

      {/* Modal de Nova Alocação */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-brand-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-brand-gray-900">Nova Alocação</h2>
              <button
                onClick={handleFecharModal}
                className="p-1 rounded-full text-brand-gray-400 hover:bg-brand-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitAlocacao} className="p-6 space-y-6">
              {/* Seleção de Equipe */}
              <div>
                <label className="block text-sm font-semibold text-brand-gray-700 mb-2">
                  Equipe *
                </label>
                <select
                  value={formData.equipeId}
                  onChange={(e) => setFormData({ ...formData, equipeId: e.target.value })}
                  className="w-full px-4 py-3 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                >
                  <option value="">Selecione uma equipe disponível</option>
                  {equipesDisponiveis.map(equipe => (
                    <option key={equipe.id} value={equipe.id}>
                      {equipe.nome} - {equipe.tipo} ({equipe.membros.length} membros)
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-brand-gray-500">
                  Apenas equipes disponíveis nos próximos 30 dias são exibidas
                </p>
              </div>

              {/* Seleção de Projeto */}
              <div>
                <label className="block text-sm font-semibold text-brand-gray-700 mb-2">
                  Projeto/Obra *
                </label>
                <input
                  type="text"
                  value={formData.projetoId}
                  onChange={(e) => setFormData({ ...formData, projetoId: e.target.value })}
                  placeholder="ID do Projeto"
                  className="w-full px-4 py-3 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                />
                <p className="mt-1 text-xs text-brand-gray-500">
                  Digite o ID do projeto para esta alocação
                </p>
              </div>

              {/* Data e Duração */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-gray-700 mb-2">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                    className="w-full px-4 py-3 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-brand-gray-700 mb-2">
                    Duração (dias úteis) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={formData.duracaoDias}
                    onChange={(e) => setFormData({ ...formData, duracaoDias: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-xs text-brand-gray-500">
                    20 dias ≈ 1 mês
                  </p>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-brand-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  placeholder="Informações adicionais sobre esta alocação..."
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t border-brand-gray-200">
                <button
                  type="button"
                  onClick={handleFecharModal}
                  className="px-6 py-2 bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold rounded-lg hover:bg-brand-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Criando...' : 'Criar Alocação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciar Equipes */}
      <ModalGerenciarEquipes
        isOpen={isModalEquipesOpen}
        onClose={() => setIsModalEquipesOpen(false)}
      />

      {/* Novo Modal de Gestão de Equipes */}
      <EquipeManagerModal
        isOpen={isEquipeManagerOpen}
        onClose={() => setIsEquipeManagerOpen(false)}
        onEquipeEdit={(equipe) => {
          console.log('Editar equipe:', equipe);
          // Aqui você pode implementar a edição de equipes
        }}
      />
      </div>
    </div>
  );
};

export default GerenciamentoObras;

