import { Request, Response } from 'express';
import { FuncionariosService } from '../services/funcionarios.service';

export const FuncionariosController = {
    // GET /api/funcionarios
    async listar(req: Request, res: Response) {
        try {
            const funcionarios = await FuncionariosService.listarFuncionarios();

            // Se o role do usuário estiver na lista que não deve ver salários, removemos esse campo
            const userRole = (req as any).user?.role?.toLowerCase();
            const hideSalaryFor = ['engenheiro_eletricista', 'gerente', 'desenhista_industrial'];
            if (userRole && hideSalaryFor.includes(userRole)) {
                const masked = funcionarios.map((f: any) => {
                    const { salario, ...rest } = f;
                    return { ...rest, salario: null }; // ocultar salário
                });
                return res.json({ success: true, data: masked });
            }

            return res.json({ success: true, data: funcionarios });
        } catch (error: any) {
            console.error('❌ Erro ao listar funcionários:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao listar funcionários',
                error: error.message 
            });
        }
    },

    // GET /api/funcionarios/:id
    async buscar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const funcionario = await FuncionariosService.buscarFuncionario(id);
            
            if (!funcionario) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Funcionário não encontrado' 
                });
            }

            // Ocultar salário para roles específicos
            const userRole = (req as any).user?.role?.toLowerCase();
            const hideSalaryFor = ['engenheiro_eletricista', 'gerente', 'desenhista_industrial'];
            if (userRole && hideSalaryFor.includes(userRole) && funcionario) {
                const { salario, ...rest } = funcionario as any;
                return res.json({ success: true, data: { ...rest, salario: null } });
            }

            return res.json({ success: true, data: funcionario });
        } catch (error: any) {
            console.error('❌ Erro ao buscar funcionário:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar funcionário',
                error: error.message 
            });
        }
    },

    // POST /api/funcionarios
    async criar(req: Request, res: Response) {
        try {
            const funcionario = await FuncionariosService.criarFuncionario(req.body);
            return res.status(201).json({ success: true, data: funcionario });
        } catch (error: any) {
            console.error('❌ Erro ao criar funcionário:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao criar funcionário',
                error: error.message 
            });
        }
    },

    // PUT /api/funcionarios/:id
    async atualizar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const funcionario = await FuncionariosService.atualizarFuncionario(id, req.body);
            return res.json({ success: true, data: funcionario });
        } catch (error: any) {
            console.error('❌ Erro ao atualizar funcionário:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao atualizar funcionário',
                error: error.message 
            });
        }
    },

    // DELETE /api/funcionarios/:id
    async deletar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await FuncionariosService.deletarFuncionario(id);
            return res.json({ success: true, message: 'Funcionário deletado com sucesso' });
        } catch (error: any) {
            console.error('❌ Erro ao deletar funcionário:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao deletar funcionário',
                error: error.message 
            });
        }
    },

    // GET /api/funcionarios/metricas?mes=YYYY-MM
    async obterMetricas(req: Request, res: Response) {
        try {
            const mesRef = typeof req.query.mes === 'string' ? req.query.mes : undefined;
            const metricas = await FuncionariosService.obterMetricasRH(mesRef);
            // Se o usuário não deve ver dados salariais, mascarar métricas financeiras
            const userRole = (req as any).user?.role?.toLowerCase();
            const hideSalaryFor = ['engenheiro_eletricista', 'gerente', 'desenhista_industrial'];
            if (userRole && hideSalaryFor.includes(userRole)) {
                const masked = {
                    totalFuncionarios: metricas.totalFuncionarios,
                    folhaPagamento: null,
                    valesMes: null,
                    custoTotal: null,
                    porFuncionario: null,
                    masked: true
                };
                return res.json({ success: true, data: masked });
            }

            return res.json({ success: true, data: metricas });
        } catch (error: any) {
            console.error('❌ Erro ao obter métricas de RH:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao obter métricas',
                error: error.message 
            });
        }
    },

    // GET /api/funcionarios/:id/historico-pagamentos
    async historicoPagamentos(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const contas = await FuncionariosService.historicoPagamentos(id);
            return res.json({ success: true, data: contas });
        } catch (error: any) {
            console.error('❌ Erro ao buscar histórico de pagamentos:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar histórico de pagamentos',
                error: error.message 
            });
        }
    }
};

