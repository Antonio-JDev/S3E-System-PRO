/**
 * Classifica automaticamente um material baseado no nome do produto e NCM
 * @param nomeProduto Nome do produto a ser classificado
 * @param ncm NCM do produto (opcional, para futuras melhorias)
 * @returns Categoria do material: 'Material Elétrico', 'Insumo' ou 'Ferramenta'
 */
export function classificarMaterialPorNome(nomeProduto: string, ncm?: string): string {
  if (!nomeProduto || typeof nomeProduto !== 'string') {
    return 'Material Elétrico'; // Fallback padrão
  }

  const nomeLower = nomeProduto.toLowerCase();
  
  // Palavras-chave para Material Elétrico
  const keywordsEletrico = [
    'cabo', 'fio', 'disjuntor', 'interruptor', 'tomada', 'lâmpada', 'led',
    'quadro', 'painel', 'transformador', 'relé', 'contator', 'fusível',
    'conector', 'plug', 'soquete', 'reator', 'reatância', 'capacitor',
    'dimmer', 'sensor', 'automação', 'elétrico', 'elétrica', 'dps',
    'dispositivo de proteção contra surtos', 'barramento', 'trilho din'
  ];
  
  // Palavras-chave para Ferramenta
  const keywordsFerramenta = [
    'alicate', 'chave', 'furadeira', 'parafusadeira', 'serra', 'esmeril',
    'multímetro', 'testador', 'ferramenta', 'martelo', 'chave de fenda',
    'estilete', 'cortador', 'grampeador', 'pistola', 'solda'
  ];
  
  // Palavras-chave para Insumo
  const keywordsInsumo = [
    'parafuso', 'porca', 'arruela', 'bucha', 'tinta', 'verniz', 'cola',
    'fita', 'adesivo', 'isolante', 'massa', 'silicone', 'vedante',
    'canaleta', 'eletroduto', 'conduíte', 'calha', 'suporte', 'braçadeira'
  ];
  
  // Verificar Material Elétrico
  if (keywordsEletrico.some(keyword => nomeLower.includes(keyword))) {
    return 'Material Elétrico';
  }
  
  // Verificar Ferramenta
  if (keywordsFerramenta.some(keyword => nomeLower.includes(keyword))) {
    return 'Ferramenta';
  }
  
  // Verificar Insumo
  if (keywordsInsumo.some(keyword => nomeLower.includes(keyword))) {
    return 'Insumo';
  }
  
  // Fallback: Material Elétrico (padrão mais comum para empresa de engenharia elétrica)
  return 'Material Elétrico';
}

/**
 * Valida se uma categoria é válida
 * @param categoria Categoria a ser validada
 * @returns true se válida, false caso contrário
 */
export function isCategoriaValida(categoria: string): boolean {
  const categoriasValidas = ['Material Elétrico', 'Insumo', 'Ferramenta'];
  return categoriasValidas.includes(categoria);
}

/**
 * Normaliza uma categoria para o formato padrão
 * @param categoria Categoria a ser normalizada
 * @returns Categoria normalizada ou 'Material Elétrico' como fallback
 */
export function normalizarCategoria(categoria: string | null | undefined): string {
  if (!categoria) {
    return 'Material Elétrico';
  }

  const categoriaLower = categoria.toLowerCase().trim();
  
  // Mapear variações comuns para o formato padrão
  const mapeamento: Record<string, string> = {
    'material eletrico': 'Material Elétrico',
    'material elétrico': 'Material Elétrico',
    'materialeletrico': 'Material Elétrico',
    'insumo': 'Insumo',
    'ferramenta': 'Ferramenta',
    'ferramentas': 'Ferramenta',
    'importado xml': 'Material Elétrico', // Normalizar valores antigos
    'produto': 'Material Elétrico'
  };

  if (mapeamento[categoriaLower]) {
    return mapeamento[categoriaLower];
  }

  // Se já está no formato correto
  if (isCategoriaValida(categoria)) {
    return categoria;
  }

  // Fallback
  return 'Material Elétrico';
}

