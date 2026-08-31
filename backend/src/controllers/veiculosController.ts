import { Request, Response } from 'express';
import { VeiculosService } from '../services/veiculos.service';

export const VeiculosController = {
    // GET /api/veiculos
    async listar(req: Request, res: Response) {
        try {
            const veiculos = await VeiculosService.listarVeiculos();
            return res.json({ success: true, data: veiculos });
        } catch (error: any) {
            console.error('❌ Erro ao listar veículos:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao listar veículos',
                error: error.message 
            });
        }
    },

    // GET /api/veiculos/:id
    async buscar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const veiculo = await VeiculosService.buscarVeiculo(id);
            
            if (!veiculo) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Veículo não encontrado' 
                });
            }

            return res.json({ success: true, data: veiculo });
        } catch (error: any) {
            console.error('❌ Erro ao buscar veículo:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao buscar veículo',
                error: error.message 
            });
        }
    },

    // POST /api/veiculos
    async criar(req: Request, res: Response) {
        try {
            const veiculo = await VeiculosService.criarVeiculo(req.body);
            return res.status(201).json({ success: true, data: veiculo });
        } catch (error: any) {
            console.error('❌ Erro ao criar veículo:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao criar veículo',
                error: error.message 
            });
        }
    },

    // PUT /api/veiculos/:id
    async atualizar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const veiculo = await VeiculosService.atualizarVeiculo(id, req.body);
            return res.json({ success: true, data: veiculo });
        } catch (error: any) {
            console.error('❌ Erro ao atualizar veículo:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao atualizar veículo',
                error: error.message 
            });
        }
    },

    // DELETE /api/veiculos/:id
    async deletar(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await VeiculosService.deletarVeiculo(id);
            return res.json({ success: true, message: 'Veículo deletado com sucesso' });
        } catch (error: any) {
            console.error('❌ Erro ao deletar veículo:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao deletar veículo',
                error: error.message 
            });
        }
    },

    // GET /api/veiculos/metricas
    async obterMetricas(req: Request, res: Response) {
        try {
            const metricas = await VeiculosService.obterMetricasFrota();
            return res.json({ success: true, data: metricas });
        } catch (error: any) {
            console.error('❌ Erro ao obter métricas de frota:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao obter métricas',
                error: error.message 
            });
        }
    },

    // GET /api/veiculos/alertas-ipva
    async obterAlertasIpva(req: Request, res: Response) {
        try {
            const mes = req.query.mes ? Number(req.query.mes) : undefined;
            const ano = req.query.ano ? Number(req.query.ano) : undefined;
            const alertas = await VeiculosService.obterAlertasIpva(mes, ano);
            return res.json({ success: true, data: alertas });
        } catch (error: any) {
            console.error('❌ Erro ao obter alertas IPVA:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao obter alertas IPVA',
                error: error.message,
            });
        }
    },

    // GET /api/veiculos/:id/consumo
    async obterConsumo(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const consumo = await VeiculosService.obterConsumoPorVeiculo(id);
            if (!consumo) {
                return res.status(404).json({
                    success: false,
                    message: 'Veículo não encontrado',
                });
            }
            return res.json({ success: true, data: consumo });
        } catch (error: any) {
            console.error('❌ Erro ao obter consumo do veículo:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao obter consumo',
                error: error.message,
            });
        }
    }
};

