import type { Orcamento } from '../services/orcamentosService';
import type { OrcamentoPDFData } from '../types/pdfCustomization';

function getItemTipo(item: { tipo?: string }): string {
  return String(item?.tipo || '').toUpperCase();
}

export function getOrcamentoItemNome(item: Record<string, unknown>): string {
  const tipo = getItemTipo(item);
  if ((tipo === 'COTACAO' || tipo === 'BANCO_FRIO') && ((item.cotacao as { nome?: string })?.nome || item.nome)) {
    return String((item.cotacao as { nome?: string })?.nome || item.nome);
  }
  if (tipo === 'MATERIAL' && ((item.material as { nome?: string })?.nome || item.materialNome)) {
    return String((item.material as { nome?: string })?.nome || item.materialNome);
  }
  if (tipo === 'KIT') {
    if (!item.kitId && item.descricao) return String(item.descricao);
    if ((item.kit as { nome?: string })?.nome) return String((item.kit as { nome?: string }).nome);
    if (item.descricao) return String(item.descricao);
    if (item.nome) return String(item.nome);
  }
  if (tipo === 'SERVICO') {
    return String(item.servicoNome || item.descricao || 'Serviço');
  }
  return String(
    item.nome ||
      item.descricao ||
      (item.material as { nome?: string })?.nome ||
      (item.cotacao as { nome?: string })?.nome ||
      'Item sem nome'
  );
}

function shouldShowItemDescricao(item: Record<string, unknown>): boolean {
  const tipo = getItemTipo(item);
  if (tipo === 'COTACAO' || tipo === 'BANCO_FRIO') return false;
  const nome = getOrcamentoItemNome(item);
  return Boolean(item.descricao && item.descricao !== nome);
}

/** Mesma estrutura usada pelo modal de personalização (`OrcamentoPrintable`). */
export function prepararOrcamentoPdfData(
  orcamento: Orcamento,
  clienteCompleto?: { nome?: string; cpfCnpj?: string; endereco?: string; telefone?: string; email?: string } | null
): OrcamentoPDFData {
  const cliente = clienteCompleto || orcamento.cliente;

  return {
    numero: orcamento.id.substring(0, 8).toUpperCase(),
    numeroSequencial: orcamento.numeroSequencial || undefined,
    data: new Date(orcamento.createdAt).toLocaleDateString('pt-BR'),
    emissao: new Date(orcamento.createdAt).toLocaleDateString('pt-BR'),
    validade: new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR'),
    enderecos: {
      cobranca: cliente?.endereco,
      obra: orcamento.enderecoObra,
    },
    cliente: {
      nome: orcamento.cliente?.nome || cliente?.nome || 'Cliente não informado',
      cpfCnpj: orcamento.cliente?.cpfCnpj || cliente?.cpfCnpj || '',
      endereco: cliente?.endereco,
      telefone: cliente?.telefone,
      email: cliente?.email,
    },
    projeto: {
      titulo: orcamento.titulo,
      descricao: orcamento.descricao,
      enderecoObra: orcamento.enderecoObra,
      cidade: orcamento.cidade,
      bairro: orcamento.bairro,
      cep: orcamento.cep,
    },
    prazos: {
      previsaoInicio: orcamento.previsaoInicio
        ? new Date(orcamento.previsaoInicio).toLocaleDateString('pt-BR')
        : undefined,
      previsaoTermino: orcamento.previsaoTermino
        ? new Date(orcamento.previsaoTermino).toLocaleDateString('pt-BR')
        : undefined,
    },
    items: (orcamento.items || []).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        codigo: (item.materialId || item.kitId || item.cotacaoId) as string | undefined,
        nome: getOrcamentoItemNome(row),
        descricao: shouldShowItemDescricao(row) ? item.descricao : undefined,
        unidade: item.unidadeMedida || 'UN',
        quantidade: item.quantidade,
        valorUnitario: item.precoUnit ?? item.valorUnitario ?? 0,
        valorTotal: item.subtotal ?? item.valorTotal ?? 0,
      };
    }),
    financeiro: {
      subtotal: orcamento.custoTotal ?? 0,
      bdi: orcamento.bdi,
      valorComBDI: orcamento.custoTotal ?? 0,
      desconto: orcamento.descontoValor ?? 0,
      impostos: orcamento.impostoPercentual ?? 0,
      valorTotal: orcamento.precoVenda ?? orcamento.valorTotal ?? 0,
      condicaoPagamento: orcamento.condicaoPagamento ?? 'À Vista',
    },
    orcamentistaNome: (() => {
      const nome = orcamento.orcamentistaNome;
      if (!nome || !String(nome).trim()) return undefined;
      const s = String(nome).trim();
      if (s === 'Não identificado') return s;
      return s.split(/\s+/)[0];
    })(),
    observacoes: orcamento.observacoes,
    descricaoTecnica: orcamento.descricaoProjeto,
    fotos: [],
    empresa: {
      nome: 'S3E Engenharia',
      cnpj: '00.000.000/0000-00',
      endereco: 'Endereço da empresa',
      telefone: '(48) 0000-0000',
      email: 'contato@s3e.com.br',
    },
  };
}
