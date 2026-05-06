import { Request, Response } from 'express';
import { FluxoCaixaService } from '../services/fluxoCaixa.service';

export class FluxoCaixaController {
    /**
     * GET /api/financeiro/fluxo-caixa
     * Projeção: dias (30|60|90), modo (confirmado|previsao)
     * Realizado: tipo=realizado, dataInicio (YYYY-MM-DD), dataFim (YYYY-MM-DD)
     */
    static async calcularFluxoCaixa(req: Request, res: Response) {
        try {
            const { dias = 90, modo = 'confirmado', tipo, dataInicio, dataFim } = req.query;

            if (tipo === 'realizado') {
                const inicioStr = dataInicio as string;
                const fimStr = dataFim as string;
                if (!inicioStr || !fimStr) {
                    return res.status(400).json({
                        success: false,
                        message: 'Para fluxo realizado são obrigatórios dataInicio e dataFim (YYYY-MM-DD)'
                    });
                }
                const inicio = new Date(inicioStr);
                const fim = new Date(fimStr);
                if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Datas inválidas. Use formato YYYY-MM-DD'
                    });
                }
                if (inicio > fim) {
                    return res.status(400).json({
                        success: false,
                        message: 'Data início deve ser anterior à data fim'
                    });
                }
                const fluxoCaixa = await FluxoCaixaService.calcularFluxoCaixaRealizado(inicio, fim);
                return res.json({
                    success: true,
                    data: fluxoCaixa
                });
            }

            const diasNum = parseInt(dias as string);
            const modoValido = (modo === 'confirmado' || modo === 'previsao') ? modo : 'confirmado';

            const fluxoCaixa = await FluxoCaixaService.calcularFluxoCaixaFuturo(diasNum, modoValido);

            return res.json({
                success: true,
                data: fluxoCaixa
            });
        } catch (error) {
            console.error('❌ Erro ao calcular fluxo de caixa:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao calcular fluxo de caixa',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/fluxo-caixa/dia/:data
     * Busca movimentações de um dia específico
     */
    static async buscarMovimentacoesDia(req: Request, res: Response) {
        try {
            const { data } = req.params;

            if (!data) {
                return res.status(400).json({
                    success: false,
                    message: 'Data é obrigatória'
                });
            }

            const dataObj = new Date(data);
            
            if (isNaN(dataObj.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Data inválida'
                });
            }

            const movimentacoes = await FluxoCaixaService.buscarMovimentacoesDia(dataObj);

            return res.json({
                success: true,
                data: movimentacoes
            });
        } catch (error) {
            console.error('❌ Erro ao buscar movimentações do dia:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar movimentações',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/financeiro/fluxo-caixa/comparacao
     * Compara Confirmado vs Previsão
     */
    static async compararConfirmadoVsPrevisao(req: Request, res: Response) {
        try {
            const { dias = 90 } = req.query;

            const diasNum = parseInt(dias as string);

            const comparacao = await FluxoCaixaService.compararConfirmadoVsPrevisao(diasNum);

            return res.json({
                success: true,
                data: comparacao
            });
        } catch (error) {
            console.error('❌ Erro ao comparar confirmado vs previsão:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao comparar cenários',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
