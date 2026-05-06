import { prisma } from '../lib/prisma';

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
     * Resolve qual material do estoque corresponde a um item COTACAO (banco frio).
     * Mesma heurística de `verificarDisponibilidadeOrcamento` — necessário porque a baixa
     * só pode usar `materialId`, mas a validação aceita cotação sem vínculo explícito (busca por nome).
     */
    static async resolverMaterialIdParaItemCotacao(item: {
        materialId: string | null;
        cotacaoId: string | null;
        cotacao: { nome: string } | null;
    }): Promise<string | null> {
        if (item.materialId) {
            return item.materialId;
        }
        if (!item.cotacaoId || !item.cotacao?.nome) {
            return null;
        }
        const cotacao = item.cotacao;

        let materialEmEstoque = await prisma.material.findFirst({
            where: {
                AND: [
                    { nome: { equals: cotacao.nome, mode: 'insensitive' } },
                    { estoque: { gt: 0 } }
                ]
            }
        });

        if (!materialEmEstoque) {
            materialEmEstoque = await prisma.material.findFirst({
                where: {
                    nome: { contains: cotacao.nome, mode: 'insensitive' },
                    estoque: { gt: 0 }
                }
            });
        }

        if (!materialEmEstoque) {
            const nomeNormalizado = cotacao.nome.trim();
            materialEmEstoque = await prisma.material.findFirst({
                where: {
                    estoque: { gt: 0 },
                    nome: nomeNormalizado
                }
            });
        }

        return materialEmEstoque?.id ?? null;
    }

    /**
     * Processa baixa de estoque de um orçamento (materiais + kits expandidos).
     * Regra: se a baixa já foi feita na Ordem de Serviço (Iniciar obra), não faz baixa no PV.
     */
    static async processarBaixaOrcamento(orcamentoId: string, vendaId: string) {
        // Buscar orçamento com seus itens e flag de baixa
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: orcamentoId },
            include: {
                items: {
                    include: {
                        cotacao: true,
                        material: true
                    }
                }
            }
        });

        if (!orcamento) {
            throw new Error('Orçamento não encontrado');
        }

        // Se a baixa já foi realizada ao "Iniciar obra" (OS), não realizar novamente no Pedido de Venda
        if (orcamento.baixaEstoqueRealizadaEm === 'OBRA') {
            console.log(`[Estoque] Baixa do orçamento ${orcamentoId} já foi realizada na Ordem de Serviço (Iniciar obra). Não realizar baixa no PV.`);
            return {
                success: true,
                skipped: true,
                reason: 'Baixa já realizada na Ordem de Serviço (Iniciar obra).',
                materiaisProcessados: 0,
                totalItens: 0,
                movimentacoes: []
            };
        }

        const materiaisParaBaixa: Array<{
            materialId: string;
            quantidade: number;
            origem: string;
        }> = [];

        // Processar cada item do orçamento (excluir itens "venda direta fornecedor" — não dão baixa em estoque)
        for (const item of orcamento.items) {
            if ((item as any).vendaDiretaFornecedor) {
                continue;
            }
            if (item.tipo === 'MATERIAL' && item.materialId) {
                // Item é material direto
                materiaisParaBaixa.push({
                    materialId: item.materialId,
                    quantidade: item.quantidade,
                    origem: 'Material direto do orçamento'
                });
            } else if (item.tipo === 'COTACAO' && (item.cotacaoId || item.materialId)) {
                const materialId = await this.resolverMaterialIdParaItemCotacao(item);
                if (materialId) {
                    materiaisParaBaixa.push({
                        materialId,
                        quantidade: item.quantidade,
                        origem: item.materialId
                            ? 'Item banco frio vinculado ao estoque'
                            : 'Item banco frio (material resolvido por nome, como na validação de obra)'
                    });
                }
            } else if (item.tipo === 'KIT' && (item as any).itensDoKit) {
                // ✅ Kit com composição materializada no orçamento (kit unificado ou kit catálogo materializado)
                const qtdKit = Number(item.quantidade || 1);
                const itensDoKit = (item as any).itensDoKit;
                const arr = Array.isArray(itensDoKit) ? itensDoKit : [itensDoKit];

                for (const sub of arr) {
                    const tipo = String(sub?.tipo || '').toUpperCase();
                    if (tipo === 'SERVICO') continue;

                    if (tipo === 'KIT' && sub?.kitId) {
                        const componentesKit = await this.expandirKit(String(sub.kitId));
                        const mult = Number(sub?.quantidade || 1) * qtdKit;
                        for (const componente of componentesKit) {
                            materiaisParaBaixa.push({
                                materialId: componente.materialId,
                                quantidade: componente.quantidade * mult,
                                origem: `Kit (composição) (${qtdKit}x)`
                            });
                        }
                        continue;
                    }

                    if (tipo === 'MATERIAL' && sub?.materialId) {
                        materiaisParaBaixa.push({
                            materialId: String(sub.materialId),
                            quantidade: Number(sub?.quantidade || 1) * qtdKit,
                            origem: `Kit (composição) (${qtdKit}x)`
                        });
                        continue;
                    }

                    // Banco frio dentro do kit: só dá baixa se houver vinculação ao estoque
                    if (tipo === 'COTACAO' && (sub?.materialVinculadoId || sub?.materialId)) {
                        materiaisParaBaixa.push({
                            materialId: String(sub.materialVinculadoId || sub.materialId),
                            quantidade: Number(sub?.quantidade || 1) * qtdKit,
                            origem: `Item banco frio (composição) vinculado ao estoque (${qtdKit}x)`
                        });
                        continue;
                    }
                }
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
        // Tipagem explícita para evitar inferência como `never[]` (TS strict)
        const verificacoes: any[] = [];
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
        const movimentacoes: any[] = [];
        
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

        // Marcar orçamento: baixa foi feita no Pedido de Venda (evita nova baixa ao "Iniciar obra")
        await prisma.orcamento.update({
            where: { id: orcamentoId },
            // Cast para evitar quebra em ambientes onde o Prisma Client ainda
            // não está sincronizado com o schema (campo existe no schema).
            data: { baixaEstoqueRealizadaEm: 'VENDA' } as any
        });

        return {
            success: true,
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

        // Tipagem explícita para evitar inferência como `never[]` (TS strict)
        const verificacoes: any[] = [];

        for (const item of orcamento.items) {
            // Pular itens do tipo SERVIÇO, QUADRO_PRONTO e CUSTO_EXTRA - não precisam de estoque
            if (item.tipo === 'SERVICO' || item.tipo === 'QUADRO_PRONTO' || item.tipo === 'CUSTO_EXTRA') {
                continue;
            }
            // Pular itens "venda direta fornecedor" (não usam estoque da empresa)
            if ((item as any).vendaDiretaFornecedor) {
                continue;
            }
            
            // ITENS DO TIPO COTACAO (Banco Frio) - se já vinculado (materialId), usar esse material
            if (item.tipo === 'COTACAO' && item.cotacaoId) {
                if (item.materialId) {
                    // Vinculação salva: usar estoque do material vinculado
                    const material = item.material || await prisma.material.findUnique({
                        where: { id: item.materialId }
                    });
                    if (material) {
                        const suficiente = material.estoque >= item.quantidade;
                        verificacoes.push({
                            tipo: 'COTACAO',
                            cotacaoId: item.cotacaoId,
                            materialId: material.id,
                            nome: (item.cotacao?.nome) || material.nome,
                            nomeMaterialEstoque: material.nome,
                            sku: material.sku,
                            quantidadeNecessaria: item.quantidade,
                            quantidadeDisponivel: material.estoque,
                            suficiente,
                            falta: Math.max(0, item.quantidade - material.estoque),
                            origem: 'Banco Frio (vinculado)',
                            precisaComprar: !suficiente,
                            mensagem: suficiente
                                ? `Item do banco frio vinculado em estoque (${material.nome})`
                                : `Item vinculado mas faltam ${Math.max(0, item.quantidade - material.estoque)} unidades. É necessário realizar a compra.`
                        });
                    } else {
                        verificacoes.push({
                            tipo: 'COTACAO',
                            cotacaoId: item.cotacaoId,
                            nome: 'Material vinculado não encontrado',
                            quantidadeNecessaria: item.quantidade,
                            quantidadeDisponivel: 0,
                            suficiente: false,
                            falta: item.quantidade,
                            origem: 'Banco Frio',
                            precisaComprar: true,
                            mensagem: 'Material vinculado não encontrado no sistema.'
                        });
                    }
                    continue;
                }

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
            // ✅ ITENS DO TIPO KIT COM COMPOSIÇÃO MATERIALIZADA (kit unificado ou catálogo materializado)
            else if (item.tipo === 'KIT' && (item as any).itensDoKit) {
                const qtdKit = Number(item.quantidade || 1);
                const itensDoKit = (item as any).itensDoKit;
                const arr = Array.isArray(itensDoKit) ? itensDoKit : [itensDoKit];

                for (const sub of arr) {
                    const tipoSub = String(sub?.tipo || '').toUpperCase();
                    const qtdSub = Number(sub?.quantidade || 1) * qtdKit;

                    if (tipoSub === 'SERVICO') {
                        continue;
                    }

                    if (tipoSub === 'KIT' && sub?.kitId) {
                        const componentesKit = await this.expandirKit(String(sub.kitId));
                        for (const componente of componentesKit) {
                            const quantidadeTotal = componente.quantidade * qtdSub;
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
                                origemKit: `${qtdKit}x Kit (composição)`,
                                origem: 'Kit',
                                precisaComprar: !suficiente,
                                mensagem: suficiente
                                    ? 'Componente do kit disponível em estoque'
                                    : `Componente do kit: faltam ${Math.max(0, quantidadeTotal - componente.estoqueAtual)} unidades. É necessário realizar a compra.`
                            });
                        }
                        continue;
                    }

                    if (tipoSub === 'MATERIAL' && sub?.materialId) {
                        const material = await prisma.material.findUnique({ where: { id: String(sub.materialId) } });
                        if (material) {
                            const suficiente = material.estoque >= qtdSub;
                            verificacoes.push({
                                tipo: 'MATERIAL',
                                materialId: material.id,
                                nome: material.nome,
                                sku: material.sku,
                                quantidadeNecessaria: qtdSub,
                                quantidadeDisponivel: material.estoque,
                                suficiente,
                                falta: Math.max(0, qtdSub - material.estoque),
                                origem: 'Estoque Real',
                                precisaComprar: !suficiente,
                                mensagem: suficiente
                                    ? 'Item disponível em estoque'
                                    : `Faltam ${Math.max(0, qtdSub - material.estoque)} unidades em estoque. É necessário realizar a compra.`
                            });
                        } else {
                            verificacoes.push({
                                tipo: 'MATERIAL',
                                materialId: String(sub.materialId),
                                nome: sub?.nome || 'Material não encontrado',
                                quantidadeNecessaria: qtdSub,
                                quantidadeDisponivel: 0,
                                suficiente: false,
                                falta: qtdSub,
                                origem: 'Estoque Real',
                                precisaComprar: true,
                                mensagem: 'Material não encontrado no sistema. É necessário cadastrar e realizar a compra.'
                            });
                        }
                        continue;
                    }

                    if (tipoSub === 'COTACAO' && sub?.cotacaoId) {
                        const materialVinculadoId = sub?.materialVinculadoId || sub?.materialId || null;
                        if (materialVinculadoId) {
                            const material = await prisma.material.findUnique({ where: { id: String(materialVinculadoId) } });
                            if (material) {
                                const suficiente = material.estoque >= qtdSub;
                                verificacoes.push({
                                    tipo: 'COTACAO',
                                    cotacaoId: String(sub.cotacaoId),
                                    materialId: material.id,
                                    nome: sub?.nome || material.nome,
                                    nomeMaterialEstoque: material.nome,
                                    sku: material.sku,
                                    quantidadeNecessaria: qtdSub,
                                    quantidadeDisponivel: material.estoque,
                                    suficiente,
                                    falta: Math.max(0, qtdSub - material.estoque),
                                    origem: 'Banco Frio (vinculado)',
                                    precisaComprar: !suficiente,
                                    mensagem: suficiente
                                        ? `Item do banco frio vinculado em estoque (${material.nome})`
                                        : `Item vinculado mas faltam ${Math.max(0, qtdSub - material.estoque)} unidades. É necessário realizar a compra.`
                                });
                            } else {
                                verificacoes.push({
                                    tipo: 'COTACAO',
                                    cotacaoId: String(sub.cotacaoId),
                                    nome: sub?.nome || 'Material vinculado não encontrado',
                                    quantidadeNecessaria: qtdSub,
                                    quantidadeDisponivel: 0,
                                    suficiente: false,
                                    falta: qtdSub,
                                    origem: 'Banco Frio (vinculado)',
                                    precisaComprar: true,
                                    mensagem: 'Material vinculado não encontrado no sistema.'
                                });
                            }
                        } else {
                            // Banco frio sem vinculação dentro do kit
                            verificacoes.push({
                                tipo: 'COTACAO',
                                cotacaoId: String(sub.cotacaoId),
                                nome: sub?.nome || 'Item do banco frio',
                                quantidadeNecessaria: qtdSub,
                                quantidadeDisponivel: 0,
                                suficiente: false,
                                falta: qtdSub,
                                origem: 'Banco Frio',
                                precisaComprar: true,
                                mensagem: 'Item do banco frio (dentro do kit) não está vinculado ao estoque. É necessário vincular ou comprar antes de criar a obra.'
                            });
                        }
                        continue;
                    }
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

