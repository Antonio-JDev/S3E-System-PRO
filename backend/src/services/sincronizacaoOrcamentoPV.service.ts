import { prisma } from '../lib/prisma';
import { AuditoriaService } from './auditoria.service';

/**
 * Serviço para sincronização automática entre Orçamento e Pedido de Venda
 * Garante que mudanças no orçamento sejam refletidas no PV e Contas a Receber
 */
export class SincronizacaoOrcamentoPVService {
    /**
     * Sincroniza o Pedido de Venda com o Orçamento após alterações
     * Atualiza itens, valores e contas a receber
     */
    static async sincronizarOrcamentoComPV(orcamentoId: string, itemModificadoId?: string) {
        console.log(`🔄 Iniciando sincronização do Orçamento ${orcamentoId} com PV...`);

        // 1. Buscar orçamento com todos os itens
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            include: {
                items: {
                    include: {
                        material: true,
                        kit: true,
                        cotacao: true
                    }
                },
                venda: {
                    include: {
                        contasReceber: true
                    }
                }
            }
        });

        if (!orcamento) {
            throw new Error('Orçamento não encontrado');
        }

        // 2. Verificar se orçamento está aprovado ou concretizado
        if (orcamento.status !== 'Aprovado' && orcamento.status !== 'Concretizado') {
            console.log('⚠️ Orçamento não está aprovado/concretizado. Sincronização cancelada.');
            return {
                success: false,
                message: 'Orçamento precisa estar aprovado ou concretizado para sincronizar com PV'
            };
        }

        // 3. Verificar se existe venda vinculada
        if (!orcamento.venda) {
            console.log('⚠️ Não existe Pedido de Venda vinculado a este orçamento.');
            return {
                success: false,
                message: 'Não existe Pedido de Venda para sincronizar'
            };
        }

        const venda = orcamento.venda;

        // 4. TRAVA DE SEGURANÇA: Se qualquer parcela estiver Recebido ou Pago, bloquear sincronização
        const algumaParcelaPaga = (venda.contasReceber || []).some(
            (c: any) => c.status === 'Pago' || c.status === 'Recebido'
        );
        if (algumaParcelaPaga) {
            console.log('🚫 BLOQUEIO: Este pedido já possui movimentações confirmadas.');
            await AuditoriaService.registrarTentativaModificacaoBloqueada({
                orcamentoId,
                vendaId: venda.id,
                numeroVenda: venda.numeroVenda,
                usuarioId: 'system',
                usuarioNome: 'Sistema',
                motivo: 'Pedido de Venda com parcela(s) já recebida(s)/paga(s)',
                detalhes: {
                    valorTotal: venda.valorTotal,
                    contasReceber: (venda.contasReceber || []).length
                }
            });
            return {
                success: false,
                blocked: true,
                message: 'Este pedido já possui movimentações confirmadas. Alterações no orçamento não afetarão o financeiro faturado.',
                vendaId: venda.id,
                numeroVenda: venda.numeroVenda,
                requiresAdminApproval: false
            };
        }

        // 5. Calcular novos totais do orçamento
        const valoresAnteriores = {
            custoTotal: orcamento.custoTotal,
            precoVenda: orcamento.precoVenda
        };
        
        const { custoTotal, precoVenda, valorAReceber } = this.calcularTotaisOrcamento(orcamento);

        console.log(`💰 Novos valores calculados:`);
        console.log(`   Custo Total: R$ ${custoTotal.toFixed(2)}`);
        console.log(`   Preço Venda (cliente): R$ ${precoVenda.toFixed(2)}`);
        console.log(`   Valor a receber (empresa): R$ ${valorAReceber.toFixed(2)}`);

        // 6. Atualizar em transação
        return await prisma.$transaction(async (tx) => {
            // 6.1 Atualizar valores do orçamento
            await tx.orcamento.update({
                where: { id: orcamentoId },
                data: {
                    custoTotal,
                    precoVenda,
                    updatedAt: new Date()
                }
            });

            // 6.2 Atualizar valor total do PV (valor que a empresa recebe; exclui itens venda direta)
            await tx.venda.update({
                where: { id: venda.id },
                data: {
                    valorTotal: valorAReceber,
                    updatedAt: new Date()
                }
            });

            // 6.3 Recalcular e atualizar Contas a Receber (baseado no valor a receber)
            const valorEntradaUsar = Math.min(Number(venda.valorEntrada) || 0, valorAReceber);
            const resultado = await this.recalcularContasReceber(tx, venda.id, valorAReceber, venda.parcelas, valorEntradaUsar);

            console.log('✅ Sincronização concluída com sucesso!');

            // 📝 AUDITORIA: Registrar sincronização bem-sucedida
            await AuditoriaService.registrarSincronizacaoSucesso({
                orcamentoId,
                vendaId: venda.id,
                numeroVenda: venda.numeroVenda,
                usuarioId: 'system', // TODO: Pegar do contexto
                usuarioNome: 'Sistema',
                valoresAnteriores,
                valoresNovos: {
                    custoTotal,
                    precoVenda
                },
                diferencaCusto: custoTotal - valoresAnteriores.custoTotal,
                diferencaReceita: precoVenda - valoresAnteriores.precoVenda
            });

            return {
                success: true,
                message: 'Orçamento sincronizado com sucesso',
                orcamento: {
                    custoTotal,
                    precoVenda
                },
                venda: {
                    id: venda.id,
                    numeroVenda: venda.numeroVenda,
                    valorTotal: precoVenda
                },
                contasReceber: resultado.contasReceber
            };
        });
    }

    /**
     * Calcula os totais do orçamento (custo, preço de venda e valor a receber — exclui itens venda direta)
     */
    static calcularTotaisOrcamento(orcamento: any): { custoTotal: number; precoVenda: number; valorAReceber: number } {
        let custoTotal = 0;
        let precoVenda = 0;
        let valorVendaDireta = 0;

        for (const item of orcamento.items) {
            custoTotal += item.custoUnit * item.quantidade;
            const sub = Number(item.subtotal) || 0;
            precoVenda += sub;
            if ((item as any).vendaDiretaFornecedor) {
                valorVendaDireta += sub;
            }
        }

        // Aplicar desconto se houver
        if (orcamento.descontoValor && orcamento.descontoValor > 0) {
            precoVenda -= orcamento.descontoValor;
        }

        const valorAReceber = Math.round((Math.max(0, precoVenda - valorVendaDireta)) * 100) / 100;
        return { custoTotal, precoVenda, valorAReceber };
    }

    /**
     * Recalcula as contas a receber proporcionalmente ao novo valor total
     */
    static async recalcularContasReceber(
        tx: any,
        vendaId: string,
        novoValorTotal: number,
        parcelas: number,
        valorEntrada: number
    ) {
        console.log(`💳 Recalculando Contas a Receber...`);

        // Buscar todas as contas a receber desta venda
        const contasReceber = await tx.contaReceber.findMany({
            where: { vendaId },
            orderBy: { numeroParcela: 'asc' }
        });

        if (contasReceber.length === 0) {
            console.log('⚠️ Nenhuma conta a receber encontrada.');
            return { contasReceber: [] };
        }

        // Verificar se alguma conta já foi paga
        const contasPagas = contasReceber.filter((c: any) => c.status === 'Pago');
        
        if (contasPagas.length > 0) {
            console.log(`⚠️ ${contasPagas.length} conta(s) já paga(s). Recalculando apenas pendentes.`);
            
            // Somar o que já foi pago
            const valorJaPago = contasPagas.reduce((sum: number, c: any) => sum + c.valorParcela, 0);
            const valorRestante = novoValorTotal - valorJaPago;
            
            // Recalcular apenas contas pendentes
            const contasPendentes = contasReceber.filter((c: any) => c.status === 'Pendente');
            const valorPorParcelaPendente = valorRestante / contasPendentes.length;
            
            for (const conta of contasPendentes) {
                await tx.contaReceber.update({
                    where: { id: conta.id },
                    data: {
                        valorParcela: valorPorParcelaPendente,
                        updatedAt: new Date()
                    }
                });
            }
            
            return {
                contasReceber: contasPendentes.length,
                valorJaPago,
                valorRestante,
                valorPorParcela: valorPorParcelaPendente
            };
        }

        // Se nenhuma conta foi paga, recalcular tudo
        const valorRestante = novoValorTotal - valorEntrada;
        const valorPorParcela = valorRestante / parcelas;

        // Atualizar entrada (se existir - numeroParcela = 0)
        const contaEntrada = contasReceber.find((c: any) => c.numeroParcela === 0);
        if (contaEntrada) {
            await tx.contaReceber.update({
                where: { id: contaEntrada.id },
                data: {
                    valorParcela: valorEntrada,
                    updatedAt: new Date()
                }
            });
        }

        // Atualizar parcelas normais
        const parcelasNormais = contasReceber.filter((c: any) => c.numeroParcela && c.numeroParcela > 0);
        for (const conta of parcelasNormais) {
            await tx.contaReceber.update({
                where: { id: conta.id },
                data: {
                    valorParcela: valorPorParcela,
                    updatedAt: new Date()
                }
            });
        }

        console.log(`✅ ${parcelasNormais.length} parcela(s) recalculada(s): R$ ${valorPorParcela.toFixed(2)} cada`);

        return {
            contasReceber: contasReceber.length,
            valorPorParcela
        };
    }

    /**
     * Aplica margem/BDI padrão ao adicionar novo item no orçamento
     * Garante que o item não entre com valor de venda zerado
     */
    static async aplicarMargemPadraoNovoItem(itemId: string, bdiPadrao: number = 30) {
        console.log(`💰 Aplicando margem padrão de ${bdiPadrao}% ao item ${itemId}...`);

        const item = await prisma.orcamentoItem.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            throw new Error('Item não encontrado');
        }

        // Se o item já tem preço de venda definido, não alterar
        if (item.precoUnit > 0) {
            console.log('✅ Item já possui preço de venda definido.');
            return item;
        }

        // Calcular preço de venda com margem
        const precoComMargem = item.custoUnit * (1 + bdiPadrao / 100);
        const subtotalNovo = precoComMargem * item.quantidade;

        // Atualizar item
        const itemAtualizado = await prisma.orcamentoItem.update({
            where: { id: itemId },
            data: {
                precoUnit: precoComMargem,
                subtotal: subtotalNovo
            }
        });

        console.log(`✅ Margem aplicada: Custo R$ ${item.custoUnit.toFixed(2)} → Venda R$ ${precoComMargem.toFixed(2)}`);

        return itemAtualizado;
    }

    /**
     * Marca item como "Original" ou "Aditivo" para tracking no DRE
     * Itens adicionados após criação do orçamento são marcados como aditivos
     */
    static async marcarItemComoOriginalOuAditivo(itemId: string, orcamentoId: string) {
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            select: { createdAt: true }
        });

        const item = await prisma.orcamentoItem.findUnique({
            where: { id: itemId },
            select: { id: true }
        });

        if (!orcamento || !item) {
            return null;
        }

        // Verificar se item foi criado depois do orçamento (é um aditivo)
        const itemCreatedAt = await prisma.orcamentoItem.findUnique({
            where: { id: itemId },
            select: { id: true }
        });

        // Por enquanto, retornamos uma flag indicativa
        // Pode ser armazenada em um campo JSON no OrcamentoItem
        return {
            itemId,
            tipo: 'ORIGINAL' // ou 'ADITIVO' baseado na lógica de criação
        };
    }

    /**
     * Sincronização completa: chamada após qualquer alteração no orçamento
     */
    static async sincronizarAposAlteracaoOrcamento(
        orcamentoId: string,
        novoItemId?: string,
        bdiPadrao: number = 30
    ) {
        console.log('🔄 Processo completo de sincronização iniciado...');

        try {
            // 1. Se for novo item, aplicar margem primeiro
            if (novoItemId) {
                await this.aplicarMargemPadraoNovoItem(novoItemId, bdiPadrao);
            }

            // 2. Sincronizar com PV
            const resultado = await this.sincronizarOrcamentoComPV(orcamentoId, novoItemId);

            return resultado;
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            throw error;
        }
    }

    /**
     * Validar se pode modificar orçamento (verificar status do PV)
     */
    static async validarSePodemModificarOrcamento(orcamentoId: string): Promise<{
        podeModificar: boolean;
        motivo?: string;
        vendaInfo?: any;
    }> {
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            include: {
                venda: {
                    include: {
                        contasReceber: true
                    }
                }
            }
        });

        if (!orcamento) {
            return { podeModificar: false, motivo: 'Orçamento não encontrado' };
        }

        if (!orcamento.venda) {
            return { podeModificar: true }; // Sem PV, pode modificar livremente
        }

        // Verificar se PV está pago
        const todasContasPagas = orcamento.venda.contasReceber.every(c => c.status === 'Pago');

        if (todasContasPagas && orcamento.venda.status === 'Concluida') {
            return {
                podeModificar: false,
                motivo: 'Pedido de Venda já está totalmente pago. É necessário estornar os pagamentos primeiro.',
                vendaInfo: {
                    numeroVenda: orcamento.venda.numeroVenda,
                    valorTotal: orcamento.venda.valorTotal,
                    contasPagas: orcamento.venda.contasReceber.length
                }
            };
        }

        return { podeModificar: true };
    }
}
