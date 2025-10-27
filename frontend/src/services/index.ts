/**
 * Exportação centralizada de todos os serviços de API
 * 
 * Este arquivo facilita a importação de serviços em todo o projeto
 * 
 * Exemplo de uso:
 * import { authService, materiaisService, vendasService } from '@/services';
 */

// Serviço base
export { apiService } from './api';

// Autenticação
export { authService } from './authService';
export type { LoginCredentials, RegisterData, User } from './authService';

// Cadastros básicos
export { clientesService } from './clientesService';
export { fornecedoresService } from './fornecedoresService';
export { empresasService } from './empresasService';

// Projetos e Serviços
export { projetosService } from './projetosService';
export { servicosService } from './servicosService';

// Estoque e Materiais
export { materiaisService } from './materiaisService';
export type { 
  Material, 
  Movimentacao, 
  CreateMaterialDto, 
  UpdateMaterialDto,
  RegistrarMovimentacaoDto 
} from './materiaisService';

export { movimentacoesService } from './movimentacoesService';

// Compras e Orçamentos
export { comprasService } from './comprasService';
export type { 
  Compra, 
  ItemCompra, 
  CreateCompraDto, 
  UpdateCompraStatusDto 
} from './comprasService';

export { orcamentosService } from './orcamentosService';
export type { 
  Orcamento, 
  ItemOrcamento, 
  CreateOrcamentoDto, 
  UpdateOrcamentoStatusDto 
} from './orcamentosService';

// Vendas e Financeiro
export { vendasService } from './vendasService';
export type { 
  Venda, 
  ContaReceber, 
  RealizarVendaDto, 
  PagarContaDto as PagarContaReceberDto,
  DashboardFinanceiro 
} from './vendasService';

export { contasPagarService } from './contasPagarService';
export type { 
  ContaPagar, 
  CreateContaDto, 
  CreateContasParceladasDto,
  PagarContaDto as PagarContaPagarDto,
  AtualizarVencimentoDto 
} from './contasPagarService';

// Relatórios
export { relatoriosService } from './relatoriosService';
export type { 
  DashboardCompleto, 
  DadosFinanceiros, 
  ResumoFinanceiro,
  EstatisticasVendas,
  TopCliente 
} from './relatoriosService';

// Dashboard
export { dashboardService } from './dashboardService';

// Fiscal
export { nfeService } from './nfeService';
export { configFiscalService } from './configFiscalService';
export type { 
  ConfiguracaoFiscal, 
  CreateConfigFiscalDto, 
  UpdateConfigFiscalDto 
} from './configFiscalService';

// Obras e Equipes
export { alocacoesService } from './alocacoesService';
export type { 
  Equipe as EquipeObra,
  MembroEquipe,
  Alocacao,
  CreateEquipeDto as CreateEquipeObraDto,
  UpdateEquipeDto as UpdateEquipeObraDto,
  AlocarEquipeDto,
  UpdateAlocacaoDto,
  EstatisticasObras 
} from './alocacoesService';

export { equipesService } from './equipesService';
export type { 
  Equipe, 
  AddMembroDto,
  EstatisticasEquipes 
} from './equipesService';

// Comparação de Preços
export { comparacaoPrecosService } from './comparacaoPrecosService';
export type { 
  ComparacaoPreco, 
  HistoricoPreco, 
  ResultadoUploadCSV,
  ValidacaoCSV,
  AtualizarPrecosDto 
} from './comparacaoPrecosService';

// PDF
export { pdfService } from './pdfService';
export type { VerificarOrcamentoResponse } from './pdfService';

// Histórico
export { historicoService } from './historicoService';
