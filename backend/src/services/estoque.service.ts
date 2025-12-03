import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EstoqueService {
    /**
     * Incrementa o estoque de um material (entrada)
     */
    static async incrementarEstoque(
        materialId: string,
        quantidade: number,
        motivo: string,
        referencia: string,
        observacoes?: string
    ) {
        // Buscar material
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            throw new Error(`Material ${materialId} não encontrado`);
        }

        if (quantidade <= 0) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        // Usar transação para garantir consistência
        return await prisma.$transaction([
            // 1. Aumentar estoque
            prisma.material.update({
                where: { id: materialId },
                data: {
                    estoque: {
                        increment: quantidade
                    }
                }
            }),
            // 2. Registrar movimentação
            prisma.movimentacaoEstoque.create({
                data: {
                    materialId,
                    tipo: 'ENTRADA',
                    quantidade,
                    motivo,
                    referencia,
                    observacoes
                }
            })
        ]);
    }

    /**
     * Dá baixa no estoque de um material
     */
    static async darBaixaMaterial(
        materialId: string,
        quantidade: number,
        motivo: string,
        referencia: string,
        observacoes?: string
    ) {
        // Buscar material
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            throw new Error(`Material ${materialId} não encontrado`);
        }

        // Verificar se há estoque suficiente
        if (material.estoque < quantidade) {
            throw new Error(
                `Estoque insuficiente para ${material.nome}. ` +
                `Disponível: ${material.estoque}, Necessário: ${quantidade}`
            );
        }

        // Usar transação para garantir consistência
        return await prisma.$transaction([
            // 1. Reduzir estoque
            prisma.material.update({
                where: { id: materialId },
                data: {
                    estoque: {
                        decrement: quantidade
                    }
                }
            }),
            // 2. Registrar movimentação
            prisma.movimentacaoEstoque.create({
                data: {
                    materialId,
                    tipo: 'SAIDA',
                    quantidade,
                    motivo,
                    referencia,
                    observacoes
                }
            })
        ]);
    }

    /**
     * Expande um kit e retorna lista de materiais componentes
     */
    static async expandirKit(kitId: string) {
        const kit = await prisma.kit.findUnique({
            where: { id: kitId },
            include: {
                items: {
                    include: {
                        material: true
                    }
                }
            }
        });

        if (!kit) {
            throw new Error(`Kit ${kitId} não encontrado`);
        }

        return kit.items.map(item => ({
            materialId: item.materialId,
            materialNome: item.material.nome,
            materialSku: item.material.sku,
            quantidade: item.quantidade,
            estoqueAtual: item.material.estoque
        }));
    }

    /**
     * Processa baixa de estoque de um orçamento (materiais + kits expandidos)
     */
    static async processarBaixaOrcamento(orcamentoId: string, vendaId: string) {
        // Buscar orçamento com seus itens
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            include: {
                items: true
            }
        });

        if (!orcamento) {
            throw new Error('Orçamento não encontrado');
        }

        const materiaisParaBaixa: Array<{
            materialId: string;
            quantidade: number;
            origem: string;
        }> = [];

        // Processar cada item do orçamento
        for (const item of orcamento.items) {
            if (item.tipo === 'MATERIAL' && item.materialId) {
                // Item é material direto
                materiaisParaBaixa.push({
                    materialId: item.materialId,
                    quantidade: item.quantidade,
                    origem: 'Material direto do orçamento'
                });
            } else if (item.tipo === 'KIT' && item.kitId) {
                // Item é kit - precisa expandir
                const componentesKit = await this.expandirKit(item.kitId);
                
                // Adicionar cada componente do kit multiplicado pela quantidade
                for (const componente of componentesKit) {
                    const quantidadeTotal = componente.quantidade * item.quantidade;
                    
                    materiaisParaBaixa.push({
                        materialId: componente.materialId,
                        quantidade: quantidadeTotal,
                        origem: `Kit (${item.quantidade}x)`
                    });
                }
            }
            // SERVICO não afeta estoque
        }

        // Agrupar materiais repetidos (somar quantidades)
        const materiaisAgrupados = new Map<string, number>();
        
        materiaisParaBaixa.forEach(item => {
            const quantidadeAtual = materiaisAgrupados.get(item.materialId) || 0;
            materiaisAgrupados.set(item.materialId, quantidadeAtual + item.quantidade);
        });

        // Verificar estoque de todos antes de dar baixa
        const verificacoes = [];
        for (const [materialId, quantidade] of materiaisAgrupados.entries()) {
            const material = await prisma.material.findUnique({
                where: { id: materialId }
            });

            if (!material) {
                throw new Error(`Material ${materialId} não encontrado`);
            }

            if (material.estoque < quantidade) {
                verificacoes.push({
                    material: material.nome,
                    disponivel: material.estoque,
                    necessario: quantidade,
                    falta: quantidade - material.estoque
                });
            }
        }

        // Se houver falta de estoque, retornar erro detalhado
        if (verificacoes.length > 0) {
            const mensagem = verificacoes.map(v => 
                `${v.material}: faltam ${v.falta} unidades (disponível: ${v.disponivel}, necessário: ${v.necessario})`
            ).join('\n');
            
            throw new Error(`Estoque insuficiente:\n${mensagem}`);
        }

        // Dar baixa em todos os materiais
        const movimentacoes = [];
        
        for (const [materialId, quantidade] of materiaisAgrupados.entries()) {
            const resultado = await this.darBaixaMaterial(
                materialId,
                quantidade,
                'VENDA',
                vendaId,
                `Baixa automática - Venda baseada em orçamento ${orcamentoId}`
            );
            
            movimentacoes.push(resultado);
        }

        return {
            materiaisProcessados: materiaisAgrupados.size,
            totalItens: Array.from(materiaisAgrupados.values()).reduce((sum, q) => sum + q, 0),
            movimentacoes
        };
    }

    /**
     * Verifica disponibilidade de estoque para um orçamento
     */
    static async verificarDisponibilidadeOrcamento(orcamentoId: string) {
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            include: {
                items: {
                    include: {
                        material: true,
                        cotacao: true,
                        kit: true
                    }
                }
            }
        });

        if (!orcamento) {
            throw new Error('Orçamento não encontrado');
        }

        const verificacoes = [];

        for (const item of orcamento.items) {
            // ITENS DO TIPO COTACAO (Banco Frio)
            if (item.tipo === 'COTACAO' && item.cotacaoId) {
                const cotacao = item.cotacao;
                if (!cotacao) {
                    verificacoes.push({
                        tipo: 'COTACAO',
                        cotacaoId: item.cotacaoId,
                        nome: 'Cotação não encontrada',
                        quantidadeNecessaria: item.quantidade,
                        quantidadeDisponivel: 0,
                        suficiente: false,
                        falta: item.quantidade,
                        origem: 'Banco Frio',
                        precisaComprar: true,
                        mensagem: 'Item do banco frio não possui material correspondente em estoque. É necessário realizar a compra.'
                    });
                    continue;
                }

                // Buscar material correspondente em estoque por nome similar ou NCM
                // Primeiro tentar por nome exato (case-insensitive)
                let materialEmEstoque = await prisma.material.findFirst({
                    where: {
                        AND: [
                            { nome: { equals: cotacao.nome, mode: 'insensitive' } },
                            { estoque: { gt: 0 } }
                        ]
                    }
                });

                // Se não encontrou, tentar por nome similar (Cotacao não possui campo sku)
                if (!materialEmEstoque) {
                    materialEmEstoque = await prisma.material.findFirst({
                        where: {
                            nome: { contains: cotacao.nome, mode: 'insensitive' },
                            estoque: { gt: 0 }
                        }
                    });
                }

                // ✅ CORREÇÃO: Buscar material com nome EXATO (não apenas similar)
                // Isso evita agrupar materiais diferentes com nomes parecidos
                if (!materialEmEstoque) {
                    const nomeNormalizado = cotacao.nome.trim();
                    materialEmEstoque = await prisma.material.findFirst({
                        where: {
                            estoque: { gt: 0 },
                            nome: nomeNormalizado // Nome completo e exato
                        }
                    });
                }

                if (!materialEmEstoque) {
                    // Não existe material em estoque correspondente à cotação
                    verificacoes.push({
                        tipo: 'COTACAO',
                        cotacaoId: item.cotacaoId,
                        nome: cotacao.nome,
                        quantidadeNecessaria: item.quantidade,
                        quantidadeDisponivel: 0,
                        suficiente: false,
                        falta: item.quantidade,
                        origem: 'Banco Frio',
                        precisaComprar: true,
                        mensagem: `Item "${cotacao.nome}" do banco frio não possui material correspondente em estoque. É necessário realizar a compra antes de criar a obra.`
                    });
                } else {
                    // Existe material, verificar se tem estoque suficiente
                    const suficiente = materialEmEstoque.estoque >= item.quantidade;
                    verificacoes.push({
                        tipo: 'COTACAO',
                        cotacaoId: item.cotacaoId,
                        materialId: materialEmEstoque.id,
                        nome: cotacao.nome,
                        nomeMaterialEstoque: materialEmEstoque.nome,
                        sku: materialEmEstoque.sku,
                        quantidadeNecessaria: item.quantidade,
                        quantidadeDisponivel: materialEmEstoque.estoque,
                        suficiente,
                        falta: Math.max(0, item.quantidade - materialEmEstoque.estoque),
                        origem: 'Banco Frio',
                        precisaComprar: !suficiente,
                        mensagem: suficiente 
                            ? `Item do banco frio tem material correspondente em estoque (${materialEmEstoque.nome})`
                            : `Item "${cotacao.nome}" do banco frio tem material correspondente mas falta ${Math.max(0, item.quantidade - materialEmEstoque.estoque)} unidades em estoque. É necessário realizar a compra.`
                    });
                }
            }
            // ITENS DO TIPO MATERIAL (Estoque Real)
            else if (item.tipo === 'MATERIAL' && item.materialId) {
                const material = item.material || await prisma.material.findUnique({
                    where: { id: item.materialId }
                });

                if (material) {
                    verificacoes.push({
                        tipo: 'MATERIAL',
                        materialId: material.id,
                        nome: material.nome,
                        sku: material.sku,
                        quantidadeNecessaria: item.quantidade,
                        quantidadeDisponivel: material.estoque,
                        suficiente: material.estoque >= item.quantidade,
                        falta: Math.max(0, item.quantidade - material.estoque),
                        origem: 'Estoque Real',
                        precisaComprar: material.estoque < item.quantidade,
                        mensagem: material.estoque >= item.quantidade
                            ? 'Item disponível em estoque'
                            : `Faltam ${Math.max(0, item.quantidade - material.estoque)} unidades em estoque. É necessário realizar a compra.`
                    });
                } else {
                    verificacoes.push({
                        tipo: 'MATERIAL',
                        materialId: item.materialId,
                        nome: 'Material não encontrado',
                        quantidadeNecessaria: item.quantidade,
                        quantidadeDisponivel: 0,
                        suficiente: false,
                        falta: item.quantidade,
                        origem: 'Estoque Real',
                        precisaComprar: true,
                        mensagem: 'Material não encontrado no sistema. É necessário cadastrar e realizar a compra.'
                    });
                }
            } 
            // ITENS DO TIPO KIT
            else if (item.tipo === 'KIT' && item.kitId) {
                const componentesKit = await this.expandirKit(item.kitId);
                
                for (const componente of componentesKit) {
                    const quantidadeTotal = componente.quantidade * item.quantidade;
                    const suficiente = componente.estoqueAtual >= quantidadeTotal;
                    
                    verificacoes.push({
                        tipo: 'KIT_COMPONENTE',
                        materialId: componente.materialId,
                        nome: componente.materialNome,
                        sku: componente.materialSku,
                        quantidadeNecessaria: quantidadeTotal,
                        quantidadeDisponivel: componente.estoqueAtual,
                        suficiente,
                        falta: Math.max(0, quantidadeTotal - componente.estoqueAtual),
                        origemKit: `${item.quantidade}x Kit`,
                        origem: 'Kit',
                        precisaComprar: !suficiente,
                        mensagem: suficiente
                            ? 'Componente do kit disponível em estoque'
                            : `Componente do kit: faltam ${Math.max(0, quantidadeTotal - componente.estoqueAtual)} unidades. É necessário realizar a compra.`
                    });
                }
            }
            // ITENS DO TIPO SERVICO, QUADRO_PRONTO, CUSTO_EXTRA não precisam de estoque
        }

        const temEstoqueSuficiente = verificacoes.every(v => v.suficiente);
        const itensSemEstoque = verificacoes.filter(v => !v.suficiente);
        const itensPrecisamComprar = verificacoes.filter(v => v.precisaComprar);

        return {
            disponivel: temEstoqueSuficiente,
            verificacoes,
            itensSemEstoque,
            itensPrecisamComprar,
            resumo: {
                totalItens: verificacoes.length,
                itensDisponiveis: verificacoes.filter(v => v.suficiente).length,
                itensSemEstoque: itensSemEstoque.length,
                itensPrecisamComprar: itensPrecisamComprar.length
            }
        };
    }

    /**
     * Verifica disponibilidade de estoque para um projeto (através do orçamento)
     */
    static async verificarDisponibilidadeProjeto(projetoId: string) {
        const projeto = await prisma.projeto.findUnique({
            where: { id: projetoId },
            include: {
                orcamento: {
                    include: {
                        items: {
                            include: {
                                material: true,
                                cotacao: true,
                                kit: true
                            }
                        }
                    }
                }
            }
        });

        if (!projeto) {
            throw new Error('Projeto não encontrado');
        }

        if (!projeto.orcamentoId) {
            throw new Error('Projeto não possui orçamento vinculado');
        }

        // Usar o método existente de verificação de orçamento
        return await this.verificarDisponibilidadeOrcamento(projeto.orcamentoId);
    }
}

