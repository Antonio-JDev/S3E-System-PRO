import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FracionamentoEstoqueService {
    /**
     * Processa atualizações de fracionamento de compras que ainda não foram aplicadas ao estoque
     * Atualiza o estoque dos materiais baseado no fracionamento configurado nas compras
     * Cada compra é processada apenas uma vez
     */
    static async processarAtualizacoesFracionamento() {
        console.log('🔄 Processando atualizações de fracionamento...');

        // Buscar todas as compras recebidas que têm itens com fracionamento não aplicado
        const comprasComFracionamento = await prisma.compra.findMany({
            where: {
                status: 'Recebido',
                items: {
                    some: {
                        quantidadeFracionada: { not: null },
                        fracionamentoAplicado: false
                    }
                }
            },
            include: {
                items: {
                    where: {
                        quantidadeFracionada: { not: null },
                        fracionamentoAplicado: false
                    },
                    include: {
                        material: true
                    }
                }
            }
        });

        if (comprasComFracionamento.length === 0) {
            console.log('✅ Nenhuma compra com fracionamento pendente encontrada');
            return {
                success: true,
                message: 'Nenhuma atualização pendente',
                comprasProcessadas: 0,
                itensAtualizados: 0
            };
        }

        console.log(`📦 Encontradas ${comprasComFracionamento.length} compra(s) com fracionamento pendente`);

        let totalItensAtualizados = 0;
        const resultados: Array<{
            compraId: string;
            numeroNF: string;
            itensAtualizados: number;
            erros: string[];
        }> = [];

        // Processar cada compra
        for (const compra of comprasComFracionamento) {
            const erros: string[] = [];
            let itensProcessados = 0;

            try {
                await prisma.$transaction(async (tx) => {
                    for (const item of compra.items) {
                        if (!item.materialId || !item.quantidadeFracionada) {
                            continue;
                        }

                        try {
                            // Calcular quantidade total de unidades
                            const quantidadeTotalUnidades = item.quantidade * item.quantidadeFracionada;
                            
                            // Buscar material atual
                            const material = await tx.material.findUnique({
                                where: { id: item.materialId },
                                select: { estoque: true, nome: true }
                            });

                            if (!material) {
                                erros.push(`Material não encontrado para item: ${item.nomeProduto}`);
                                continue;
                            }

                            // Buscar movimentações anteriores desta compra para este material
                            const movimentacoesAnteriores = await tx.movimentacaoEstoque.findMany({
                                where: {
                                    materialId: item.materialId,
                                    referencia: compra.id,
                                    motivo: 'COMPRA'
                                }
                            });

                            // Calcular quantidade já incrementada no estoque por esta compra
                            let quantidadeJaIncrementada = 0;
                            if (movimentacoesAnteriores.length > 0) {
                                // Somar todas as movimentações desta compra
                                quantidadeJaIncrementada = movimentacoesAnteriores.reduce(
                                    (sum, mov) => sum + mov.quantidade, 
                                    0
                                );
                            }

                            // Se não há movimentação, o estoque ainda não foi atualizado
                            // Nesse caso, vamos incrementar com a quantidade total de unidades
                            // Se já há movimentação, pode ter sido feita com embalagens (quantidade antiga)
                            // ou com unidades (se já foi processado antes)
                            
                            // Calcular diferença necessária
                            // quantidadeTotalUnidades = quantidade de embalagens × unidades por embalagem
                            // Se já foi incrementado com embalagens (item.quantidade), precisamos ajustar
                            // Se já foi incrementado com unidades, a diferença será zero ou negativa
                            
                            // Verificar se a movimentação foi feita com embalagens ou unidades
                            // Se quantidadeJaIncrementada == item.quantidade, foi feita com embalagens
                            // Se quantidadeJaIncrementada == quantidadeTotalUnidades, já foi feita com unidades
                            
                            // Lógica de cálculo da diferença:
                            // 1. Se não há movimentação, o estoque foi incrementado com embalagens (item.quantidade)
                            //    Precisamos ajustar: remover embalagens e adicionar unidades
                            // 2. Se há movimentação igual a item.quantidade, foi incrementado com embalagens
                            //    Precisamos ajustar: remover embalagens e adicionar unidades
                            // 3. Se há movimentação igual a quantidadeTotalUnidades, já foi processado corretamente
                            
                            let diferenca = 0;
                            const tolerancia = 0.01; // Tolerância para comparação de floats
                            
                            if (quantidadeJaIncrementada === 0) {
                                // Nenhuma movimentação registrada - pode ter sido incrementado diretamente
                                // Vamos assumir que foi incrementado com embalagens e ajustar
                                // Primeiro, verificar se o estoque atual corresponde à quantidade de embalagens
                                const estoqueEsperadoComEmbalagens = item.quantidade;
                                
                                // Se o estoque atual é próximo da quantidade de embalagens, foi incrementado com embalagens
                                if (Math.abs(material.estoque - estoqueEsperadoComEmbalagens) < tolerancia) {
                                    // Foi incrementado com embalagens - ajustar para unidades
                                    // Remover embalagens e adicionar unidades
                                    diferenca = quantidadeTotalUnidades - estoqueEsperadoComEmbalagens;
                                } else {
                                    // Estoque já está diferente - incrementar apenas a diferença necessária
                                    diferenca = quantidadeTotalUnidades - material.estoque;
                                    if (diferenca < 0) diferenca = 0; // Não pode ser negativo
                                }
                            } else if (Math.abs(quantidadeJaIncrementada - item.quantidade) < tolerancia) {
                                // Foi incrementado com embalagens (quantidadeJaIncrementada == item.quantidade)
                                // Ajustar: remover embalagens e adicionar unidades
                                diferenca = quantidadeTotalUnidades - quantidadeJaIncrementada;
                            } else if (Math.abs(quantidadeJaIncrementada - quantidadeTotalUnidades) < tolerancia) {
                                // Já foi incrementado com unidades corretamente
                                diferenca = 0;
                            } else {
                                // Caso especial: calcular diferença baseado no que deveria estar
                                // O estoque pode ter sido ajustado parcialmente ou de forma incorreta
                                diferenca = quantidadeTotalUnidades - quantidadeJaIncrementada;
                            }

                            if (diferenca > tolerancia) {
                                // Se foi incrementado com embalagens, precisamos remover as embalagens primeiro
                                // e depois adicionar as unidades
                                if (Math.abs(quantidadeJaIncrementada - item.quantidade) < tolerancia || quantidadeJaIncrementada === 0) {
                                    // Foi incrementado com embalagens - fazer ajuste completo
                                    // 1. Remover embalagens (decrementar)
                                    await tx.material.update({
                                        where: { id: item.materialId },
                                        data: {
                                            estoque: {
                                                decrement: item.quantidade
                                            }
                                        }
                                    });
                                    
                                    // 2. Adicionar unidades (incrementar)
                                    await tx.material.update({
                                        where: { id: item.materialId },
                                        data: {
                                            estoque: {
                                                increment: quantidadeTotalUnidades
                                            }
                                        }
                                    });
                                    
                                    // Registrar movimentação de ajuste (diferença líquida)
                                    await tx.movimentacaoEstoque.create({
                                        data: {
                                            materialId: item.materialId,
                                            tipo: 'ENTRADA',
                                            quantidade: diferenca,
                                            motivo: 'AJUSTE_FRACIONAMENTO',
                                            referencia: compra.id,
                                            observacoes: `Ajuste de fracionamento: ${item.quantidade} ${item.tipoEmbalagem || 'embalagens'} × ${item.quantidadeFracionada} un = ${quantidadeTotalUnidades} unidades (NF: ${compra.numeroNF})`
                                        }
                                    });
                                } else {
                                    // Incrementar apenas a diferença (caso parcial)
                                    await tx.material.update({
                                        where: { id: item.materialId },
                                        data: {
                                            estoque: {
                                                increment: diferenca
                                            }
                                        }
                                    });

                                    // Registrar movimentação de ajuste
                                    await tx.movimentacaoEstoque.create({
                                        data: {
                                            materialId: item.materialId,
                                            tipo: 'ENTRADA',
                                            quantidade: diferenca,
                                            motivo: 'AJUSTE_FRACIONAMENTO',
                                            referencia: compra.id,
                                            observacoes: `Ajuste de fracionamento: ${item.quantidade} ${item.tipoEmbalagem || 'embalagens'} × ${item.quantidadeFracionada} un = ${quantidadeTotalUnidades} unidades (NF: ${compra.numeroNF})`
                                        }
                                    });
                                }

                                // Marcar item como processado
                                await tx.compraItem.update({
                                    where: { id: item.id },
                                    data: {
                                        fracionamentoAplicado: true
                                    }
                                });

                                itensProcessados++;
                                console.log(`✅ Item ${item.nomeProduto}: +${diferenca.toFixed(2)} unidades (${item.quantidade} ${item.tipoEmbalagem || 'embalagens'} = ${quantidadeTotalUnidades} unidades)`);
                            } else if (diferenca < -tolerancia) {
                                // Se o estoque está maior que o esperado, pode ser que já foi ajustado
                                // ou há um problema. Vamos apenas marcar como processado.
                                await tx.compraItem.update({
                                    where: { id: item.id },
                                    data: {
                                        fracionamentoAplicado: true
                                    }
                                });
                                itensProcessados++;
                                console.log(`ℹ️ Item ${item.nomeProduto}: já ajustado ou estoque maior que esperado (diferença: ${diferenca.toFixed(2)})`);
                            } else {
                                // Já está correto, apenas marcar como processado
                                await tx.compraItem.update({
                                    where: { id: item.id },
                                    data: {
                                        fracionamentoAplicado: true
                                    }
                                });
                                itensProcessados++;
                                console.log(`✅ Item ${item.nomeProduto}: já está correto`);
                            }
                        } catch (error: any) {
                            console.error(`❌ Erro ao processar item ${item.nomeProduto}:`, error);
                            erros.push(`${item.nomeProduto}: ${error.message}`);
                        }
                    }
                });

                totalItensAtualizados += itensProcessados;
                resultados.push({
                    compraId: compra.id,
                    numeroNF: compra.numeroNF,
                    itensAtualizados: itensProcessados,
                    erros
                });

                console.log(`✅ Compra ${compra.numeroNF}: ${itensProcessados} item(ns) processado(s)`);
            } catch (error: any) {
                console.error(`❌ Erro ao processar compra ${compra.numeroNF}:`, error);
                resultados.push({
                    compraId: compra.id,
                    numeroNF: compra.numeroNF,
                    itensAtualizados: 0,
                    erros: [`Erro geral: ${error.message}`]
                });
            }
        }

        return {
            success: true,
            message: `Processadas ${comprasComFracionamento.length} compra(s), ${totalItensAtualizados} item(ns) atualizado(s)`,
            comprasProcessadas: comprasComFracionamento.length,
            itensAtualizados: totalItensAtualizados,
            detalhes: resultados
        };
    }

    /**
     * Busca compras com fracionamento pendente para exibição
     */
    static async buscarComprasComFracionamentoPendente() {
        const compras = await prisma.compra.findMany({
            where: {
                status: 'Recebido',
                items: {
                    some: {
                        quantidadeFracionada: { not: null },
                        fracionamentoAplicado: false
                    }
                }
            },
            include: {
                items: {
                    where: {
                        quantidadeFracionada: { not: null },
                        fracionamentoAplicado: false
                    },
                    include: {
                        material: {
                            select: {
                                id: true,
                                nome: true,
                                estoque: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                dataCompra: 'desc'
            }
        });

        return compras.map(compra => ({
            id: compra.id,
            numeroNF: compra.numeroNF,
            numeroSequencial: compra.numeroSequencial,
            fornecedorNome: compra.fornecedorNome,
            dataCompra: compra.dataCompra,
            itensPendentes: compra.items.map(item => ({
                id: item.id,
                nomeProduto: item.nomeProduto,
                quantidade: item.quantidade,
                quantidadeFracionada: item.quantidadeFracionada,
                tipoEmbalagem: item.tipoEmbalagem,
                unidadeEmbalagem: item.unidadeEmbalagem,
                quantidadeTotalUnidades: item.quantidade * (item.quantidadeFracionada || 1),
                material: item.material ? {
                    id: item.material.id,
                    nome: item.material.nome,
                    estoqueAtual: item.material.estoque
                } : null
            }))
        }));
    }
}
