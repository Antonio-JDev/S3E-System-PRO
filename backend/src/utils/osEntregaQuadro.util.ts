/**
 * Regras de entrega / romaneio para OS do tipo Quadros e Painéis.
 */

export interface RomaneioProduto {
  nome: string;
  codigo?: string;
  quantidade?: number;
}

export interface RomaneioVolume {
  identificacao: string;
  marcacao?: string;
  tipo?: string;
}

export interface RomaneioDados {
  produtos?: RomaneioProduto[];
  volumes?: RomaneioVolume[];
  qtdVolumes?: number;
  pesoLiquidoKg?: number | null;
  pesoBrutoKg?: number | null;
  dimensoes?: string;
  /** Marcado ao gerar/imprimir o romaneio */
  geradoEm?: string;
}

export interface EntregaQuadroMetadados {
  /** Foto do produto montado / a entregar */
  fotoProduto?: string;
  /** Materiais da OS conferidos com a BOM / alocação */
  materiaisConferidos?: boolean;
  romaneio?: RomaneioDados;
  /** Entrega final ao cliente */
  clienteNome?: string;
  clienteTelefone?: string;
  dataEntrega?: string;
  assinaturaCliente?: string;
  fotoProdutoEntregue?: string;
  /** Campos auxiliares (compat / operação) */
  entregadorNome?: string;
  recebedorNome?: string;
  recebidoNoLocal?: boolean;
  localRecebimento?: string;
  /** Linha de produto impressa no romaneio (padrão: título da OS) */
  produto?: string;
  /** Volume impresso no romaneio */
  volume?: string;
  /** Data impressa no romaneio (YYYY-MM-DD) */
  dataRomaneio?: string;
  responsavelEntregaId?: string;
  responsavelEntregaNome?: string;
  /** Data e hora do recebimento, registradas no retorno à empresa (ISO) */
  recebidoEm?: string;
  /** Ligada quando há nome do recebedor e data/hora do recebimento */
  entregue?: boolean;
}

export interface ChecklistEntregaQuadroResultado {
  ok: boolean;
  pendencias: string[];
}

function temTexto(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

export function extrairEntregaQuadro(fonte: unknown): EntregaQuadroMetadados | null {
  if (!fonte || typeof fonte !== 'object') return null;
  const obj = fonte as Record<string, unknown>;
  if (obj.entregaQuadro && typeof obj.entregaQuadro === 'object') {
    return obj.entregaQuadro as EntregaQuadroMetadados;
  }
  // Payload já é o objeto de entrega (campo Projeto.entregaQuadro)
  if (
    'fotoProduto' in obj ||
    'materiaisConferidos' in obj ||
    'romaneio' in obj ||
    'clienteNome' in obj ||
    'recebedorNome' in obj ||
    'dataEntrega' in obj ||
    'assinaturaCliente' in obj ||
    'produto' in obj ||
    'volume' in obj ||
    'dataRomaneio' in obj ||
    'responsavelEntregaId' in obj ||
    'recebidoEm' in obj ||
    'entregue' in obj
  ) {
    return obj as EntregaQuadroMetadados;
  }
  return null;
}

/** Flag Entregue: nome de quem recebeu e data/hora do retorno. */
export function entregaEstaEntregue(
  entrega: EntregaQuadroMetadados | null | undefined,
): boolean {
  return temTexto(entrega?.recebedorNome) && temTexto(entrega?.recebidoEm);
}

export function isTaskEntregaWorkflow(titulo: string): boolean {
  return titulo.trim().toLowerCase() === 'entrega';
}

export function isOsTipoQuadrosPainels(tipo?: string | null): boolean {
  return tipo === 'QUADROS_PAINEIS';
}

/**
 * O checklist de foto/assinatura não bloqueia mais a conclusão.
 * O registro de entrega fica na aba Dados gerais (flag Entregue).
 */
export function avaliarChecklistEntregaQuadro(
  _entrega: EntregaQuadroMetadados | null | undefined,
): ChecklistEntregaQuadroResultado {
  return { ok: true, pendencias: [] };
}

export function podeConcluirOsQuadros(
  _tipoOs: string | null | undefined,
  _entrega: EntregaQuadroMetadados | null | undefined,
): ChecklistEntregaQuadroResultado {
  return { ok: true, pendencias: [] };
}

export function mensagemBloqueioConclusaoQuadros(
  resultado: ChecklistEntregaQuadroResultado,
): string | null {
  if (resultado.ok) return null;
  return `Não é possível concluir a OS de Quadros/Painéis. Pendências na entrega: ${resultado.pendencias.join('; ')}.`;
}

/** A tarefa Entrega do Kanban não exige mais o checklist antigo. */
export function validarEntregaQuadro(_metadados: unknown): void {
  return;
}

export function normalizarEntregaQuadroInput(
  body: unknown,
): EntregaQuadroMetadados {
  if (!body || typeof body !== 'object') {
    throw new Error('Dados de entrega inválidos');
  }
  const raw = body as EntregaQuadroMetadados;
  const romaneio = raw.romaneio && typeof raw.romaneio === 'object' ? raw.romaneio : undefined;

  return comFlagEntregue({
    fotoProduto: raw.fotoProduto?.trim() || undefined,
    materiaisConferidos: Boolean(raw.materiaisConferidos),
    romaneio: romaneio
      ? {
          produtos: Array.isArray(romaneio.produtos) ? romaneio.produtos : [],
          volumes: Array.isArray(romaneio.volumes) ? romaneio.volumes : [],
          qtdVolumes:
            typeof romaneio.qtdVolumes === 'number' ? romaneio.qtdVolumes : undefined,
          pesoLiquidoKg:
            romaneio.pesoLiquidoKg == null || Number.isNaN(Number(romaneio.pesoLiquidoKg))
              ? null
              : Number(romaneio.pesoLiquidoKg),
          pesoBrutoKg:
            romaneio.pesoBrutoKg == null || Number.isNaN(Number(romaneio.pesoBrutoKg))
              ? null
              : Number(romaneio.pesoBrutoKg),
          dimensoes: romaneio.dimensoes?.trim() || undefined,
          geradoEm: romaneio.geradoEm?.trim() || undefined,
        }
      : undefined,
    clienteNome: raw.clienteNome?.trim() || undefined,
    clienteTelefone: raw.clienteTelefone?.trim() || undefined,
    dataEntrega: raw.dataEntrega?.trim() || undefined,
    assinaturaCliente: raw.assinaturaCliente?.trim() || undefined,
    fotoProdutoEntregue: raw.fotoProdutoEntregue?.trim() || undefined,
    entregadorNome: raw.entregadorNome?.trim() || undefined,
    recebedorNome:
      raw.recebedorNome !== undefined
        ? raw.recebedorNome.trim() || undefined
        : raw.clienteNome?.trim() || undefined,
    recebidoNoLocal:
      typeof raw.recebidoNoLocal === 'boolean' ? raw.recebidoNoLocal : true,
    localRecebimento: raw.localRecebimento?.trim() || undefined,
    produto: raw.produto?.trim() || undefined,
    volume: raw.volume?.trim() || undefined,
    dataRomaneio: raw.dataRomaneio?.trim() || undefined,
    responsavelEntregaId: raw.responsavelEntregaId?.trim() || undefined,
    responsavelEntregaNome: raw.responsavelEntregaNome?.trim() || undefined,
    recebidoEm: raw.recebidoEm?.trim() || undefined,
    entregue: false,
  });
}

function comFlagEntregue(entrega: EntregaQuadroMetadados): EntregaQuadroMetadados {
  return { ...entrega, entregue: entregaEstaEntregue(entrega) };
}
