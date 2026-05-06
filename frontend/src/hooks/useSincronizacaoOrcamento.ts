import { useState, useCallback } from 'react';
import { axiosApiService } from '../services/axiosApi';

interface ValidacaoModificacao {
    podeModificar: boolean;
    motivo?: string;
    vendaInfo?: {
        numeroVenda: string;
        valorTotal: number;
        contasPagas: number;
    };
}

interface ResultadoSincronizacao {
    success: boolean;
    blocked?: boolean;
    requiresAdminApproval?: boolean;
    message?: string;
    data?: any;
}

/**
 * Hook para gerenciar sincronização de orçamento com PV
 * Inclui validações, alertas e proteções financeiras
 */
export const useSincronizacaoOrcamento = () => {
    const [validando, setValidando] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [bloqueado, setBloqueado] = useState(false);
    const [validacao, setValidacao] = useState<ValidacaoModificacao | null>(null);

    /**
     * Valida se o orçamento pode ser modificado
     */
    const validarModificacao = useCallback(async (orcamentoId: string): Promise<ValidacaoModificacao> => {
        setValidando(true);
        try {
            const response = await axiosApiService.get(
                `/api/orcamentos/${orcamentoId}/validar-modificacao`
            );

            if (response.success && response.data) {
                const resultado = response.data as ValidacaoModificacao;
                setValidacao(resultado);
                setBloqueado(!resultado.podeModificar);
                return resultado;
            }
            
            return {
                podeModificar: true // Em caso de erro, permitir modificação (fail-safe)
            };
        } catch (error) {
            console.error('Erro ao validar modificação:', error);
            return {
                podeModificar: true // Em caso de erro, permitir modificação (fail-safe)
            };
        } finally {
            setValidando(false);
        }
    }, []);

    /**
     * Sincroniza o orçamento com o PV
     */
    const sincronizar = useCallback(async (
        orcamentoId: string,
        bdiPadrao: number = 30
    ): Promise<ResultadoSincronizacao> => {
        setSincronizando(true);
        try {
            const response = await axiosApiService.post(
                `/api/orcamentos/${orcamentoId}/sincronizar-pv`,
                { bdiPadrao }
            );

            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: response.message
                };
            }
            
            return {
                success: false,
                message: response.error || 'Erro ao sincronizar orçamento'
            };
        } catch (error: any) {
            console.error('Erro ao sincronizar:', error);
            return {
                success: false,
                message: error.message || 'Erro ao sincronizar orçamento'
            };
        } finally {
            setSincronizando(false);
        }
    }, []);

    /**
     * Solicita reabertura de pedido bloqueado
     */
    const solicitarReabertura = useCallback(async (
        orcamentoId: string,
        justificativa: string,
        itensAdicionais?: any[]
    ): Promise<ResultadoSincronizacao> => {
        try {
            const response = await axiosApiService.post(
                `/api/orcamentos/${orcamentoId}/solicitar-reabertura`,
                { justificativa, itensAdicionais }
            );

            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: response.message
                };
            }
            
            return {
                success: false,
                message: response.error || 'Erro ao solicitar reabertura'
            };
        } catch (error: any) {
            console.error('Erro ao solicitar reabertura:', error);
            return {
                success: false,
                message: error.message || 'Erro ao solicitar reabertura'
            };
        }
    }, []);

    /**
     * Aplica margem padrão a um item específico
     */
    const aplicarMargemItem = useCallback(async (
        orcamentoId: string,
        itemId: string,
        bdiPadrao: number = 30
    ): Promise<ResultadoSincronizacao> => {
        try {
            const response = await axiosApiService.post(
                `/api/orcamentos/${orcamentoId}/items/${itemId}/aplicar-margem`,
                { bdiPadrao }
            );

            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: response.message
                };
            }
            
            return {
                success: false,
                message: response.error || 'Erro ao aplicar margem'
            };
        } catch (error: any) {
            console.error('Erro ao aplicar margem:', error);
            return {
                success: false,
                message: error.message || 'Erro ao aplicar margem'
            };
        }
    }, []);

    return {
        validando,
        sincronizando,
        bloqueado,
        validacao,
        validarModificacao,
        sincronizar,
        solicitarReabertura,
        aplicarMargemItem
    };
};
