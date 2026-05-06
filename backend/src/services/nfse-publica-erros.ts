/**
 * Mapa de códigos de erro NFS-e Pública Informática (Manual v7.4 - Nota Nacional)
 * Usado para traduzir códigos retornados pela prefeitura em mensagens amigáveis.
 */

export const NFSE_PUBLICA_ERROS: Record<string, string> = {
  E01: 'CNPJ do prestador inválido',
  E02: 'Inscrição Municipal do prestador inválida',
  E03: 'Razão Social não informada',
  E04: 'Endereço do prestador incompleto',
  E05: 'Email do prestador inválido',
  E06: 'Telefone do prestador inválido',
  E07: 'CNPJ/CPF do tomador inválido',
  E08: 'Razão Social do tomador não informada',
  E09: 'Endereço do tomador incompleto',
  E10: 'Email do tomador inválido',
  E11: 'Número do RPS já existente para a série',
  E12: 'Série do RPS inválida',
  E13: 'Tipo de RPS inválido',
  E14: 'Data de emissão inválida ou futura',
  E15: 'Natureza da operação inválida',
  E16: 'Regime tributário inválido',
  E17: 'Optante pelo Simples Nacional inválido',
  E18: 'Item da lista de serviço inválido',
  E19: 'Código do município de prestação inválido',
  E20: 'Valor dos serviços não informado ou inválido',
  E21: 'Valor das deduções inválido',
  E22: 'Valor do PIS inválido',
  E23: 'Valor do COFINS inválido',
  E24: 'Valor do INSS inválido',
  E25: 'Valor do IR inválido',
  E26: 'Valor do CSLL inválido',
  E27: 'Alíquota do ISS inválida',
  E28: 'Valor do ISS inválido',
  E29: 'Valor do ISS retido inválido',
  E30: 'Código do município de incidência do ISS inválido',
  E31: 'Número do lote inválido ou duplicado',
  E32: 'Quantidade de RPS no lote inválida',
  E33: 'Lote já processado',
  E34: 'Assinatura digital inválida',
  E35: 'Certificado digital inválido ou expirado',
  E36: 'Erro na validação do schema XML',
  E39: 'Retenção não permitida',
  E40: 'Discriminação dos serviços não informada',
  E41: 'Discriminação obrigatória',
  E42: 'CNPJ do tomador não cadastrado',
  E43: 'Inscrição Municipal inválida',
  E44: 'Data de competência inválida',
  E45: 'Código de obra (construção civil) inválido',
  E46: 'ART/CIRT obrigatória para construção civil',
  E47: 'Número do RPS substituído não encontrado',
  E48: 'RPS já foi substituído',
  E49: 'RPS cancelado não pode ser substituído',
  E50: 'Serviço não permite substituição',
  E86: 'Protocolo inexistente',
  E87: 'Número da NFS-e não encontrado',
  E88: 'NFS-e já cancelada',
  E89: 'NFS-e não pode ser cancelada (prazo ou situação)',
  E90: 'Justificativa de cancelamento obrigatória (mín. 15 caracteres)',
  E91: 'Pedido de cancelamento já processado',
  E92: 'Código de cancelamento inválido',
  E93: 'Erro interno do provedor - contactar suporte',
  E94: 'Serviço temporariamente indisponível',
  E95: 'Timeout na comunicação',
  E96: 'Lote com RPS de prestadores diferentes',
  E97: 'Município não conveniado ou ambiente indisponível',
  E98: 'Versão do schema não suportada',
  E99: 'Erro não catalogado'
};

/**
 * Retorna mensagem amigável para um código de erro ou mensagem bruta da prefeitura.
 */
export function mensagemErroNfse(codigoOuMensagem: string): string {
  if (!codigoOuMensagem || typeof codigoOuMensagem !== 'string') {
    return 'Erro desconhecido na NFS-e';
  }
  const codigo = codigoOuMensagem.trim().toUpperCase();
  if (NFSE_PUBLICA_ERROS[codigo]) {
    return `${codigo}: ${NFSE_PUBLICA_ERROS[codigo]}`;
  }
  // Pode vir "E43 - Inscrição Municipal inválida" da prefeitura
  const match = codigo.match(/^(E\d{2})\s*[-:]/);
  if (match && NFSE_PUBLICA_ERROS[match[1]]) {
    return `${match[1]}: ${NFSE_PUBLICA_ERROS[match[1]]}`;
  }
  return codigoOuMensagem;
}
