import { prisma } from '../lib/prisma';
import { fetchWhatsappProviderSessionStatus } from '../services/whatsappProvider.service';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

export interface ParamsOs {
  status?: string;
  limit?: number;
  clienteNome?: string;
}

export interface ParamsOrcamento {
  status?: string;
  limit?: number;
  clienteNome?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function limitarQtd(valor: unknown, padrao = 20): number {
  const n = typeof valor === 'number' ? valor : padrao;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

function semVazios(obj: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') saida[k] = v;
  }
  return saida;
}

// ──────────────────────────────────────────────────────────────────────────────
// get_os_status — Ordens de Servico (model Projeto)
// ──────────────────────────────────────────────────────────────────────────────

export async function getOsStatus(params: ParamsOs = {}): Promise<Record<string, unknown>> {
  try {
    const limit = limitarQtd(params.limit, 20);
    const statusFiltro = typeof params.status === 'string' && params.status.trim()
      ? params.status.trim()
      : undefined;
    const clienteFiltro = typeof params.clienteNome === 'string' && params.clienteNome.trim()
      ? params.clienteNome.trim()
      : undefined;

    const where: Record<string, unknown> = {};
    if (statusFiltro) where.status = statusFiltro;
    if (clienteFiltro) {
      where.cliente = { nome: { contains: clienteFiltro, mode: 'insensitive' } };
    }

    const registros = await prisma.projeto.findMany({
      where: where as any,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        titulo: true,
        status: true,
        tipo: true,
        dataInicio: true,
        dataPrevisao: true,
        dataFim: true,
        dataConclusao: true,
        enderecoObra: true,
        cidade: true,
        valorTotal: true,
        createdAt: true,
        updatedAt: true,
        cliente: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, name: true } },
        orcamento: { select: { id: true, numeroSequencial: true, status: true } },
      },
    });

    const os = registros.map((r) =>
      semVazios({
        id: r.id,
        titulo: r.titulo,
        status: r.status,
        tipo: r.tipo,
        cliente: r.cliente ? { id: r.cliente.id, nome: (r.cliente as any).nome } : undefined,
        responsavel: r.responsavel ? { id: r.responsavel.id, nome: r.responsavel.name } : undefined,
        orcamento: r.orcamento
          ? { id: r.orcamento.id, numero: r.orcamento.numeroSequencial, status: r.orcamento.status }
          : undefined,
        valorTotal: r.valorTotal,
        enderecoObra: r.enderecoObra,
        cidade: r.cidade,
        dataInicio: r.dataInicio instanceof Date ? r.dataInicio.toISOString() : r.dataInicio,
        dataPrevisao: r.dataPrevisao instanceof Date ? r.dataPrevisao.toISOString() : r.dataPrevisao,
        dataFim: r.dataFim instanceof Date ? r.dataFim.toISOString() : r.dataFim,
        dataConclusao: r.dataConclusao instanceof Date ? r.dataConclusao.toISOString() : r.dataConclusao,
        criadoEm: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        atualizadoEm: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })
    );

    return {
      ok: true,
      total: os.length,
      filtro: { status: statusFiltro ?? null, clienteNome: clienteFiltro ?? null, limit },
      ordens: os,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'falha desconhecida';
    return { ok: false, error: `Erro ao consultar OS: ${msg}` };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// get_orcamentos
// ──────────────────────────────────────────────────────────────────────────────

export async function getOrcamentos(params: ParamsOrcamento = {}): Promise<Record<string, unknown>> {
  try {
    const limit = limitarQtd(params.limit, 20);
    const statusFiltro = typeof params.status === 'string' && params.status.trim()
      ? params.status.trim()
      : undefined;
    const clienteFiltro = typeof params.clienteNome === 'string' && params.clienteNome.trim()
      ? params.clienteNome.trim()
      : undefined;

    const where: Record<string, unknown> = {};
    if (statusFiltro) where.status = statusFiltro;
    if (clienteFiltro) {
      where.cliente = { nome: { contains: clienteFiltro, mode: 'insensitive' } };
    }

    const registros = await prisma.orcamento.findMany({
      where: where as any,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        numeroSequencial: true,
        titulo: true,
        status: true,
        precoVenda: true,
        custoTotal: true,
        validade: true,
        motivoRecusa: true,
        observacoes: true,
        createdAt: true,
        updatedAt: true,
        aprovedAt: true,
        recusadoAt: true,
        cliente: { select: { id: true, nome: true } },
        aprovadoPor: { select: { id: true, name: true } },
      },
    });

    const orcamentos = registros.map((r) =>
      semVazios({
        id: r.id,
        numero: r.numeroSequencial,
        titulo: r.titulo,
        status: r.status,
        cliente: r.cliente ? { id: r.cliente.id, nome: (r.cliente as any).nome } : undefined,
        precoVenda: r.precoVenda,
        custoTotal: r.custoTotal,
        validade: r.validade instanceof Date ? r.validade.toISOString() : r.validade,
        aprovadoEm: r.aprovedAt instanceof Date ? r.aprovedAt.toISOString() : r.aprovedAt,
        aprovadoPor: r.aprovadoPor ? { id: r.aprovadoPor.id, nome: r.aprovadoPor.name } : undefined,
        recusadoEm: r.recusadoAt instanceof Date ? r.recusadoAt.toISOString() : r.recusadoAt,
        motivoRecusa: r.motivoRecusa,
        observacoes: r.observacoes,
        criadoEm: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        atualizadoEm: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })
    );

    return {
      ok: true,
      total: orcamentos.length,
      filtro: { status: statusFiltro ?? null, clienteNome: clienteFiltro ?? null, limit },
      orcamentos,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'falha desconhecida';
    return { ok: false, error: `Erro ao consultar orcamentos: ${msg}` };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// get_whatsapp_status
// ──────────────────────────────────────────────────────────────────────────────

export async function getWhatsappStatus(): Promise<Record<string, unknown>> {
  try {
    const status = await fetchWhatsappProviderSessionStatus();
    const monitor = whatsappDownMonitor.getSummary();

    return {
      ok: true,
      agora: new Date().toISOString(),
      conexao: {
        alcancavel: status.reachable,
        conectado: status.connected,
        estadoRaw: status.status,
      },
      monitor,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'falha desconhecida';
    return { ok: false, error: `Erro ao verificar WhatsApp: ${msg}` };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Monitor de queda do WhatsApp — singleton
// Envia email para antoniojrtech@gmail.com quando offline > 10 minutos
// ──────────────────────────────────────────────────────────────────────────────

const ALERTA_APOS_MS = 10 * 60 * 1000;   // 10 minutos
const COOLDOWN_EMAIL_MS = 30 * 60 * 1000; // reenvia a cada 30 min
const EMAIL_ALERTA = 'antoniojrtech@gmail.com';
const INTERVALO_CHECK_MS = 60 * 1000;     // checa a cada 1 minuto

interface MonitorState {
  offlineSince: Date | null;
  lastAlertSent: Date | null;
  ultimoStatus: boolean | null;
  ultimaChecagem: Date | null;
  totalAlertas: number;
}

class WhatsappDownMonitor {
  private state: MonitorState = {
    offlineSince: null,
    lastAlertSent: null,
    ultimoStatus: null,
    ultimaChecagem: null,
    totalAlertas: 0,
  };
  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.timer) return;
    console.log('[WA-MONITOR] Monitor de queda do WhatsApp iniciado (intervalo: 1 min, alerta apos 10 min)');
    this.timer = setInterval(() => { void this.verificar(); }, INTERVALO_CHECK_MS);
    setTimeout(() => { void this.verificar(); }, 5000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async verificar() {
    try {
      const status = await fetchWhatsappProviderSessionStatus();
      const agora = new Date();
      this.state.ultimaChecagem = agora;

      if (status.connected) {
        if (this.state.offlineSince) {
          const duracaoMs = agora.getTime() - this.state.offlineSince.getTime();
          console.log(`[WA-MONITOR] WhatsApp reconectou apos ${Math.round(duracaoMs / 60000)} min offline`);
        }
        this.state.offlineSince = null;
        this.state.ultimoStatus = true;
        return;
      }

      this.state.ultimoStatus = false;
      if (!this.state.offlineSince) {
        this.state.offlineSince = agora;
        console.warn(`[WA-MONITOR] WhatsApp offline detectado em ${agora.toISOString()}`);
      }

      const tempoOfflineMs = agora.getTime() - this.state.offlineSince.getTime();
      if (tempoOfflineMs < ALERTA_APOS_MS) return;

      const podeEnviar =
        !this.state.lastAlertSent ||
        agora.getTime() - this.state.lastAlertSent.getTime() >= COOLDOWN_EMAIL_MS;

      if (!podeEnviar) return;

      await this.enviarAlerta(agora, tempoOfflineMs, status.status);
    } catch (err) {
      console.error('[WA-MONITOR] Erro na verificacao:', err instanceof Error ? err.message : err);
    }
  }

  private async enviarAlerta(agora: Date, tempoOfflineMs: number, estadoRaw: string | null) {
    try {
      const minutos = Math.round(tempoOfflineMs / 60000);
      const { sendNotificationEmail } = await import('../services/email.service');
      const titulo = `WhatsApp offline ha ${minutos} minutos - S3E System PRO`;
      const offilineSinceFmt = this.state.offlineSince
        ? this.state.offlineSince.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'desconhecido';
      const agoraFmt = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const mensagem = [
        `O servico de WhatsApp do S3E System PRO esta sem conexao ha <strong>${minutos} minutos</strong>.`,
        ``,
        `<strong>Offline desde:</strong> ${offilineSinceFmt}`,
        `<strong>Ultima checagem:</strong> ${agoraFmt}`,
        `<strong>Estado reportado pelo provedor:</strong> ${estadoRaw ?? 'desconhecido'}`,
        ``,
        `Acesse o painel do S3E para verificar e reconectar o WhatsApp.`,
      ].join('<br>');

      await sendNotificationEmail(EMAIL_ALERTA, 'Antonio Junior', titulo, mensagem);
      this.state.lastAlertSent = agora;
      this.state.totalAlertas += 1;
      console.warn(`[WA-MONITOR] Alerta #${this.state.totalAlertas} enviado para ${EMAIL_ALERTA} (offline ha ${minutos} min)`);
    } catch (err) {
      console.error('[WA-MONITOR] Falha ao enviar email:', err instanceof Error ? err.message : err);
    }
  }

  getSummary(): Record<string, unknown> {
    const agora = new Date();
    const offlineHaMinutos = this.state.offlineSince
      ? Math.round((agora.getTime() - this.state.offlineSince.getTime()) / 60000)
      : null;
    return {
      monitorAtivo: !!this.timer,
      ultimaChecagem: this.state.ultimaChecagem?.toISOString() ?? null,
      ultimoStatusConectado: this.state.ultimoStatus,
      offlineSince: this.state.offlineSince?.toISOString() ?? null,
      offlineHaMinutos,
      ultimoAlertaEnviado: this.state.lastAlertSent?.toISOString() ?? null,
      totalAlertasEnviados: this.state.totalAlertas,
      alertaApos: `${ALERTA_APOS_MS / 60000} minutos`,
      emailAlerta: EMAIL_ALERTA,
    };
  }
}

export const whatsappDownMonitor = new WhatsappDownMonitor();
