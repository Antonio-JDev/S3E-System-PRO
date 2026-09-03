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

export interface EntregaQuadroMetadados {
  dataEntrega?: string;
  entregadorNome?: string;
  recebedorNome?: string;
  recebidoNoLocal?: boolean;
  localRecebimento?: string;
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
  const raw = (metadados as { entregaQuadro?: EntregaQuadroMetadados }).entregaQuadro;
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

export function entregaQuadroVazia(): EntregaQuadroMetadados {
  return {
    dataEntrega: '',
    entregadorNome: '',
    recebedorNome: '',
    recebidoNoLocal: true,
    localRecebimento: '',
  };
}

export function validarEntregaQuadroForm(entrega: EntregaQuadroMetadados): string | null {
  if (!entrega.dataEntrega?.trim()) return 'Informe a data de entrega';
  if (!entrega.entregadorNome?.trim()) return 'Informe quem realizou a entrega';
  if (!entrega.recebedorNome?.trim()) return 'Informe quem recebeu o quadro';
  if (!entrega.localRecebimento?.trim()) return 'Informe o local de entrega/recebimento';
  return null;
}

export function exigeFormularioEntregaQuadro(tipoOs?: string | null, tituloTask?: string): boolean {
  return isOsTipoQuadrosPainels(tipoOs) && isTaskEntregaWorkflow(tituloTask || '');
}
