import { Request, Response } from 'express';
import { VendasService, VendaPayload } from '../services/vendas.service';
import { VendaStatus } from '../types/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class VendasController {
    /**
     * Verifica disponibilidade de estoque para um orçamento
     */
    static async verificarEstoque(req: Request, res: Response) {
        try {
            const { orcamentoId } = req.params;

            if (!orcamentoId) {
                return res.status(400).json({
                    error: 'ID do orçamento é obrigatório'
                });
            }

            const verificacao = await VendasService.verificarEstoqueOrcamento(orcamentoId);

            res.json({
                success: true,
                data: verificacao
            });

        } catch (error) {
            console.error('Erro ao verificar estoque:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Realiza uma nova venda
     */
    static async realizarVenda(req: Request, res: Response) {
        try {
            const vendaData: VendaPayload = req.body;

            // Validar dados obrigatórios
            if (!vendaData.orcamentoId || !vendaData.clienteId || !vendaData.valorTotal) {
                return res.status(400).json({
                    error: 'Dados obrigatórios ausentes: orcamentoId, clienteId, valorTotal'
                });
            }

            const resultado = await VendasService.realizarVenda(vendaData);

            res.status(201).json({
                success: true,
                message: 'Venda realizada com sucesso',
                data: resultado
            });

        } catch (error) {
            console.error('Erro ao realizar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca dados para o dashboard financeiro
     */
    static async getDashboard(req: Request, res: Response) {
        try {
            const dashboardData = await VendasService.getVendasDashboard();

            res.json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Lista todas as vendas com paginação
     */
    static async listarVendas(req: Request, res: Response) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const resultado = await VendasService.listarVendas(
                parseInt(page as string),
                parseInt(limit as string)
            );

            res.json({
                success: true,
                data: resultado
            });

        } catch (error) {
            console.error('Erro ao listar vendas:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Busca uma venda específica
     */
    static async buscarVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da venda é obrigatório'
                });
            }

            const venda = await VendasService.buscarVenda(id);

            if (!venda) {
                return res.status(404).json({
                    error: 'Venda não encontrada'
                });
            }

            res.json({
                success: true,
                data: venda
            });

        } catch (error) {
            console.error('Erro ao buscar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Cancela uma venda
     */
    static async cancelarVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da venda é obrigatório'
                });
            }

            const venda = await VendasService.cancelarVenda(id);

            res.json({
                success: true,
                message: 'Venda cancelada com sucesso',
                data: venda
            });

        } catch (error) {
            console.error('Erro ao cancelar venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * Marca uma conta a receber como paga
     * Body pode conter:
     * - dataPagamento (string ISO)
     * - valorRecebido (number)  ← usado para validações futuras
     * - observacoes (string)
     */
    static async pagarConta(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da conta a receber é obrigatório'
                });
            }

            const conta = await VendasService.pagarConta(id, req.body);

            res.json({
                success: true,
                message: 'Conta marcada como paga',
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
     * Excluir venda permanentemente
     * Segue o padrão: Venda -> Projeto -> Obra (exclusão em cascata)
     */
    static async excluirVenda(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    error: 'ID da venda é obrigatório'
                });
            }

            // Verificar se venda existe
            const venda = await prisma.venda.findUnique({
                where: { id },
                include: {
                    contasReceber: true,
                    projeto: {
                        include: {
                            obra: {
                                include: {
                                    tarefas: { select: { id: true } }
                                }
                            }
                        }
                    }
                }
            });

            if (!venda) {
                return res.status(404).json({
                    error: 'Venda não encontrada'
                });
            }

            // Verificar se há contas a receber pendentes
            const contasPendentes = venda.contasReceber?.filter(conta => conta.status === 'Pendente') || [];
            if (contasPendentes.length > 0) {
                return res.status(400).json({
                    error: 'Não é possível excluir venda com contas a receber pendentes'
                });
            }

            // Log de auditoria
            console.log('═══════════════════════════════════════════════════════════');
            console.log('⚠️  EXCLUSÃO PERMANENTE DE VENDA');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`💰 Venda: ${venda.numeroVenda} (ID: ${venda.id})`);
            console.log(`💵 Valor Total: R$ ${venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
            console.log(`📅 Data Venda: ${venda.dataVenda.toLocaleString('pt-BR')}`);
            console.log(`⏰ Data/Hora Exclusão: ${new Date().toLocaleString('pt-BR')}`);

            // Excluir em transação para garantir consistência
            await prisma.$transaction(async (tx) => {
                // 1. Se houver projeto vinculado, excluir projeto (que excluirá a obra em cascata)
                if (venda.projetoId && venda.projeto) {
                    const projeto = venda.projeto;
                    console.log(`📋 Projeto vinculado: ${projeto.titulo} (ID: ${projeto.id})`);
                    
                    // Verificar se há obra vinculada ao projeto
                    if (projeto.obra) {
                        const obra = projeto.obra;
                        console.log(`🏗️  Obra vinculada: ${obra.nomeObra} (ID: ${obra.id}, Status: ${obra.status}, Tarefas: ${obra.tarefas.length})`);
                        console.log(`⚠️  A obra vinculada será EXCLUÍDA PERMANENTEMENTE junto com o projeto`);
                        
                        // Excluir obra explicitamente (o onDelete: Cascade já faria isso, mas fazemos explicitamente para logs)
                        await tx.obra.delete({
                            where: { id: obra.id }
                        });
                        console.log(`✅ Obra excluída permanentemente: ${obra.id}`);
                    }
                    
                    // Excluir projeto (o onDelete: Cascade já excluiria a obra, mas já fizemos explicitamente)
                    await tx.projeto.delete({
                        where: { id: projeto.id }
                    });
                    console.log(`✅ Projeto excluído permanentemente: ${projeto.id}`);
                }

                // 2. Excluir contas a receber associadas
                await tx.contaReceber.deleteMany({
                    where: { vendaId: id }
                });
                console.log(`✅ Contas a receber excluídas`);

                // 3. Excluir venda
                await tx.venda.delete({
                    where: { id }
                });
                console.log(`✅ Venda excluída permanentemente: ${venda.id}`);
            });

            console.log('═══════════════════════════════════════════════════════════');

            res.json({
                success: true,
                message: venda.projetoId 
                    ? 'Venda, projeto e obra excluídos com sucesso' 
                    : 'Venda excluída com sucesso'
            });

        } catch (error) {
            console.error('Erro ao excluir venda:', error);
            res.status(500).json({
                error: 'Erro interno do servidor',
                message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
