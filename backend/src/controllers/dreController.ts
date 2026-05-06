import { Request, Response } from 'express';
import { DREService } from '../services/dre.service';
import { LucroRealService } from '../services/lucroReal.service';

export class DREController {
    /**
     * GET /api/financeiro/dre
     * Calcula DRE para um período específico
     */
    static async calcularDRE(req: Request, res: Response) {
        try {
            const { inicio, fim } = req.query;

            if (!inicio || !fim) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros "inicio" e "fim" são obrigatórios (formato: YYYY-MM-DD)'
                });
            }

            const dataInicio = new Date(inicio as string);
            const dataFim = new Date(fim as string);

            // Validar datas
            if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Datas inválidas. Use o formato YYYY-MM-DD'
                });
            }

            if (dataInicio > dataFim) {
                return res.status(400).json({
                    success: false,
                    message: 'Data de início deve ser anterior à data de fim'
                });
            }

            // Ajustar horários para cobrir o dia completo
            dataInicio.setHours(0, 0, 0, 0);
            dataFim.setHours(23, 59, 59, 999);

            const dre = await DREService.calcularDRE(dataInicio, dataFim);

            return res.json({
                success: true,
                data: dre
            });
        } catch (error) {
            console.error('❌ Erro ao calcular DRE:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao calcular DRE',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/mensal
     * Calcula DRE mensal (últimos N meses)
     */
    static async calcularDREMensal(req: Request, res: Response) {
        try {
            const { meses } = req.query;
            const numeroMeses = meses ? parseInt(meses as string) : 12;

            if (numeroMeses < 1 || numeroMeses > 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Número de meses deve estar entre 1 e 24'
                });
            }

            const dres = await DREService.calcularDREMensal(numeroMeses);

            return res.json({
                success: true,
                data: dres
            });
        } catch (error) {
            console.error('❌ Erro ao calcular DRE mensal:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao calcular DRE mensal',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/pdf
     * Exporta DRE em formato para PDF
     */
    static async exportarPDF(req: Request, res: Response) {
        try {
            const { inicio, fim } = req.query;

            if (!inicio || !fim) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros "inicio" e "fim" são obrigatórios (formato: YYYY-MM-DD)'
                });
            }

            const dataInicio = new Date(inicio as string);
            const dataFim = new Date(fim as string);

            // Validar datas
            if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Datas inválidas. Use o formato YYYY-MM-DD'
                });
            }

            // Ajustar horários
            dataInicio.setHours(0, 0, 0, 0);
            dataFim.setHours(23, 59, 59, 999);

            const drePDF = await DREService.exportarDREParaPDF(dataInicio, dataFim);

            return res.json({
                success: true,
                data: drePDF
            });
        } catch (error) {
            console.error('❌ Erro ao exportar DRE para PDF:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao exportar DRE',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/periodo/:periodo
     * Calcula DRE para períodos pré-definidos (mes-atual, mes-anterior, trimestre, ano)
     */
    static async calcularPorPeriodo(req: Request, res: Response) {
        try {
            const { periodo } = req.params;
            const hoje = new Date();
            let dataInicio: Date;
            let dataFim: Date;

            switch (periodo) {
                case 'mes-atual':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;

                case 'mes-anterior':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
                    break;

                case 'trimestre':
                    // Último trimestre (últimos 3 meses)
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;

                case 'semestre':
                    // Último semestre (últimos 6 meses)
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;

                case 'ano':
                    // Ano atual
                    dataInicio = new Date(hoje.getFullYear(), 0, 1);
                    dataFim = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59);
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Período inválido. Use: mes-atual, mes-anterior, trimestre, semestre ou ano'
                    });
            }

            const dre = await DREService.calcularDRE(dataInicio, dataFim);

            return res.json({
                success: true,
                data: dre
            });
        } catch (error) {
            console.error('❌ Erro ao calcular DRE por período:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao calcular DRE',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/lucro-real
     * Calcula Lucro Real produto por produto com custo do último XML
     */
    static async calcularLucroReal(req: Request, res: Response) {
        try {
            const { inicio, fim } = req.query;

            if (!inicio || !fim) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros "inicio" e "fim" são obrigatórios (formato: YYYY-MM-DD)'
                });
            }

            const dataInicio = new Date(inicio as string);
            const dataFim = new Date(fim as string);

            // Validar datas
            if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Datas inválidas. Use o formato YYYY-MM-DD'
                });
            }

            if (dataInicio > dataFim) {
                return res.status(400).json({
                    success: false,
                    message: 'Data de início deve ser anterior à data de fim'
                });
            }

            // Ajustar horários
            dataInicio.setHours(0, 0, 0, 0);
            dataFim.setHours(23, 59, 59, 999);

            // Calcular lucro real de produtos E serviços
            const lucroRealProdutos = await LucroRealService.calcularLucroReal(dataInicio, dataFim);
            const lucroRealServicos = await LucroRealService.calcularLucroRealServicos(dataInicio, dataFim);

            // Combinar os resultados
            const lucroReal = {
                ...lucroRealProdutos,
                servicos: lucroRealServicos.servicos,
                resumo: {
                    ...lucroRealProdutos.resumo,
                    ...lucroRealServicos.resumo
                },
                estatisticas: {
                    ...lucroRealProdutos.estatisticas,
                    totalServicos: lucroRealServicos.estatisticas.totalServicos,
                    servicosComCusto: lucroRealServicos.estatisticas.servicosComCusto,
                    servicosSemCusto: lucroRealServicos.estatisticas.servicosSemCusto
                },
                alertas: {
                    ...lucroRealProdutos.alertas,
                    servicosSemCusto: lucroRealServicos.alertas.servicosSemCusto
                }
            };

            return res.json({
                success: true,
                data: lucroReal
            });
        } catch (error) {
            console.error('❌ Erro ao calcular Lucro Real:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao calcular Lucro Real',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/lucro-real/periodo/:periodo
     * Calcula Lucro Real para períodos pré-definidos
     */
    static async calcularLucroRealPorPeriodo(req: Request, res: Response) {
        try {
            const { periodo } = req.params;
            const hoje = new Date();
            let dataInicio: Date;
            let dataFim: Date;

            switch (periodo) {
                case 'mes-atual':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;

                case 'mes-anterior':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
                    break;

                case 'trimestre':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;

                case 'semestre':
                    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
                    dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
                    break;

                case 'ano':
                    dataInicio = new Date(hoje.getFullYear(), 0, 1);
                    dataFim = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59);
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Período inválido. Use: mes-atual, mes-anterior, trimestre, semestre ou ano'
                    });
            }

            // Calcular lucro real de produtos E serviços
            const lucroRealProdutos = await LucroRealService.calcularLucroReal(dataInicio, dataFim);
            const lucroRealServicos = await LucroRealService.calcularLucroRealServicos(dataInicio, dataFim);

            // Combinar os resultados
            const lucroReal = {
                ...lucroRealProdutos,
                servicos: lucroRealServicos.servicos,
                resumo: {
                    ...lucroRealProdutos.resumo,
                    ...lucroRealServicos.resumo
                },
                estatisticas: {
                    ...lucroRealProdutos.estatisticas,
                    totalServicos: lucroRealServicos.estatisticas.totalServicos,
                    servicosComCusto: lucroRealServicos.estatisticas.servicosComCusto,
                    servicosSemCusto: lucroRealServicos.estatisticas.servicosSemCusto
                },
                alertas: {
                    ...lucroRealProdutos.alertas,
                    servicosSemCusto: lucroRealServicos.alertas.servicosSemCusto
                }
            };

            return res.json({
                success: true,
                data: lucroReal
            });
        } catch (error) {
            console.error('❌ Erro ao calcular Lucro Real por período:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao calcular Lucro Real',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/lucro-real/top-lucrativos
     * Busca produtos mais lucrativos
     */
    static async getProdutosMaisLucrativos(req: Request, res: Response) {
        try {
            const { inicio, fim, limit } = req.query;

            if (!inicio || !fim) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros "inicio" e "fim" são obrigatórios'
                });
            }

            const dataInicio = new Date(inicio as string);
            const dataFim = new Date(fim as string);
            const limitNum = limit ? parseInt(limit as string) : 10;

            dataInicio.setHours(0, 0, 0, 0);
            dataFim.setHours(23, 59, 59, 999);

            const resultado = await LucroRealService.getProdutosMaisLucrativos(dataInicio, dataFim, limitNum);

            return res.json({
                success: true,
                data: resultado
            });
        } catch (error) {
            console.error('❌ Erro ao buscar produtos mais lucrativos:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar produtos lucrativos',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/dre/lucro-real/prejuizo
     * Busca produtos com margem negativa
     */
    static async getProdutosComPrejuizo(req: Request, res: Response) {
        try {
            const { inicio, fim } = req.query;

            if (!inicio || !fim) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros "inicio" e "fim" são obrigatórios'
                });
            }

            const dataInicio = new Date(inicio as string);
            const dataFim = new Date(fim as string);

            dataInicio.setHours(0, 0, 0, 0);
            dataFim.setHours(23, 59, 59, 999);

            const resultado = await LucroRealService.getProdutosComPrejuizo(dataInicio, dataFim);

            return res.json({
                success: true,
                data: resultado
            });
        } catch (error) {
            console.error('❌ Erro ao buscar produtos com prejuízo:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar produtos com prejuízo',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
