import { Response } from 'express';
import { EventoStatus } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { eventosCalendarioService } from '../services/eventosCalendario.service';
import { calcularCapacidadeCalendario } from '../services/capacidadeCalendario.service';
import { ProjetoStatus } from '@prisma/client';

function parseDateQuery(value: unknown, field: string): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export const listarEventosCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dataInicio = parseDateQuery(req.query.dataInicio, 'dataInicio');
    const dataFim = parseDateQuery(req.query.dataFim, 'dataFim');

    if (!dataInicio || !dataFim) {
      res.status(400).json({ success: false, error: 'Parâmetros dataInicio e dataFim são obrigatórios' });
      return;
    }

    const statusParam = req.query.status as string | undefined;
    const status =
      statusParam && Object.values(EventoStatus).includes(statusParam as EventoStatus)
        ? (statusParam as EventoStatus)
        : undefined;

    const eventos = await eventosCalendarioService.listar(
      {
        dataInicio,
        dataFim,
        status,
        tipo: typeof req.query.tipo === 'string' ? req.query.tipo : undefined,
        busca: typeof req.query.busca === 'string' ? req.query.busca : undefined,
        projetoId: typeof req.query.projetoId === 'string' ? req.query.projetoId : undefined,
      },
      req.user
    );

    res.json({ success: true, data: eventos });
  } catch (error) {
    console.error('Erro ao listar eventos de calendário:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar eventos de calendário' });
  }
};

export const buscarEquipeCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const excluirRaw = typeof req.query.excluirIds === 'string' ? req.query.excluirIds : '';
    const excluirIds = excluirRaw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const equipe = await eventosCalendarioService.buscarFuncionarios(q, excluirIds);
    res.json({ success: true, data: equipe });
  } catch (error) {
    console.error('Erro ao buscar equipe para calendário:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar funcionários' });
  }
};

export const buscarEquipesPreMontadasCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const equipes = await eventosCalendarioService.buscarEquipesPreMontadas(q);
    res.json({ success: true, data: equipes });
  } catch (error) {
    console.error('Erro ao buscar equipes pré-montadas:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar equipes' });
  }
};

export const resolverFuncionariosEquipeCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { equipeId } = req.params;
    const excluirRaw = typeof req.query.excluirIds === 'string' ? req.query.excluirIds : '';
    const excluirIds = excluirRaw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const resultado = await eventosCalendarioService.resolverFuncionariosEquipePreMontada(
      equipeId,
      excluirIds
    );
    res.json({ success: true, data: resultado });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao resolver equipe';
    const statusCode = message.includes('não encontrada') ? 404 : 500;
    console.error('Erro ao resolver funcionários da equipe:', error);
    res.status(statusCode).json({ success: false, error: message });
  }
};

export const buscarEventoCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const evento = await eventosCalendarioService.buscarPorId(id, req.user);
    if (!evento) {
      res.status(404).json({ success: false, error: 'Evento não encontrado' });
      return;
    }
    res.json({ success: true, data: evento });
  } catch (error) {
    console.error('Erro ao buscar evento de calendário:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar evento de calendário' });
  }
};

export const criarEventoCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { titulo, descricao, dataInicio, dataFim, status, tipo, orcamentoId, projetoId, custoVeiculo, equipeIds, veiculoIds, snapWorkshift, alocarPeriodoOs } = req.body;

    if (!titulo?.trim()) {
      res.status(400).json({ success: false, error: 'Título é obrigatório' });
      return;
    }
    if (!dataInicio || !dataFim) {
      res.status(400).json({ success: false, error: 'Data início e data fim são obrigatórias' });
      return;
    }

    const evento = await eventosCalendarioService.criar(
      {
        titulo,
        descricao,
        dataInicio,
        dataFim,
        status,
        tipo,
        orcamentoId,
        projetoId,
        custoVeiculo,
        equipeIds: Array.isArray(equipeIds) ? equipeIds : [],
        veiculoIds: Array.isArray(veiculoIds) ? veiculoIds : [],
        snapWorkshift: Boolean(snapWorkshift),
        alocarPeriodoOs: alocarPeriodoOs === true,
      },
      req.user
    );

    res.status(201).json({ success: true, data: evento });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar evento';
    const statusCode = message.includes('inválid') || message.includes('não encontrado') || message.includes('Data fim') || message.includes('período') || message.includes('prazo') ? 400 : 500;
    console.error('Erro ao criar evento de calendário:', error);
    res.status(statusCode).json({ success: false, error: message });
  }
};

export const atualizarEventoCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { titulo, descricao, dataInicio, dataFim, status, tipo, orcamentoId, projetoId, custoVeiculo, equipeIds, veiculoIds, snapWorkshift, alocarPeriodoOs } = req.body;

    const evento = await eventosCalendarioService.atualizar(
      id,
      {
        titulo,
        descricao,
        dataInicio,
        dataFim,
        status,
        tipo,
        orcamentoId,
        projetoId,
        custoVeiculo,
        equipeIds: equipeIds !== undefined ? (Array.isArray(equipeIds) ? equipeIds : []) : undefined,
        veiculoIds: veiculoIds !== undefined ? (Array.isArray(veiculoIds) ? veiculoIds : []) : undefined,
        snapWorkshift: snapWorkshift === undefined ? undefined : Boolean(snapWorkshift),
        alocarPeriodoOs: alocarPeriodoOs === undefined ? undefined : alocarPeriodoOs === true,
      },
      req.user
    );

    if (!evento) {
      res.status(404).json({ success: false, error: 'Evento não encontrado' });
      return;
    }

    res.json({ success: true, data: evento });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar evento';
    const statusCode = message.includes('inválid') || message.includes('não encontrado') || message.includes('Data fim') || message.includes('período') || message.includes('prazo') ? 400 : 500;
    console.error('Erro ao atualizar evento de calendário:', error);
    res.status(statusCode).json({ success: false, error: message });
  }
};

export const excluirEventoCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const removido = await eventosCalendarioService.excluir(id);
    if (!removido) {
      res.status(404).json({ success: false, error: 'Evento não encontrado' });
      return;
    }
    res.json({ success: true, message: 'Evento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir evento de calendário:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir evento de calendário' });
  }
};

export const confirmarEventoCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const evento = await eventosCalendarioService.confirmar(id, req.user);
    if (!evento) {
      res.status(404).json({ success: false, error: 'Evento não encontrado' });
      return;
    }
    res.json({ success: true, data: evento });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao confirmar evento';
    const statusCode = message.includes('Vincule') ? 400 : 500;
    console.error('Erro ao confirmar evento de calendário:', error);
    res.status(statusCode).json({ success: false, error: message });
  }
};

export const listarFuncionariosAlocacaoCalendario = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await eventosCalendarioService.listarFuncionariosAlocacao();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao listar funcionários para alocação:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar funcionários' });
  }
};

export const obterCapacidadeCalendario = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dataInicio = parseDateQuery(req.query.dataInicio, 'dataInicio');
    const dataFim = parseDateQuery(req.query.dataFim, 'dataFim');
    if (!dataInicio || !dataFim) {
      res.status(400).json({ success: false, error: 'Parâmetros dataInicio e dataFim são obrigatórios' });
      return;
    }

    const responsavelId =
      typeof req.query.responsavelId === 'string' ? req.query.responsavelId : undefined;

    let status: ProjetoStatus[] | undefined;
    if (typeof req.query.status === 'string' && req.query.status.trim()) {
      status = req.query.status
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ProjetoStatus =>
          ['PROPOSTA', 'APROVADO', 'EXECUCAO', 'CONCLUIDO', 'CANCELADO'].includes(s) ||
            s === 'VALIDADO'
        );
    }

    const resultado = await calcularCapacidadeCalendario({
      dataInicio,
      dataFim,
      responsavelId,
      status,
    });

    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Erro ao calcular capacidade do calendário:', error);
    res.status(500).json({ success: false, error: 'Erro ao calcular capacidade do calendário' });
  }
};
