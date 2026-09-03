export interface EntregaQuadroMetadados {
  dataEntrega?: string;
  entregadorNome?: string;
  recebedorNome?: string;
  recebidoNoLocal?: boolean;
  localRecebimento?: string;
}

export function extrairEntregaQuadro(metadados: unknown): EntregaQuadroMetadados | null {
  if (!metadados || typeof metadados !== 'object') return null;
  const raw = (metadados as { entregaQuadro?: EntregaQuadroMetadados }).entregaQuadro;
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

export function validarEntregaQuadro(metadados: unknown): void {
  const entrega = extrairEntregaQuadro(metadados);
  if (!entrega?.dataEntrega?.trim()) {
    throw new Error('Informe a data de entrega do quadro');
  }
  if (!entrega.entregadorNome?.trim()) {
    throw new Error('Informe o nome de quem realizou a entrega');
  }
  if (!entrega.recebedorNome?.trim()) {
    throw new Error('Informe quem recebeu o quadro');
  }
  if (typeof entrega.recebidoNoLocal !== 'boolean') {
    throw new Error('Informe se a entrega foi recebida no local');
  }
  if (!entrega.localRecebimento?.trim()) {
    throw new Error('Informe o local de entrega/recebimento');
  }
}

export function isTaskEntregaWorkflow(titulo: string): boolean {
  return titulo.trim().toLowerCase() === 'entrega';
}

export function isOsTipoQuadrosPainels(tipo?: string | null): boolean {
  return tipo === 'QUADROS_PAINEIS';
}
