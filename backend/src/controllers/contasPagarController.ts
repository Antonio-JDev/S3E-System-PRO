import { Request, Response } from 'express';
import { ContasPagarService, ContaPagarPayload, ContaPagarParceladaPayload } from '../services/contasPagar.service';

export class ContasPagarController {
    /**
     * Cria uma nova conta a pagar
     */
    static async criarConta(req: Request, res: Response) {
        try {
            const body = req.body;
            // Aceitar valor ou valorParcela
            const valorParcela = body.valorParcela ?? body.valor;
            // Parsear dataVencimento corretamente para evitar problema de timezone (YYYY-MM-DD)
            let dataVencimentoParsed: Date | undefined = undefined;
            if (body.dataVencimento) {
                const raw = String(body.dataVencimento);
                if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                    const [y, m, d] = raw.split('-').map(Number);
                    dataVencimentoParsed = new Date(y, m - 1, d, 12, 0, 0, 0);
                } else {
                    dataVencimentoParsed = new Date(raw);
                }
            }

            const contaData: ContaPagarPayload = {
                ...body,
                valorParcela: typeof valorParcela === 'number' ? valorParcela : parseFloat(valorParcela),
                valorJuros: body.valorJuros != null ? Number(body.valorJuros) : undefined,
                valorDesconto: body.valorDesconto != null ? Number(body.valorDesconto) : undefined,
                dataVencimento: dataVencimentoParsed
            };

            // Validar dados obrigatórios
            if (!contaData.descricao || contaData.valorParcela == null || !contaData.dataVencimento) {
                return res.status(400).json({
                    error: 'Dados obrigatórios ausentes: descricao, valorParcela (ou valor), dataVencimento'
                });
            }

            const conta = await ContasPagarService.criarContaPagar(contaData);

            res.status(201).json({
                success: true,
                message: 'Conta a pagar criada com sucesso',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao criar conta a pagar:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Cria contas a pagar parceladas
     */
    static async criarContasParceladas(req: Request, res: Response) {
        try {
            const contaData: ContaPagarParceladaPayload = req.body;

            // Validar dados obrigatórios
            if (!contaData.descricao || !contaData.valorTotal || !contaData.parcelas || !contaData.dataPrimeiroVencimento) {
                return res.status(400).json({
                    error: 'Dados obrigatórios ausentes: descricao, valorTotal, parcelas, dataPrimeiroVencimento'
                });
            }

            const contas = await ContasPagarService.criarContasPagarParceladas(contaData);

            res.status(201).json({
                success: true,
                message: `${contas.length} contas a pagar criadas com sucesso`,
                data: contas
            });

        } catch (error) {
            console.error('Erro ao criar contas a pagar:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Marca uma conta a pagar como paga
     * Body pode conter:
     * - dataPagamento (string): Data em que o pagamento foi efetuado
     * - valorPago (number): Valor pago (opcional)
     * - observacoes (string): Observações sobre o pagamento
     * - meioPagamento (string): PIX, Boleto, Cartão, etc.
     */
    static async pagarConta(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { dataPagamento, valorPago, observacoes, meioPagamento, valorJuros, valorDesconto } = req.body;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a pagar é obrigatório'
                });
            }

            console.log('💳 Registrando pagamento:', {
                id,
                dataPagamento,
                valorPago,
                observacoes,
                meioPagamento
            });

            // ✅ CORRIGIDO: Passar dados do formulário para o serviço
            const conta = await ContasPagarService.pagarConta(
                id,
                dataPagamento,
                valorPago,
                observacoes,
                meioPagamento,
                valorJuros != null ? Number(valorJuros) : undefined,
                valorDesconto != null ? Number(valorDesconto) : undefined
            );

            res.json({
                success: true,
                message: 'Conta a pagar marcada como paga',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao pagar conta:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Agenda uma data de pagamento para uma conta a pagar
     */
    static async agendarPagamento(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { dataAgendamento } = req.body;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a pagar é obrigatório'
                });
            }

            if (!dataAgendamento) {
                return res.status(400).json({
                    error: 'Data de agendamento é obrigatória'
                });
            }

            // Parsear dataAgendamento para evitar timezone issues
            let dataAgendamentoParsed: Date;
            if (typeof dataAgendamento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataAgendamento)) {
                const [y, m, d] = dataAgendamento.split('-').map(Number);
                dataAgendamentoParsed = new Date(y, m - 1, d, 12, 0, 0, 0);
            } else {
                dataAgendamentoParsed = new Date(dataAgendamento);
            }

            const conta = await ContasPagarService.agendarPagamento(id, dataAgendamentoParsed);

            res.json({
                success: true,
                message: 'Pagamento agendado com sucesso',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao agendar pagamento:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Remove o agendamento de pagamento de uma conta
     */
    static async removerAgendamento(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a pagar é obrigatório'
                });
            }

            const conta = await ContasPagarService.removerAgendamento(id);

            res.json({
                success: true,
                message: 'Agendamento removido com sucesso',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao remover agendamento:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista contas a pagar com filtros
     */
    static async listarContas(req: Request, res: Response) {
        try {
            // ✅ CORREÇÃO CRÍTICA: Aumentar limit padrão de 10 para 1000 para evitar perda de dados em auditoria
            const {
                status,
                fornecedorId,
                tipo,
                valorExato,
                valorMin,
                valorMax,
                page = 1,
                limit = 1000
            } = req.query;

            const resultado = await ContasPagarService.listarContasPagar(
                status as string,
                fornecedorId as string,
                tipo as string,
                valorExato !== undefined ? parseFloat(valorExato as string) : undefined,
                valorMin !== undefined ? parseFloat(valorMin as string) : undefined,
                valorMax !== undefined ? parseFloat(valorMax as string) : undefined,
                parseInt(page as string),
                parseInt(limit as string)
            );

            res.json({
                success: true,
                data: resultado
            });

        } catch (error) {
            console.error('Erro ao listar contas a pagar:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca uma conta a pagar específica
     */
    static async buscarConta(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a pagar é obrigatório'
                });
            }

            const conta = await ContasPagarService.buscarContaPagar(id);

            res.json({
                success: true,
                data: conta
            });

        } catch (error) {
            console.error('Erro ao buscar conta a pagar:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Cancela uma conta a pagar
     */
    static async cancelarConta(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a pagar é obrigatório'
                });
            }

            const conta = await ContasPagarService.cancelarConta(id);

            res.json({
                success: true,
                message: 'Conta a pagar cancelada com sucesso',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao cancelar conta:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Atualiza vencimento de uma conta
     */
    static async atualizarVencimento(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { novaData } = req.body;

            if (!id || !novaData) {
                return res.status(400).json({
                    error: 'ID e nova data são obrigatórios'
                });
            }

            // Parsear novaData para evitar timezone issues
            let novaDataParsed: Date;
            if (typeof novaData === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
                const [y, m, d] = novaData.split('-').map(Number);
                novaDataParsed = new Date(y, m - 1, d, 12, 0, 0, 0);
            } else {
                novaDataParsed = new Date(novaData);
            }

            const conta = await ContasPagarService.atualizarVencimento(id, novaDataParsed);

            res.json({
                success: true,
                message: 'Vencimento atualizado com sucesso',
                data: conta
            });

        } catch (error) {
            console.error('Erro ao atualizar vencimento:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Atualiza dados de uma conta a pagar (admin/desenvolvedor)
     * Permite editar fornecedor/credor, descrição, vencimento, observações e classificação.
     * Valor, juros e desconto só em contas manuais (sem compra/XML nem despesa fixa).
     */
    static async atualizarConta(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const {
                fornecedorId,
                credorNome,
                descricao,
                valorParcela,
                valorJuros,
                valorDesconto,
                dataVencimento,
                observacoes,
                classificacao,
                meioPagamento,
                cartaoCreditoId
            } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'ID da conta a pagar é obrigatório' });
            }

            let dataVencimentoParsed: Date | undefined = undefined;
            if (dataVencimento !== undefined && dataVencimento !== null && String(dataVencimento).trim() !== '') {
                const raw = String(dataVencimento);
                if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                    const [y, m, d] = raw.split('-').map(Number);
                    dataVencimentoParsed = new Date(y, m - 1, d, 12, 0, 0, 0);
                } else {
                    dataVencimentoParsed = new Date(raw);
                }
            }

            const parseOpcionalNumero = (v: unknown): number | undefined => {
                if (v === undefined || v === null || v === '') return undefined;
                const n = typeof v === 'number' ? v : parseFloat(String(v));
                return Number.isFinite(n) ? n : undefined;
            };

            const conta = await ContasPagarService.atualizarConta(id, {
                fornecedorId: fornecedorId === '' ? null : fornecedorId,
                credorNome,
                descricao,
                valorParcela: parseOpcionalNumero(valorParcela),
                valorJuros: parseOpcionalNumero(valorJuros),
                valorDesconto: parseOpcionalNumero(valorDesconto),
                dataVencimento: dataVencimentoParsed,
                observacoes,
                classificacao,
                meioPagamento: meioPagamento === '' ? null : meioPagamento,
                cartaoCreditoId: cartaoCreditoId === '' ? null : cartaoCreditoId,
            });

            res.json({
                success: true,
                message: 'Conta a pagar atualizada com sucesso',
                data: conta
            });
        } catch (error) {
            console.error('Erro ao atualizar conta a pagar:', error);
            res.status(400).json({
                error: 'Erro ao atualizar conta a pagar',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca contas em atraso
     */
    static async getContasEmAtraso(req: Request, res: Response) {
        try {
            const contas = await ContasPagarService.getContasEmAtraso();

            res.json({
                success: true,
                data: contas
            });

        } catch (error) {
            console.error('Erro ao buscar contas em atraso:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca contas a vencer
     */
    static async getContasAVencer(req: Request, res: Response) {
        try {
            const { dias = 7 } = req.query;

            const contas = await ContasPagarService.getContasAVencer(parseInt(dias as string));

            res.json({
                success: true,
                data: contas
            });

        } catch (error) {
            console.error('Erro ao buscar contas a vencer:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista contas por tipo (FORNECEDOR, RH, DESPESA_FIXA)
     */
    static async listarPorTipo(req: Request, res: Response) {
        try {
            const { tipo } = req.params;
            const contas = await ContasPagarService.listarPorTipo(tipo);

            res.json({
                success: true,
                data: contas
            });
        } catch (error) {
            console.error('Erro ao listar contas por tipo:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Gera contas de salários para o mês
     */
    static async gerarContasSalarios(req: Request, res: Response) {
        try {
            const { mesReferencia } = req.body;
            if (!mesReferencia) {
                return res.status(400).json({
                    error: 'Mês de referência é obrigatório (formato: YYYY-MM)'
                });
            }

            const { criadas, atualizadas } = await ContasPagarService.gerarContasSalarios(mesReferencia);

            const parts: string[] = [];
            if (criadas.length) parts.push(`${criadas.length} nova(s)`);
            if (atualizadas.length) parts.push(`${atualizadas.length} atualizada(s) com valor da folha`);
            const msg =
                parts.length > 0
                    ? `Contas de salário: ${parts.join('; ')}.`
                    : 'Nenhuma alteração (contas já existentes não pendentes ou sem funcionários ativos).';

            res.status(201).json({
                success: true,
                message: msg,
                data: { criadas, atualizadas }
            });
        } catch (error) {
            console.error('Erro ao gerar contas de salários:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Gera contas de despesas fixas para o mês
     */
    static async gerarContasDespesasFixas(req: Request, res: Response) {
        try {
            const { mesReferencia } = req.body;
            if (!mesReferencia) {
                return res.status(400).json({
                    error: 'Mês de referência é obrigatório (formato: YYYY-MM)'
                });
            }

            const contas = await ContasPagarService.gerarContasDespesasFixas(mesReferencia);

            res.status(201).json({
                success: true,
                message: `${contas.length} conta(s) de despesa fixa gerada(s)`,
                data: contas
            });
        } catch (error) {
            console.error('Erro ao gerar contas de despesas fixas:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Exclui uma parcela de conta a pagar
     * Só permite excluir se:
     * - A parcela estiver paga (status = 'Pago')
     * - E a origem (compra ou despesa fixa) tiver sido excluída
     */
    static async excluirParcela(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a pagar é obrigatório'
                });
            }

            await ContasPagarService.excluirParcela(id);

            res.json({
                success: true,
                message: 'Parcela excluída com sucesso'
            });

        } catch (error) {
            console.error('Erro ao excluir parcela:', error);
            res.status(400).json({
                error: 'Erro ao excluir parcela',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Sugere contas relacionadas para unificação
     */
    static async sugerirUnificacao(req: Request, res: Response) {
        try {
            const contaIds: string[] = Array.isArray(req.body?.contaIds)
                ? req.body.contaIds
                : [];
            const janelaDias = req.body?.janelaDiasVencimento != null
                ? Number(req.body.janelaDiasVencimento)
                : 15;

            if (!contaIds.length) {
                return res.status(400).json({
                    error: 'Informe contaIds (array com ao menos 1 id)'
                });
            }

            const sugestoes = await ContasPagarService.sugerirContasParaUnificacao(
                contaIds,
                Number.isFinite(janelaDias) ? janelaDias : 15
            );

            res.json({
                success: true,
                data: sugestoes
            });
        } catch (error) {
            console.error('Erro ao sugerir unificação:', error);
            res.status(400).json({
                error: 'Erro ao sugerir unificação',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Unifica contas a pagar em uma conta ou parcelamento
     */
    static async unificarContas(req: Request, res: Response) {
        try {
            const {
                contaIds,
                parcelas,
                dataPrimeiroVencimento,
                intervaloDias,
                descricao,
                observacoes,
                meioPagamento,
                cartaoCreditoId,
            } = req.body || {};

            if (!Array.isArray(contaIds) || contaIds.length < 2) {
                return res.status(400).json({
                    error: 'Informe contaIds com ao menos 2 contas'
                });
            }

            const resultado = await ContasPagarService.unificarContasPagar({
                contaIds,
                parcelas: parcelas != null ? Number(parcelas) : 1,
                dataPrimeiroVencimento,
                intervaloDias: intervaloDias != null ? Number(intervaloDias) : 30,
                descricao,
                observacoes,
                meioPagamento,
                cartaoCreditoId,
            });

            res.status(201).json({
                success: true,
                message: `${resultado.contasCanceladas} conta(s) unificada(s) em ${resultado.contasCriadas.length} parcela(s)`,
                data: resultado
            });
        } catch (error) {
            console.error('Erro ao unificar contas a pagar:', error);
            res.status(400).json({
                error: 'Erro ao unificar contas',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}

