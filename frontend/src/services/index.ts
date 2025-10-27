/**
 * Arquivo central de exportação de todos os services do frontend
 * Facilita as importações nos componentes
 */

// Services de autenticação e API base
export { apiService } from './api';
export { authService } from './authService';

// Services de gestão
export { alocacaoService } from './alocacaoService';
export { equipesService } from './equipesService';
export { clientesService } from './clientesService';
export { fornecedoresService } from './fornecedoresService';
export { empresasService } from './empresasService';
export { projetosService } from './projetosService';
export { servicosService } from './servicosService';

// Services de produtos e estoque
export { materiaisService } from './materiaisService';
export { movimentacoesService } from './movimentacoesService';
export { comparacaoPrecosService } from './comparacaoPrecosService';

// Services de vendas e compras
export { vendasService } from './vendasService';
export { comprasService } from './comprasService';
export { orcamentosService } from './orcamentosService';

// Services financeiros
export { contasPagarService } from './contasPagarService';
export { dashboardService } from './dashboardService';
export { relatoriosService } from './relatoriosService';

// Services fiscais e documentos
export { configFiscalService } from './configFiscalService';
export { nfeService } from './nfeService';
export { pdfService } from './pdfService';

// Services de histórico
export { historicoService } from './historicoService';

// Exportar tipos principais
export type { ApiResponse } from './api';
export type { Equipe, Alocacao, AlocacaoCalendario, Estatisticas } from './alocacaoService';
export type { Membro, EstatisticasEquipes } from './equipesService';
export type { ComparacaoPreco, HistoricoPreco } from './comparacaoPrecosService';
export type { Venda, ContaReceber, DashboardVendas } from './vendasService';
export type { Material, Movimentacao } from './materiaisService';
export type { Orcamento, ItemOrcamento } from './orcamentosService';
export type { Compra, ItemCompra, ParsedXMLData } from './comprasService';
export type { ContaPagar, ContasParceladas } from './contasPagarService';
export type { 
  DashboardCompleto, 
  DadosFinanceiros, 
  ResumoFinanceiro, 
  EstatisticasVendas, 
  TopCliente 
} from './relatoriosService';
export type { ConfiguracaoFiscal } from './configFiscalService';
export type { PDFResponse } from './pdfService';
