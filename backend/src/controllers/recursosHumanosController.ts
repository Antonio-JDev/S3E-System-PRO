import { Request, Response } from 'express';
import {
    RecursosHumanosService,
    CriarRecursoHumanoDTO,
    AtualizarRecursoHumanoDTO,
    RegistrarEntregasRecursoHumanoDTO
} from '../services/recursosHumanos.service';

export class RecursosHumanosController {
    /**
     * GET /api/recursos-humanos
     * Lista todos os recursos humanos
     */
    static async listar(req: Request, res: Response): Promise<void> {
        try {
            const { compraId, funcionarioId, semVinculacao } = req.query;

            const filtros: any = {};
            if (compraId) filtros.compraId = compraId as string;
            if (funcionarioId) filtros.funcionarioId = funcionarioId as string;
            if (semVinculacao === 'true') filtros.semVinculacao = true;

            const recursos = await RecursosHumanosService.listar(filtros);

            res.json({
                success: true,
                data: recursos
            });
        } catch (error: any) {
            console.error('Erro ao listar recursos humanos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao listar recursos humanos',
                message: error.message
            });
        }
    }

    /**
     * GET /api/recursos-humanos/:id
     * Busca um recurso humano por ID
     */
    static async buscar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }

            const recurso = await RecursosHumanosService.buscar(id);

            res.json({
                success: true,
                data: recurso
            });
        } catch (error: any) {
            console.error('Erro ao buscar recurso humano:', error);
            
            if (error.message === 'Recurso humano não encontrado') {
                res.status(404).json({
                    success: false,
                    error: 'Recurso humano não encontrado'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Erro ao buscar recurso humano',
                    message: error.message
                });
            }
        }
    }

    /**
     * POST /api/recursos-humanos
     * Cria um novo recurso humano
     */
    static async criar(req: Request, res: Response): Promise<void> {
        try {
            const data: CriarRecursoHumanoDTO = {
                compraId: req.body.compraId || undefined,
                compraItemId: req.body.compraItemId,
                nomeItem: req.body.nomeItem,
                quantidade: req.body.quantidade,
                valorUnitario: req.body.valorUnitario,
                valorTotal: req.body.valorTotal,
                funcionarioId: req.body.funcionarioId,
                observacoes: req.body.observacoes
            };

            // Validações (compraId opcional: permite entrada manual)
            if (!data.nomeItem) {
                res.status(400).json({
                    success: false,
                    error: 'Nome do item é obrigatório'
                });
                return;
            }

            if (!data.quantidade || data.quantidade <= 0) {
                res.status(400).json({
                    success: false,
                    error: 'Quantidade deve ser maior que zero'
                });
                return;
            }

            const recurso = await RecursosHumanosService.criar(data);

            res.status(201).json({
                success: true,
                data: recurso,
                message: 'Recurso humano criado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao criar recurso humano:', error);
            res.status(400).json({
                success: false,
                error: 'Erro ao criar recurso humano',
                message: error.message
            });
        }
    }

    /**
     * PUT /api/recursos-humanos/:id
     * Atualiza um recurso humano
     */
    static async atualizar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }

            const data: AtualizarRecursoHumanoDTO = {
                nomeItem: req.body.nomeItem,
                quantidade: req.body.quantidade,
                valorUnitario: req.body.valorUnitario,
                valorTotal: req.body.valorTotal,
                funcionarioId: req.body.funcionarioId,
                dataVinculacao: req.body.dataVinculacao ? new Date(req.body.dataVinculacao) : undefined,
                observacoes: req.body.observacoes,
                quantidadeMovimentacao: req.body.quantidadeMovimentacao
            };

            const recurso = await RecursosHumanosService.atualizar(id, data);

            res.json({
                success: true,
                data: recurso,
                message: 'Recurso humano atualizado com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao atualizar recurso humano:', error);
            
            if (error.message === 'Recurso humano não encontrado') {
                res.status(404).json({
                    success: false,
                    error: 'Recurso humano não encontrado'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar recurso humano',
                    message: error.message
                });
            }
        }
    }

    /**
     * DELETE /api/recursos-humanos/:id
     * Exclui um recurso humano
     */
    static async excluir(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }

            await RecursosHumanosService.excluir(id);

            res.json({
                success: true,
                message: 'Recurso humano excluído com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao excluir recurso humano:', error);
            
            if (error.message === 'Recurso humano não encontrado') {
                res.status(404).json({
                    success: false,
                    error: 'Recurso humano não encontrado'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Erro ao excluir recurso humano',
                    message: error.message
                });
            }
        }
    }

    /**
     * POST /api/recursos-humanos/criar-de-compra/:compraId
     * Cria recursos humanos automaticamente a partir de uma compra
     */
    static async criarDeCompra(req: Request, res: Response): Promise<void> {
        try {
            const { compraId } = req.params;

            if (!compraId) {
                res.status(400).json({
                    success: false,
                    error: 'ID da compra é obrigatório'
                });
                return;
            }

            const recursos = await RecursosHumanosService.criarRecursosDeCompra(compraId);

            res.status(201).json({
                success: true,
                data: recursos,
                message: `${recursos.length} recurso(s) humano(s) criado(s) com sucesso`
            });
        } catch (error: any) {
            console.error('Erro ao criar recursos de compra:', error);
            res.status(400).json({
                success: false,
                error: 'Erro ao criar recursos de compra',
                message: error.message
            });
        }
    }

    /**
     * GET /api/recursos-humanos/:id/historico
     * Busca histórico de um recurso humano
     */
    static async buscarHistorico(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID é obrigatório'
                });
                return;
            }

            const historico = await RecursosHumanosService.buscarHistorico(id);

            res.json({
                success: true,
                data: historico
            });
        } catch (error: any) {
            console.error('Erro ao buscar histórico:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar histórico',
                message: error.message
            });
        }
    }

    /**
     * GET /api/recursos-humanos/funcionario/:funcionarioId/historico
     * Busca histórico de recursos humanos de um funcionário
     */
    static async buscarHistoricoPorFuncionario(req: Request, res: Response): Promise<void> {
        try {
            const { funcionarioId } = req.params;

            if (!funcionarioId) {
                res.status(400).json({
                    success: false,
                    error: 'ID do funcionário é obrigatório'
                });
                return;
            }

            const historico = await RecursosHumanosService.buscarHistoricoPorFuncionario(funcionarioId);

            res.json({
                success: true,
                data: historico
            });
        } catch (error: any) {
            console.error('Erro ao buscar histórico por funcionário:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar histórico',
                message: error.message
            });
        }
    }

    /**
     * POST /api/recursos-humanos/:id/entregas
     * Registra entregas para múltiplos funcionários com baixa automática no estoque.
     */
    static async registrarEntregas(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({
                    success: false,
                    error: 'ID do recurso é obrigatório'
                });
                return;
            }

            const data: RegistrarEntregasRecursoHumanoDTO = {
                funcionarioIds: Array.isArray(req.body.funcionarioIds) ? req.body.funcionarioIds : [],
                quantidadePorFuncionario: req.body.quantidadePorFuncionario,
                dataEntrega: req.body.dataEntrega ? new Date(req.body.dataEntrega) : undefined,
                observacoes: req.body.observacoes
            };

            const resultado = await RecursosHumanosService.registrarEntregas(id, data);

            res.json({
                success: true,
                data: resultado,
                message: 'Entregas registradas com sucesso'
            });
        } catch (error: any) {
            console.error('Erro ao registrar entregas de recurso humano:', error);
            res.status(400).json({
                success: false,
                error: 'Erro ao registrar entregas',
                message: error.message
            });
        }
    }
}
