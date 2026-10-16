import type { EntregaQuadroMetadados } from '../utils/osEntregaQuadro.util';

type BlocoPdf = {
  text?: string | Array<{ text: string; bold?: boolean }>;
  bold?: boolean;
  fontSize?: number;
  margin?: number[];
  color?: string;
  stack?: BlocoPdf[];
  columns?: BlocoPdf[];
  columnGap?: number;
};

export type ParteRomaneio = {
  nome: string;
  endereco: string;
  municipio: string;
  cep: string;
  documento: string;
  ie: string;
  telefone: string;
};

export type EmpresaRomaneioFonte = {
  razaoSocial: string;
  endereco: string;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  cnpj?: string | null;
  inscricaoEstadual?: string | null;
  telefone?: string | null;
};

export type ClienteRomaneioFonte = {
  nome: string;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  cpfCnpj?: string | null;
  inscricaoEstadual?: string | null;
  telefone?: string | null;
};

export type RomaneioQuadroModel = {
  numeroOs: string;
  produto: string;
  volume: string;
  data: string;
  responsavelNome: string;
  recebedorNome: string;
  recebidoEm: string;
  remetente: ParteRomaneio | null;
  destinatario: ParteRomaneio;
};

export function formatarDocumento(valor?: string | null): string {
  const digits = String(valor || '').replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return String(valor || '').trim();
}

export function formatarCep(valor?: string | null): string {
  const digits = String(valor || '').replace(/\D/g, '');
  if (digits.length === 8) return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  return String(valor || '').trim();
}

export function formatarDataRomaneio(ymd?: string | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || '').trim());
  if (!match) return String(ymd || '').trim();
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatarDataHoraRomaneio(iso?: string | null): string {
  const raw = String(iso || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function hojeSaoPaulo(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function juntarPartes(partes: Array<string | null | undefined>): string {
  return partes.map((p) => String(p || '').trim()).filter(Boolean).join(', ');
}

export function montarParteEmpresa(empresa: EmpresaRomaneioFonte | null | undefined): ParteRomaneio | null {
  if (!empresa?.razaoSocial?.trim()) return null;
  return {
    nome: empresa.razaoSocial.trim(),
    endereco: juntarPartes([empresa.endereco, empresa.numero, empresa.complemento, empresa.bairro]),
    municipio: juntarPartes([
      empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : empresa.cidade || empresa.estado,
    ]),
    cep: formatarCep(empresa.cep),
    documento: formatarDocumento(empresa.cnpj),
    ie: String(empresa.inscricaoEstadual || '').trim(),
    telefone: String(empresa.telefone || '').trim(),
  };
}

export function montarParteCliente(cliente: ClienteRomaneioFonte | null | undefined): ParteRomaneio {
  return {
    nome: String(cliente?.nome || '').trim() || '—',
    endereco: juntarPartes([cliente?.endereco, cliente?.numero, cliente?.bairro]),
    municipio: juntarPartes([
      cliente?.cidade && cliente?.estado
        ? `${cliente.cidade}/${cliente.estado}`
        : cliente?.cidade || cliente?.estado,
    ]),
    cep: formatarCep(cliente?.cep),
    documento: formatarDocumento(cliente?.cpfCnpj),
    ie: String(cliente?.inscricaoEstadual || '').trim(),
    telefone: String(cliente?.telefone || '').trim(),
  };
}

export function nomeArquivoRomaneioOs(numero?: string | number | null): string {
  const n = String(numero ?? '')
    .trim()
    .replace(/[^\w.-]+/g, '-');
  return n ? `Romaneio-OS-${n}.pdf` : 'Romaneio-OS.pdf';
}

function campo(rotulo: string, valor?: string | null): BlocoPdf {
  return {
    text: [
      { text: `${rotulo}: `, bold: true },
      { text: valor?.trim() ? valor.trim() : '—' },
    ],
    fontSize: 10,
    margin: [0, 1, 0, 1],
    color: '#0f172a',
  };
}

function blocoParte(titulo: string, parte: ParteRomaneio | null): BlocoPdf {
  return {
    stack: [
      { text: titulo, bold: true, fontSize: 11, margin: [0, 0, 0, 4], color: '#0f172a' },
      campo(titulo, parte?.nome),
      campo('Endereço', parte?.endereco),
      campo('Município', parte?.municipio),
      campo('CEP', parte?.cep),
      campo('CNPJ', parte?.documento),
      campo('IE', parte?.ie),
      campo('Telefone', parte?.telefone),
    ],
  };
}

export function montarModeloRomaneio(input: {
  numeroOs?: string | number | null;
  tituloOs?: string | null;
  entrega?: EntregaQuadroMetadados | null;
  empresa?: EmpresaRomaneioFonte | null;
  cliente?: ClienteRomaneioFonte | null;
  responsavelNome?: string | null;
}): RomaneioQuadroModel {
  const entrega = input.entrega || {};
  return {
    numeroOs: String(input.numeroOs ?? '').trim() || '—',
    produto: entrega.produto?.trim() || input.tituloOs?.trim() || '—',
    volume: entrega.volume?.trim() || '1',
    data: formatarDataRomaneio(entrega.dataRomaneio?.trim() || hojeSaoPaulo()),
    responsavelNome: entrega.responsavelEntregaNome?.trim() || input.responsavelNome?.trim() || '—',
    recebedorNome: entrega.recebedorNome?.trim() || '',
    recebidoEm: formatarDataHoraRomaneio(entrega.recebidoEm),
    remetente: montarParteEmpresa(input.empresa),
    destinatario: montarParteCliente(input.cliente),
  };
}

export function conteudoRomaneio(model: RomaneioQuadroModel): BlocoPdf[] {
  const recebedorTexto = model.recebedorNome
    ? [model.recebedorNome, model.recebidoEm].filter(Boolean).join(' · ')
    : '________________';

  return [
    { text: 'Romaneio de transporte', fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
    {
      text: `OS ${model.numeroOs}`,
      fontSize: 12,
      bold: true,
      margin: [0, 0, 0, 12],
    },
    {
      columnGap: 16,
      columns: [blocoParte('Remetente', model.remetente), blocoParte('Destinatário', model.destinatario)],
      margin: [0, 0, 0, 14],
    },
    {
      columnGap: 16,
      columns: [campo('Produto', model.produto), campo('Data', model.data)],
      margin: [0, 0, 0, 8],
    },
    { ...campo('Volume', model.volume), margin: [0, 0, 0, 16] },
    {
      columnGap: 16,
      columns: [
        campo('Responsável pela entrega', model.responsavelNome),
        campo('Recebedor', recebedorTexto),
      ],
    },
  ];
}
