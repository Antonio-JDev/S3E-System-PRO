export type OsWorkflowTipo =
  | 'PROJETOS_ELETRICOS'
  | 'LAUDO_TECNICO'
  | 'MANUTENCAO_EMERGENCIA'
  | 'QUADROS_PAINEIS'
  | 'DESLIGAMENTO';

export const OS_TIPOS: { value: OsWorkflowTipo; label: string }[] = [
  { value: 'PROJETOS_ELETRICOS', label: 'Projetos Elétricos' },
  { value: 'LAUDO_TECNICO', label: 'Laudo Técnico' },
  { value: 'MANUTENCAO_EMERGENCIA', label: 'Manutenção / Emergência' },
  { value: 'QUADROS_PAINEIS', label: 'Quadros e Painéis' },
  { value: 'DESLIGAMENTO', label: 'Desligamento' },
];

export const OS_WORKFLOW_TEMPLATES: Record<OsWorkflowTipo, readonly string[]> = {
  PROJETOS_ELETRICOS: [
    'Vistoria',
    'Pré-projeto',
    'Levantamento',
    'Abertura de Protocolo',
    'Aprovação do Projeto',
    'Organização Final',
    'Cobrança',
    'Entrega',
  ],
  LAUDO_TECNICO: ['Levantamento', 'Ensaio In Loco', 'Relatório Final', 'Cobrança', 'Entrega'],
  MANUTENCAO_EMERGENCIA: ['Levantamento', 'Cobrança'],
  QUADROS_PAINEIS: [
    'Reserva de material',
    'Levantamento de materiais',
    'Compra de materiais',
    'Montagem',
    'Diagrama',
    'Entrega',
    'Cobrança',
  ],
  DESLIGAMENTO: [
    'Levantamento',
    'Aprovação do Desligamento',
    'Relatório Final',
    'Cobrança',
    'Entrega',
  ],
};

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
  geradoEm?: string;
}

export interface EntregaQuadroMetadados {
  fotoProduto?: string;
  materiaisConferidos?: boolean;
  romaneio?: RomaneioDados;
  clienteNome?: string;
  clienteTelefone?: string;
  dataEntrega?: string;
  assinaturaCliente?: string;
  fotoProdutoEntregue?: string;
  entregadorNome?: string;
  recebedorNome?: string;
  recebidoNoLocal?: boolean;
  localRecebimento?: string;
  produto?: string;
  volume?: string;
  dataRomaneio?: string;
  responsavelEntregaId?: string;
  responsavelEntregaNome?: string;
  recebidoEm?: string;
  entregue?: boolean;
}

export interface ChecklistEntregaQuadroResultado {
  ok: boolean;
  pendencias: string[];
}

function temTexto(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

export function labelTipoOs(tipo?: string | null): string {
  if (!tipo) return 'Não definido';
  return OS_TIPOS.find((t) => t.value === tipo)?.label ?? tipo;
}

export function isOsWorkflowTipo(tipo?: string | null): tipo is OsWorkflowTipo {
  if (!tipo) return false;
  return Object.prototype.hasOwnProperty.call(OS_WORKFLOW_TEMPLATES, tipo);
}

export function isOsTipoQuadrosPainels(tipo?: string | null): boolean {
  return tipo === 'QUADROS_PAINEIS';
}

export function isTaskEntregaWorkflow(titulo: string): boolean {
  return titulo.trim().toLowerCase() === 'entrega';
}

export function extrairEntregaQuadro(metadados: unknown): EntregaQuadroMetadados | null {
  if (!metadados || typeof metadados !== 'object') return null;
  const obj = metadados as Record<string, unknown>;
  if (obj.entregaQuadro && typeof obj.entregaQuadro === 'object') {
    return obj.entregaQuadro as EntregaQuadroMetadados;
  }
  if (
    'fotoProduto' in obj ||
    'materiaisConferidos' in obj ||
    'romaneio' in obj ||
    'clienteNome' in obj ||
    'recebedorNome' in obj ||
    'dataEntrega' in obj ||
    'assinaturaCliente' in obj ||
    'entregadorNome' in obj ||
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

export function entregaEstaEntregue(
  entrega: EntregaQuadroMetadados | null | undefined,
): boolean {
  return temTexto(entrega?.recebedorNome) && temTexto(entrega?.recebidoEm);
}

export function entregaQuadroVazia(): EntregaQuadroMetadados {
  return {
    fotoProduto: '',
    materiaisConferidos: false,
    romaneio: {
      produtos: [],
      volumes: [{ identificacao: 'Volume 01', marcacao: 'S3E', tipo: 'caixa' }],
      qtdVolumes: 1,
      pesoLiquidoKg: null,
      pesoBrutoKg: null,
      dimensoes: '',
      geradoEm: '',
    },
    clienteNome: '',
    clienteTelefone: '',
    dataEntrega: '',
    assinaturaCliente: '',
    fotoProdutoEntregue: '',
    entregadorNome: '',
    recebedorNome: '',
    recebidoNoLocal: true,
    localRecebimento: '',
  };
}

/** Foto, assinatura e materiais não bloqueiam mais a conclusão da OS. */
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

export function validarEntregaQuadroForm(entrega: EntregaQuadroMetadados): string | null {
  const r = avaliarChecklistEntregaQuadro(entrega);
  if (r.ok) return null;
  return `Checklist incompleto: ${r.pendencias.join('; ')}`;
}

/** O romaneio saiu da tarefa Entrega e ficou na aba Dados gerais. */
export function exigeFormularioEntregaQuadro(
  _tipoOs?: string | null,
  _tituloTask?: string,
): boolean {
  return false;
}

export function marcarRomaneioGerado(entrega: EntregaQuadroMetadados): EntregaQuadroMetadados {
  return {
    ...entrega,
    romaneio: {
      ...(entrega.romaneio || {}),
      geradoEm: new Date().toISOString(),
    },
  };
}
