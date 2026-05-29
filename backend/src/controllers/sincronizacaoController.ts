import { Request, Response } from 'express';
import { SincronizacaoOrcamentoPVService } from '../services/sincronizacaoOrcamentoPV.service';
import { AuditoriaService } from '../services/auditoria.service';

export class SincronizacaoController {
    /**
     * POST /api/orcamentos/:id/sincronizar-pv
     * Sincroniza manualmente o orçamento com o PV
     */
    static async sincronizarManualmente(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { bdiPadrao } = req.body;

            const resultado = await SincronizacaoOrcamentoPVService.sincronizarAposAlteracaoOrcamento(
                id,
                undefined,
                bdiPadrao || 30
            );

            if (!resultado.success) {
                return res.status(400).json({
                    ...resultado,
                    success: false
                });
            }

            return res.json({
                success: true,
                message: 'Sincronização realizada com sucesso',
                data: resultado
            });
        } catch (error) {
            console.error('❌ Erro ao sincronizar:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao sincronizar orçamento com PV',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/orcamentos/:id/validar-modificacao
     * Valida se o orçamento pode ser modificado (verifica status do PV)
     */
    static async validarModificacao(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const resultado = await SincronizacaoOrcamentoPVService.validarSePodemModificarOrcamento(id);

            return res.json({
                success: true,
                data: resultado
            });
        } catch (error) {
            console.error('❌ Erro ao validar:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao validar modificação',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /api/orcamentos/:orcamentoId/items/:itemId/aplicar-margem
     * Aplica margem padrão a um item específico
     */
    static async aplicarMargemItem(req: Request, res: Response) {
        try {
            const { orcamentoId, itemId } = req.params;
            const { bdiPadrao } = req.body;

            const item = await SincronizacaoOrcamentoPVService.aplicarMargemPadraoNovoItem(
                itemId,
                bdiPadrao || 30
            );

            // Sincronizar após aplicar margem
            await SincronizacaoOrcamentoPVService.sincronizarOrcamentoComPV(orcamentoId);

            return res.json({
                success: true,
                message: 'Margem aplicada e orçamento sincronizado',
                data: item
            });
        } catch (error) {
            console.error('❌ Erro ao aplicar margem:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao aplicar margem',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * POST /api/orcamentos/:id/solicitar-reabertura
     * Solicita reabertura de pedido bloqueado para modificação
     */
    static async solicitarReabertura(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { justificativa, itensAdicionais } = req.body;
            const usuarioId = (req as any).user?.id || 'unknown';
            const usuarioNome = (req as any).user?.nome || 'Usuário';

            // Buscar informações do orçamento e venda
            const validacao = await SincronizacaoOrcamentoPVService.validarSePodemModificarOrcamento(id);

            if (validacao.podeModificar) {
                return res.status(400).json({
                    success: false,
                    message: 'Este orçamento não está bloqueado. Você pode modificá-lo diretamente.'
                });
            }

            // Registrar solicitação
            const resultado = await AuditoriaService.registrarSolicitacaoReabertura({
                orcamentoId: id,
                vendaId: validacao.vendaInfo?.numeroVenda || '',
                numeroVenda: validacao.vendaInfo?.numeroVenda || '',
                solicitanteId: usuarioId,
                solicitanteNome: usuarioNome,
                justificativa: justificativa || 'Cliente solicitou alterações adicionais',
                itensAdicionais
            });

            return res.json({
                success: true,
                message: 'Solicitação de reabertura enviada com sucesso. Aguarde aprovação do administrador.',
                data: resultado
            });
        } catch (error) {
            console.error('❌ Erro ao solicitar reabertura:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao solicitar reabertura',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }

    /**
     * GET /api/orcamentos/:id/logs-auditoria
     * Busca logs de auditoria de um orçamento
     */
    static async buscarLogsAuditoria(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const resultado = await AuditoriaService.buscarLogsOrcamento(id);

            return res.json({
                success: true,
                data: resultado
            });
        } catch (error) {
            console.error('❌ Erro ao buscar logs:', error);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar logs de auditoria',
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    }
}
