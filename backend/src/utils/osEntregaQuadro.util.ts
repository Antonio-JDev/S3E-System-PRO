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
}

export interface ChecklistEntregaQuadroResultado {
  ok: boolean;
  pendencias: string[];
}

function temTexto(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

function temMedia(v: unknown): boolean {
  return temTexto(v) && String(v).trim().length > 20;
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
    'dataEntrega' in obj ||
    'assinaturaCliente' in obj
  ) {
    return obj as EntregaQuadroMetadados;
  }
  return null;
}

export function isTaskEntregaWorkflow(titulo: string): boolean {
  return titulo.trim().toLowerCase() === 'entrega';
}

export function isOsTipoQuadrosPainels(tipo?: string | null): boolean {
  return tipo === 'QUADROS_PAINEIS';
}

/** Avalia checklist completo necessário para concluir OS Quadros/Painéis. */
export function avaliarChecklistEntregaQuadro(
  entrega: EntregaQuadroMetadados | null | undefined,
): ChecklistEntregaQuadroResultado {
  const pendencias: string[] = [];
  if (!entrega) {
    return {
      ok: false,
      pendencias: [
        'Preencha o checklist de entrega do quadro (foto, materiais, romaneio e recebimento do cliente).',
      ],
    };
  }

  if (!temMedia(entrega.fotoProduto)) {
    pendencias.push('Foto do produto (montado / a entregar)');
  }
  if (entrega.materiaisConferidos !== true) {
    pendencias.push('Conferência de materiais (marcar como conferidos)');
  }
  if (!temTexto(entrega.romaneio?.geradoEm)) {
    pendencias.push('Romaneio gerado/impresso');
  }
  if (!temTexto(entrega.clienteNome) && !temTexto(entrega.recebedorNome)) {
    pendencias.push('Nome de quem recebeu (cliente)');
  }
  if (!temTexto(entrega.clienteTelefone)) {
    pendencias.push('Telefone do cliente');
  }
  if (!temTexto(entrega.dataEntrega)) {
    pendencias.push('Data da entrega');
  }
  if (!temMedia(entrega.assinaturaCliente) && !temTexto(entrega.assinaturaCliente)) {
    // assinatura pode ser canvas (data URL) ou nome digitado curto — exige algo
    pendencias.push('Assinatura do cliente');
  } else if (
    temTexto(entrega.assinaturaCliente) &&
    !temMedia(entrega.assinaturaCliente) &&
    String(entrega.assinaturaCliente).trim().length < 2
  ) {
    pendencias.push('Assinatura do cliente');
  }
  if (!temMedia(entrega.fotoProdutoEntregue)) {
    pendencias.push('Foto do produto entregue');
  }

  return { ok: pendencias.length === 0, pendencias };
}

export function podeConcluirOsQuadros(
  tipoOs: string | null | undefined,
  entrega: EntregaQuadroMetadados | null | undefined,
): ChecklistEntregaQuadroResultado {
  if (!isOsTipoQuadrosPainels(tipoOs)) {
    return { ok: true, pendencias: [] };
  }
  return avaliarChecklistEntregaQuadro(entrega);
}

export function mensagemBloqueioConclusaoQuadros(
  resultado: ChecklistEntregaQuadroResultado,
): string | null {
  if (resultado.ok) return null;
  return `Não é possível concluir a OS de Quadros/Painéis. Pendências na entrega: ${resultado.pendencias.join('; ')}.`;
}

/** Validação ao concluir a task Kanban "Entrega" (lança Error). */
export function validarEntregaQuadro(metadados: unknown): void {
  const entrega = extrairEntregaQuadro(metadados);
  const resultado = avaliarChecklistEntregaQuadro(entrega);
  if (!resultado.ok) {
    throw new Error(
      `Checklist de entrega incompleto: ${resultado.pendencias.join('; ')}`,
    );
  }
}

export function normalizarEntregaQuadroInput(
  body: unknown,
): EntregaQuadroMetadados {
  if (!body || typeof body !== 'object') {
    throw new Error('Dados de entrega inválidos');
  }
  const raw = body as EntregaQuadroMetadados;
  const romaneio = raw.romaneio && typeof raw.romaneio === 'object' ? raw.romaneio : undefined;

  return {
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
    recebedorNome: raw.recebedorNome?.trim() || raw.clienteNome?.trim() || undefined,
    recebidoNoLocal:
      typeof raw.recebidoNoLocal === 'boolean' ? raw.recebidoNoLocal : true,
    localRecebimento: raw.localRecebimento?.trim() || undefined,
  };
}
