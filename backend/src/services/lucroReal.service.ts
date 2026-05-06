import { prisma } from '../lib/prisma';

/**
 * Serviço para calcular Lucro Real produto por produto
 * Compara valor de venda com custo real do último XML
 */
export class LucroRealService {
    /**
     * Desmembra um kit do catálogo em seus componentes (materiais)
     * @param kitId ID do kit cadastrado
     * @param quantidadeKit Quantidade do kit vendido
     * @param custoTotalKit Custo total do kit (para distribuição proporcional)
     * @param precoTotalKit Preço total do kit (para distribuição proporcional)
     * @returns Array de itens desmembrados
     */
    private static async desmembrarKitCatalogo(
        kitId: string,
        quantidadeKit: number,
        custoTotalKit: number,
        precoTotalKit: number
    ): Promise<Array<{
        materialId: string;
        materialNome: string;
        materialSku: string | null;
        quantidade: number;
        unidadeMedida: string;
        custoUnit: number;
        precoUnit: number;
        subtotal: number;
        custoTotal: number;
    }>> {
        const kit = await prisma.kit.findUnique({
            where: { id: kitId },
            include: {
                items: {
                    include: {
                        material: {
                            select: {
                                id: true,
                                nome: true,
                                sku: true,
                                unidadeMedida: true,
                                preco: true,
                                valorVenda: true
                            }
                        }
                    }
                }
            }
        });

        if (!kit || !kit.items || kit.items.length === 0) {
            console.warn(`⚠️ Kit ${kitId} não encontrado ou sem itens`);
            return [];
        }

        // Calcular custo e preço total do kit baseado nos materiais
        let custoBaseKit = 0;
        let precoBaseKit = 0;

        kit.items.forEach(kitItem => {
            if (kitItem.material) {
                custoBaseKit += (kitItem.material.preco || 0) * kitItem.quantidade;
                precoBaseKit += (kitItem.material.valorVenda || kitItem.material.preco || 0) * kitItem.quantidade;
            }
        });

        // Se o kit tem itensFaltantes (banco frio), incluir no cálculo
        if (kit.itensFaltantes) {
            let itensFaltantesArray: any[] = [];
            if (typeof kit.itensFaltantes === 'string') {
                try {
                    itensFaltantesArray = JSON.parse(kit.itensFaltantes);
                } catch (e) {
                    console.warn('Erro ao parsear itensFaltantes:', e);
                }
            } else if (Array.isArray(kit.itensFaltantes)) {
                itensFaltantesArray = kit.itensFaltantes;
            }

            itensFaltantesArray.forEach((itemFrio: any) => {
                if (itemFrio.valorVenda) {
                    precoBaseKit += (itemFrio.valorVenda || 0) * (itemFrio.quantidade || 0);
                }
            });
        }

        // Fator de proporção para distribuir custo/preço do kit vendido
        const fatorCusto = custoBaseKit > 0 ? custoTotalKit / custoBaseKit : 1;
        const fatorPreco = precoBaseKit > 0 ? precoTotalKit / precoBaseKit : 1;

        // Desmembrar cada item do kit
        const itensDesmembrados: Array<{
            materialId: string;
            materialNome: string;
            materialSku: string | null;
            quantidade: number;
            unidadeMedida: string;
            custoUnit: number;
            precoUnit: number;
            subtotal: number;
            custoTotal: number;
        }> = [];

        kit.items.forEach(kitItem => {
            if (!kitItem.material) return;

            const quantidadeItem = kitItem.quantidade * quantidadeKit;
            const custoUnitItem = (kitItem.material.preco || 0) * fatorCusto;
            const precoUnitItem = (kitItem.material.valorVenda || kitItem.material.preco || 0) * fatorPreco;
            const custoTotalItem = custoUnitItem * quantidadeItem;
            const subtotalItem = precoUnitItem * quantidadeItem;

            itensDesmembrados.push({
                materialId: kitItem.material.id,
                materialNome: kitItem.material.nome,
                materialSku: kitItem.material.sku,
                quantidade: quantidadeItem,
                unidadeMedida: kitItem.material.unidadeMedida || 'un',
                custoUnit: custoUnitItem,
                precoUnit: precoUnitItem,
                subtotal: subtotalItem,
                custoTotal: custoTotalItem
            });
        });

        // Processar itens faltantes (banco frio) se houver
        if (kit.itensFaltantes) {
            let itensFaltantesArray: any[] = [];
            if (typeof kit.itensFaltantes === 'string') {
                try {
                    itensFaltantesArray = JSON.parse(kit.itensFaltantes);
                } catch (e) {
                    console.warn('Erro ao parsear itensFaltantes:', e);
                }
            } else if (Array.isArray(kit.itensFaltantes)) {
                itensFaltantesArray = kit.itensFaltantes;
            }

            itensFaltantesArray.forEach((itemFrio: any) => {
                if (itemFrio.materialId) {
                    // Buscar material se existir
                    // Se não existir, criar item virtual baseado no itemFrio
                    const quantidadeItem = (itemFrio.quantidade || 0) * quantidadeKit;
                    const precoUnitItem = (itemFrio.valorVenda || 0) * fatorPreco;
                    const custoUnitItem = (itemFrio.custo || 0) * fatorCusto;
                    const subtotalItem = precoUnitItem * quantidadeItem;
                    const custoTotalItem = custoUnitItem * quantidadeItem;

                    itensDesmembrados.push({
                        materialId: itemFrio.materialId,
                        materialNome: itemFrio.nome || 'Item do Banco Frio',
                        materialSku: itemFrio.codigo || null,
                        quantidade: quantidadeItem,
                        unidadeMedida: itemFrio.unidadeMedida || 'un',
                        custoUnit: custoUnitItem,
                        precoUnit: precoUnitItem,
                        subtotal: subtotalItem,
                        custoTotal: custoTotalItem
                    });
                }
            });
        }

        return itensDesmembrados;
    }

    /**
     * Desmembra um kit unificado (criado no PV) em seus componentes
     * @param itensDoKit JSON com os itens do kit customizado
     * @param quantidadeKit Quantidade do kit vendido
     * @param custoTotalKit Custo total do kit
     * @param precoTotalKit Preço total do kit
     * @returns Array de itens desmembrados
     */
    private static async desmembrarKitUnificado(
        itensDoKit: any,
        quantidadeKit: number,
        custoTotalKit: number,
        precoTotalKit: number
    ): Promise<Array<{
        materialId: string | null;
        materialNome: string;
        materialSku: string | null;
        quantidade: number;
        unidadeMedida: string;
        custoUnit: number;
        precoUnit: number;
        subtotal: number;
        custoTotal: number;
    }>> {
        let itensArray: any[] = [];

        // Parse do JSON
        if (typeof itensDoKit === 'string') {
            try {
                itensArray = JSON.parse(itensDoKit);
            } catch (e) {
                console.warn('Erro ao parsear itensDoKit:', e);
                return [];
            }
        } else if (Array.isArray(itensDoKit)) {
            itensArray = itensDoKit;
        } else {
            console.warn('itensDoKit não é um array válido');
            return [];
        }

        if (itensArray.length === 0) {
            return [];
        }

        // Calcular custo e preço base do kit
        let custoBaseKit = 0;
        let precoBaseKit = 0;

        itensArray.forEach((item: any) => {
            const qtd = item.quantidade || 0;
            custoBaseKit += (item.custo || item.valorVenda || 0) * qtd;
            precoBaseKit += (item.valorVenda || item.custo || 0) * qtd;
        });

        // Fator de proporção
        const fatorCusto = custoBaseKit > 0 ? custoTotalKit / custoBaseKit : 1;
        const fatorPreco = precoBaseKit > 0 ? precoTotalKit / precoBaseKit : 1;

        // Desmembrar itens
        const itensDesmembrados: Array<{
            materialId: string | null;
            materialNome: string;
            materialSku: string | null;
            quantidade: number;
            unidadeMedida: string;
            custoUnit: number;
            precoUnit: number;
            subtotal: number;
            custoTotal: number;
        }> = [];

        for (const item of itensArray) {
            const quantidadeItem = (item.quantidade || 0) * quantidadeKit;
            const custoUnitItem = (item.custo || 0) * fatorCusto;
            const precoUnitItem = (item.valorVenda || item.custo || 0) * fatorPreco;
            const custoTotalItem = custoUnitItem * quantidadeItem;
            const subtotalItem = precoUnitItem * quantidadeItem;

            // Buscar material se tiver materialId
            let materialNome = item.nome || 'Item do Kit';
            let materialSku = item.codigo || null;
            let unidadeMedida = item.unidadeMedida || 'un';

            if (item.materialId) {
                const material = await prisma.material.findUnique({
                    where: { id: item.materialId },
                    select: {
                        nome: true,
                        sku: true,
                        unidadeMedida: true
                    }
                });

                if (material) {
                    materialNome = material.nome;
                    materialSku = material.sku;
                    unidadeMedida = material.unidadeMedida || 'un';
                }
            }

            itensDesmembrados.push({
                materialId: item.materialId || null,
                materialNome,
                materialSku,
                quantidade: quantidadeItem,
                unidadeMedida,
                custoUnit: custoUnitItem,
                precoUnit: precoUnitItem,
                subtotal: subtotalItem,
                custoTotal: custoTotalItem
            });
        }

        return itensDesmembrados;
    }
    /**
     * Calcula o Lucro Real detalhado produto por produto
     * Relaciona: Venda → Orçamento → Item → Custo Real (último XML)
     */
    static async calcularLucroReal(dataInicio: Date, dataFim: Date) {
        console.log(`💰 Calculando Lucro Real de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);

        // ====================================
        // 1. BUSCAR VENDAS DO PERÍODO
        // ====================================
        const vendas = await prisma.venda.findMany({
            where: {
                dataVenda: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: {
                    in: ['Pendente', 'Concluida'] // Vendas confirmadas
                }
            },
            include: {
                orcamento: {
                    include: {
                        items: {
                            include: {
                                material: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        sku: true,
                                        preco: true, // Preço cadastrado (fallback)
                                        unidadeMedida: true
                                    }
                                },
                                cotacao: {
                                    select: {
                                        id: true,
                                        nome: true,
                                        sku: true,
                                        valorUnitario: true,
                                        valorVenda: true,
                                        fornecedorId: true,
                                        fornecedorNome: true,
                                        fornecedor: {
                                            select: {
                                                id: true,
                                                nome: true,
                                                classificacao: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                cliente: {
                    select: {
                        nome: true
                    }
                }
            }
        });

        // ====================================
        // 2. PROCESSAR CADA ITEM VENDIDO
        // ====================================
        const lucrosPorProduto: Array<{
            materialId: string | null;
            materialNome: string;
            sku: string | null;
            quantidadeVendida: number;
            unidadeMedida: string;
            valorVendaUnitario: number;
            valorVendaTotal: number;
            custoRealUnitario: number | null;
            custoRealTotal: number | null;
            lucroRealUnitario: number | null;
            lucroRealTotal: number | null;
            margemReal: number | null;
            fonteCusto: 'XML' | 'CADASTRO' | 'SEM_CUSTO' | 'REPRESENTANTE';
            dataUltimaCompra: Date | null;
            numeroNF: string | null;
            tipoItem: 'ORIGINAL' | 'ADITIVO';
            isCotacao?: boolean; // Flag para indicar item de cotação
            valorRepresentante?: number | null; // Valor do representante (para cotações)
            fornecedorClassificacao?: string | null; // Classificação do fornecedor
            vendas: Array<{
                vendaId: string;
                numeroVenda: string;
                cliente: string;
                dataVenda: Date;
                quantidade: number;
            }>;
        }> = [];

        // Agrupar itens por materialId
        const itensPorMaterial = new Map<string, any[]>();

        for (const venda of vendas) {
            for (const item of venda.orcamento.items) {
                // ✅ PROCESSAR MATERIAIS DIRETOS
                if (item.tipo === 'MATERIAL' && item.materialId) {
                    const key = item.materialId;
                    if (!itensPorMaterial.has(key)) {
                        itensPorMaterial.set(key, []);
                    }
                    itensPorMaterial.get(key)!.push({
                        ...item,
                        vendaInfo: {
                            vendaId: venda.id,
                            numeroVenda: venda.numeroVenda,
                            cliente: venda.cliente.nome,
                            dataVenda: venda.dataVenda
                        }
                    });
                }
                // ✅ PROCESSAR KITS DO CATÁLOGO (com kitId)
                else if (item.tipo === 'KIT' && item.kitId) {
                    try {
                        const itensDesmembrados = await this.desmembrarKitCatalogo(
                            item.kitId,
                            item.quantidade,
                            item.custoUnit * item.quantidade, // custoTotalKit
                            item.subtotal // precoTotalKit
                        );

                        // Adicionar cada item desmembrado ao processamento
                        for (const itemDesmembrado of itensDesmembrados) {
                            if (!itemDesmembrado.materialId) continue;

                            const key = itemDesmembrado.materialId;
                            if (!itensPorMaterial.has(key)) {
                                itensPorMaterial.set(key, []);
                            }

                            // Criar item virtual baseado no item desmembrado
                            itensPorMaterial.get(key)!.push({
                                id: `${item.id}_${itemDesmembrado.materialId}`,
                                tipo: 'MATERIAL',
                                materialId: itemDesmembrado.materialId,
                                quantidade: itemDesmembrado.quantidade,
                                subtotal: itemDesmembrado.subtotal,
                                custoUnit: itemDesmembrado.custoUnit,
                                precoUnit: itemDesmembrado.precoUnit,
                                material: {
                                    id: itemDesmembrado.materialId,
                                    nome: itemDesmembrado.materialNome,
                                    sku: itemDesmembrado.materialSku,
                                    unidadeMedida: itemDesmembrado.unidadeMedida,
                                    preco: itemDesmembrado.custoUnit
                                },
                                vendaInfo: {
                                    vendaId: venda.id,
                                    numeroVenda: venda.numeroVenda,
                                    cliente: venda.cliente.nome,
                                    dataVenda: venda.dataVenda
                                },
                                origemKit: true, // Flag para indicar que veio de um kit
                                kitId: item.kitId
                            });
                        }
                    } catch (error) {
                        console.error(`❌ Erro ao desmembrar kit ${item.kitId}:`, error);
                        // Continuar processamento mesmo se houver erro
                    }
                }
                // ✅ PROCESSAR COTAÇÕES (itens do banco frio)
                else if (item.tipo === 'COTACAO' && item.cotacaoId) {
                    const key = `cotacao_${item.cotacaoId}`;
                    if (!itensPorMaterial.has(key)) {
                        itensPorMaterial.set(key, []);
                    }

                    const cotacao = (item as any).cotacao;
                    itensPorMaterial.get(key)!.push({
                        ...item,
                        isCotacao: true,
                        cotacao: cotacao,
                        material: {
                            id: item.cotacaoId,
                            nome: cotacao?.nome || item.descricao || 'Cotação',
                            sku: cotacao?.sku || null,
                            unidadeMedida: (item as any).unidadeVenda || 'un',
                            preco: cotacao?.valorUnitario || item.custoUnit
                        },
                        vendaInfo: {
                            vendaId: venda.id,
                            numeroVenda: venda.numeroVenda,
                            cliente: venda.cliente.nome,
                            dataVenda: venda.dataVenda
                        }
                    });
                }
                // ✅ PROCESSAR KITS UNIFICADOS (sem kitId, com itensDoKit)
                else if (item.tipo === 'KIT' && !item.kitId && (item as any).itensDoKit) {
                    try {
                        const itensDesmembrados = await this.desmembrarKitUnificado(
                            (item as any).itensDoKit,
                            item.quantidade,
                            item.custoUnit * item.quantidade, // custoTotalKit
                            item.subtotal // precoTotalKit
                        );

                        // Adicionar cada item desmembrado ao processamento
                        for (const itemDesmembrado of itensDesmembrados) {
                            if (!itemDesmembrado.materialId) {
                                // Item sem materialId (banco frio ou item virtual)
                                // Criar registro mesmo assim para rastreabilidade
                                console.warn(`⚠️ Item do kit unificado sem materialId: ${itemDesmembrado.materialNome}`);
                                continue; // Pular itens sem materialId por enquanto
                            }

                            const key = itemDesmembrado.materialId;
                            if (!itensPorMaterial.has(key)) {
                                itensPorMaterial.set(key, []);
                            }

                            // Buscar material para obter dados completos
                            const material = await prisma.material.findUnique({
                                where: { id: itemDesmembrado.materialId },
                                select: {
                                    id: true,
                                    nome: true,
                                    sku: true,
                                    unidadeMedida: true,
                                    preco: true
                                }
                            });

                            itensPorMaterial.get(key)!.push({
                                id: `${item.id}_${itemDesmembrado.materialId}`,
                                tipo: 'MATERIAL',
                                materialId: itemDesmembrado.materialId,
                                quantidade: itemDesmembrado.quantidade,
                                subtotal: itemDesmembrado.subtotal,
                                custoUnit: itemDesmembrado.custoUnit,
                                precoUnit: itemDesmembrado.precoUnit,
                                material: material || {
                                    id: itemDesmembrado.materialId,
                                    nome: itemDesmembrado.materialNome,
                                    sku: itemDesmembrado.materialSku,
                                    unidadeMedida: itemDesmembrado.unidadeMedida,
                                    preco: itemDesmembrado.custoUnit
                                },
                                vendaInfo: {
                                    vendaId: venda.id,
                                    numeroVenda: venda.numeroVenda,
                                    cliente: venda.cliente.nome,
                                    dataVenda: venda.dataVenda
                                },
                                origemKit: true, // Flag para indicar que veio de um kit
                                kitUnificado: true // Flag para indicar que é kit unificado
                            });
                        }
                    } catch (error) {
                        console.error(`❌ Erro ao desmembrar kit unificado:`, error);
                        // Continuar processamento mesmo se houver erro
                    }
                }
            }
        }

        // ====================================
        // 3. PARA CADA MATERIAL/COTAÇÃO, BUSCAR ÚLTIMO CUSTO XML
        // ====================================
        for (const [itemKey, items] of itensPorMaterial.entries()) {
            const primeiroItem = items[0];
            const material = primeiroItem.material;
            const isCotacao = primeiroItem.isCotacao === true;

            if (!material) continue;

            // Calcular totais
            const quantidadeTotal = items.reduce((sum, item) => sum + item.quantidade, 0);
            const valorVendaTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
            const valorVendaUnitario = valorVendaTotal / quantidadeTotal;

            // Determinar custo real
            let custoRealUnitario: number | null = null;
            let fonteCusto: 'XML' | 'CADASTRO' | 'SEM_CUSTO' | 'REPRESENTANTE' = 'SEM_CUSTO';
            let dataUltimaCompra: Date | null = null;
            let numeroNF: string | null = null;
            let valorRepresentante: number | null = null;
            let fornecedorClassificacao: string | null = null;

            if (isCotacao) {
                // Para cotações: custo = valor unitário da cotação (preço do representante/fornecedor)
                const cotacao = (primeiroItem as any).cotacao;
                custoRealUnitario = cotacao?.valorUnitario || primeiroItem.custoUnit;
                valorRepresentante = cotacao?.valorUnitario || null;
                fornecedorClassificacao = cotacao?.fornecedor?.classificacao || null;
                fonteCusto = fornecedorClassificacao === 'Representante_Vendedor' ? 'REPRESENTANTE' : 'CADASTRO';
            } else {
                // Para materiais: buscar último custo do XML
                const ultimaCompraItem = await prisma.compraItem.findFirst({
                    where: {
                        materialId: itemKey,
                        compra: {
                            status: 'Recebido',
                            dataRecebimento: {
                                lte: dataFim
                            }
                        }
                    },
                    orderBy: {
                        compra: {
                            dataRecebimento: 'desc'
                        }
                    },
                    include: {
                        compra: {
                            select: {
                                numeroNF: true,
                                dataRecebimento: true
                            }
                        }
                    }
                });

                if (ultimaCompraItem) {
                    custoRealUnitario = ultimaCompraItem.valorUnit;
                    fonteCusto = 'XML';
                    dataUltimaCompra = ultimaCompraItem.compra.dataRecebimento;
                    numeroNF = ultimaCompraItem.compra.numeroNF;

                    if ((ultimaCompraItem as any).quantidadeFracionada && (ultimaCompraItem as any).quantidadeFracionada > 0) {
                        custoRealUnitario = ultimaCompraItem.valorUnit / (ultimaCompraItem as any).quantidadeFracionada;
                    }
                } else if (material.preco !== null) {
                    custoRealUnitario = material.preco;
                    fonteCusto = 'CADASTRO';
                }
            }

            // Calcular lucro real
            const custoRealTotal = custoRealUnitario !== null ? custoRealUnitario * quantidadeTotal : null;
            const lucroRealTotal = custoRealTotal !== null ? valorVendaTotal - custoRealTotal : null;
            const lucroRealUnitario = custoRealUnitario !== null ? valorVendaUnitario - custoRealUnitario : null;
            const margemReal = valorVendaTotal > 0 && lucroRealTotal !== null 
                ? (lucroRealTotal / valorVendaTotal) * 100 
                : null;

            let tipoItem: 'ORIGINAL' | 'ADITIVO' = 'ORIGINAL';
            
            lucrosPorProduto.push({
                materialId: isCotacao ? `cotacao_${material.id}` : material.id,
                materialNome: material.nome,
                sku: material.sku,
                quantidadeVendida: quantidadeTotal,
                unidadeMedida: material.unidadeMedida,
                valorVendaUnitario,
                valorVendaTotal,
                custoRealUnitario,
                custoRealTotal,
                lucroRealUnitario,
                lucroRealTotal,
                margemReal,
                fonteCusto,
                dataUltimaCompra,
                numeroNF,
                tipoItem,
                isCotacao, // Flag para indicar que é item de cotação
                valorRepresentante, // Valor do representante (para cotações)
                fornecedorClassificacao, // Classificação do fornecedor
                vendas: items.map(item => ({
                    vendaId: item.vendaInfo.vendaId,
                    numeroVenda: item.vendaInfo.numeroVenda,
                    cliente: item.vendaInfo.cliente,
                    dataVenda: item.vendaInfo.dataVenda,
                    quantidade: item.quantidade
                }))
            });
        }

        // ====================================
        // 4. CALCULAR TOTAIS GERAIS
        // ====================================
        const totalVendaGeral = lucrosPorProduto.reduce((sum, p) => sum + p.valorVendaTotal, 0);
        const totalCustoGeral = lucrosPorProduto.reduce((sum, p) => sum + (p.custoRealTotal || 0), 0);
        const totalLucroGeral = lucrosPorProduto.reduce((sum, p) => sum + (p.lucroRealTotal || 0), 0);
        const margemGeralReal = totalVendaGeral > 0 ? (totalLucroGeral / totalVendaGeral) * 100 : 0;

        // Estatísticas
        const produtosComXML = lucrosPorProduto.filter(p => p.fonteCusto === 'XML').length;
        const produtosComCadastro = lucrosPorProduto.filter(p => p.fonteCusto === 'CADASTRO').length;
        const produtosSemCusto = lucrosPorProduto.filter(p => p.fonteCusto === 'SEM_CUSTO').length;
        const produtosRepresentante = lucrosPorProduto.filter(p => p.fonteCusto === 'REPRESENTANTE').length;
        const totalCotacoes = lucrosPorProduto.filter(p => p.isCotacao === true).length;

        // Ordenar por lucro total (maior primeiro)
        lucrosPorProduto.sort((a, b) => {
            const lucroA = a.lucroRealTotal || 0;
            const lucroB = b.lucroRealTotal || 0;
            return lucroB - lucroA;
        });

        return {
            periodo: {
                inicio: dataInicio,
                fim: dataFim
            },
            resumo: {
                totalVenda: totalVendaGeral,
                totalCusto: totalCustoGeral,
                totalLucro: totalLucroGeral,
                margemReal: margemGeralReal
            },
            estatisticas: {
                totalProdutos: lucrosPorProduto.length,
                produtosComXML,
                produtosComCadastro,
                produtosSemCusto,
                produtosRepresentante,
                totalCotacoes,
                totalVendas: vendas.length
            },
            produtos: lucrosPorProduto,
            alertas: {
                produtosSemCusto: lucrosPorProduto
                    .filter(p => p.fonteCusto === 'SEM_CUSTO')
                    .map(p => ({
                        materialNome: p.materialNome,
                        sku: p.sku,
                        valorVenda: p.valorVendaTotal
                    }))
            }
        };
    }

    /**
     * Busca produtos mais lucrativos (Top N)
     */
    static async getProdutosMaisLucrativos(dataInicio: Date, dataFim: Date, limit: number = 10) {
        const resultado = await this.calcularLucroReal(dataInicio, dataFim);
        
        return {
            periodo: resultado.periodo,
            produtos: resultado.produtos
                .filter(p => p.lucroRealTotal !== null && p.lucroRealTotal > 0)
                .slice(0, limit)
        };
    }

    /**
     * Busca produtos com margem negativa (prejuízo)
     */
    static async getProdutosComPrejuizo(dataInicio: Date, dataFim: Date) {
        const resultado = await this.calcularLucroReal(dataInicio, dataFim);
        
        return {
            periodo: resultado.periodo,
            produtos: resultado.produtos
                .filter(p => p.lucroRealTotal !== null && p.lucroRealTotal < 0)
                .sort((a, b) => (a.lucroRealTotal || 0) - (b.lucroRealTotal || 0)) // Pior primeiro
        };
    }

    /**
     * Calcula o Lucro Real detalhado serviço por serviço
     * Processa itens do tipo SERVICO dos pedidos de venda
     * Aceita serviços com e sem custo definido
     */
    static async calcularLucroRealServicos(dataInicio: Date, dataFim: Date) {
        console.log(`🛠️ Calculando Lucro Real de Serviços de ${dataInicio.toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`);

        // ====================================
        // 1. BUSCAR VENDAS DO PERÍODO
        // ====================================
        const vendas = await prisma.venda.findMany({
            where: {
                dataVenda: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: {
                    in: ['Pendente', 'Concluida'] // Vendas confirmadas
                }
            },
            include: {
                orcamento: {
                    include: {
                        items: true
                    }
                },
                cliente: {
                    select: {
                        nome: true
                    }
                }
            }
        });

        // ====================================
        // 1.1 BUSCAR TODOS OS SERVIÇOS CADASTRADOS PARA MAPEAR UNIDADES
        // ====================================
        const servicosCadastrados = await prisma.servico.findMany({
            select: {
                id: true,
                nome: true,
                codigo: true,
                unidade: true
            }
        });

        // Criar mapas de nome/código do serviço -> unidade e código
        const mapaUnidadesServicos = new Map<string, string>();
        const mapaCodigosServicos = new Map<string, string>(); // nome -> código
        servicosCadastrados.forEach(servico => {
            const nomeLower = servico.nome.toLowerCase().trim();
            // Mapear por nome e código
            mapaUnidadesServicos.set(nomeLower, servico.unidade || 'un');
            if (servico.codigo) {
                mapaUnidadesServicos.set(servico.codigo.toLowerCase().trim(), servico.unidade || 'un');
                mapaCodigosServicos.set(nomeLower, servico.codigo);
            }
        });

        // ====================================
        // 2. PROCESSAR CADA SERVIÇO VENDIDO
        // ====================================
        const lucrosPorServico: Array<{
            nomeServico: string;
            descricao: string;
            codigoServico?: string; // ✅ Código do serviço cadastrado
            clienteNome: string;
            quantidade: number;
            horas: number;
            unidadeMedida: string;
            receitaServico: number;
            valorTotalServico: number;
            custoExecucao: number;
            lucroLiquido: number;
            margem: number;
            temCusto: boolean;
            vendas: Array<{
                vendaId: string;
                numeroVenda: string;
                dataVenda: Date;
                quantidade: number;
                precoUnitario: number;
                custoUnitario: number;
            }>;
        }> = [];

        // Processar todos os itens de serviço
        for (const venda of vendas) {
            for (const item of venda.orcamento.items) {
                // ✅ PROCESSAR SERVIÇOS DIRETOS
                if (item.tipo === 'SERVICO') {
                    const servicoNome = item.servicoNome || item.descricao || 'Serviço sem nome';
                    const quantidade = item.quantidade;
                    const precoUnit = item.precoUnit;
                    const custoUnit = item.custoUnit || 0; // Custo pode ser 0 se não definido
                    const receitaTotal = item.subtotal;
                    const custoTotal = custoUnit * quantidade;
                    const lucroTotal = receitaTotal - custoTotal;
                    const margem = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;
                    const temCusto = custoUnit > 0;

                    // ✅ BUSCAR UNIDADE DE MEDIDA DO SERVIÇO CADASTRADO
                    // Tentar encontrar pelo nome do serviço
                    const servicoNomeLower = servicoNome.toLowerCase().trim();
                    let unidadeMedida = 'h'; // Padrão: horas
                    let codigoServico: string | undefined = undefined;
                    
                    // Buscar no mapa de serviços cadastrados
                    if (mapaUnidadesServicos.has(servicoNomeLower)) {
                        unidadeMedida = mapaUnidadesServicos.get(servicoNomeLower)!;
                        codigoServico = mapaCodigosServicos.get(servicoNomeLower);
                    } else {
                        // Tentar busca parcial (caso o nome tenha variações)
                        for (const [nomeServico, unidade] of mapaUnidadesServicos.entries()) {
                            if (servicoNomeLower.includes(nomeServico) || nomeServico.includes(servicoNomeLower)) {
                                unidadeMedida = unidade;
                                codigoServico = mapaCodigosServicos.get(nomeServico);
                                break;
                            }
                        }
                    }

                    // Verificar se já existe esse serviço para esse cliente
                    const servicoExistente = lucrosPorServico.find(
                        s => s.nomeServico === servicoNome && s.clienteNome === venda.cliente.nome
                    );

                    if (servicoExistente) {
                        // Agregar os valores
                        servicoExistente.quantidade += quantidade;
                        servicoExistente.horas += quantidade;
                        servicoExistente.receitaServico += receitaTotal;
                        servicoExistente.valorTotalServico += receitaTotal;
                        servicoExistente.custoExecucao += custoTotal;
                        servicoExistente.lucroLiquido += lucroTotal;
                        servicoExistente.margem = servicoExistente.receitaServico > 0 
                            ? (servicoExistente.lucroLiquido / servicoExistente.receitaServico) * 100 
                            : 0;
                        servicoExistente.vendas.push({
                            vendaId: venda.id,
                            numeroVenda: venda.numeroVenda,
                            dataVenda: venda.dataVenda,
                            quantidade,
                            precoUnitario: precoUnit,
                            custoUnitario: custoUnit
                        });
                    } else {
                        // Criar novo registro
                        lucrosPorServico.push({
                            nomeServico: servicoNome,
                            descricao: servicoNome,
                            codigoServico: codigoServico, // ✅ Código do serviço cadastrado
                            clienteNome: venda.cliente.nome,
                            quantidade: quantidade,
                            horas: quantidade,
                            unidadeMedida: unidadeMedida, // ✅ Usar unidade do serviço cadastrado
                            receitaServico: receitaTotal,
                            valorTotalServico: receitaTotal,
                            custoExecucao: custoTotal,
                            lucroLiquido: lucroTotal,
                            margem,
                            temCusto,
                            vendas: [{
                                vendaId: venda.id,
                                numeroVenda: venda.numeroVenda,
                                dataVenda: venda.dataVenda,
                                quantidade,
                                precoUnitario: precoUnit,
                                custoUnitario: custoUnit
                            }]
                        });
                    }
                }
                // ✅ PROCESSAR SERVIÇOS DENTRO DE KITS DO CATÁLOGO
                else if (item.tipo === 'KIT' && item.kitId) {
                    try {
                        // Buscar kit com itensFaltantes (que podem conter serviços)
                        const kit = await prisma.kit.findUnique({
                            where: { id: item.kitId },
                            select: {
                                itensFaltantes: true
                            }
                        });

                        if (kit && kit.itensFaltantes) {
                            let itensFaltantesArray: any[] = [];
                            if (typeof kit.itensFaltantes === 'string') {
                                try {
                                    itensFaltantesArray = JSON.parse(kit.itensFaltantes);
                                } catch (e) {
                                    console.warn('Erro ao parsear itensFaltantes do kit:', e);
                                }
                            } else if (Array.isArray(kit.itensFaltantes)) {
                                itensFaltantesArray = kit.itensFaltantes;
                            }

                            // Processar serviços dentro do kit
                            for (const itemFrio of itensFaltantesArray) {
                                if (itemFrio.tipo === 'SERVICO' || itemFrio.servicoNome) {
                                    const servicoNome = itemFrio.servicoNome || itemFrio.nome || 'Serviço do Kit';
                                    const quantidade = (itemFrio.quantidade || 0) * item.quantidade;
                                    
                                    // Distribuir custo e preço proporcionalmente
                                    const fator = itemFrio.quantidade || 1;
                                    const custoUnit = (itemFrio.custo || 0) * (item.custoUnit / (item.custoUnit || 1));
                                    const precoUnit = (itemFrio.valorVenda || 0) * (item.precoUnit / (item.subtotal / item.quantidade || 1));
                                    const receitaTotal = precoUnit * quantidade;
                                    const custoTotal = custoUnit * quantidade;
                                    const lucroTotal = receitaTotal - custoTotal;
                                    const margem = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;
                                    const temCusto = custoUnit > 0;

                                    // Buscar unidade do serviço
                                    const servicoNomeLower = servicoNome.toLowerCase().trim();
                                    let unidadeMedida = 'h';
                                    let codigoServico: string | undefined = undefined;
                                    
                                    if (mapaUnidadesServicos.has(servicoNomeLower)) {
                                        unidadeMedida = mapaUnidadesServicos.get(servicoNomeLower)!;
                                        codigoServico = mapaCodigosServicos.get(servicoNomeLower);
                                    }

                                    // Verificar se já existe esse serviço para esse cliente
                                    const servicoExistente = lucrosPorServico.find(
                                        s => s.nomeServico === servicoNome && s.clienteNome === venda.cliente.nome
                                    );

                                    if (servicoExistente) {
                                        servicoExistente.quantidade += quantidade;
                                        servicoExistente.horas += quantidade;
                                        servicoExistente.receitaServico += receitaTotal;
                                        servicoExistente.valorTotalServico += receitaTotal;
                                        servicoExistente.custoExecucao += custoTotal;
                                        servicoExistente.lucroLiquido += lucroTotal;
                                        servicoExistente.margem = servicoExistente.receitaServico > 0 
                                            ? (servicoExistente.lucroLiquido / servicoExistente.receitaServico) * 100 
                                            : 0;
                                        servicoExistente.vendas.push({
                                            vendaId: venda.id,
                                            numeroVenda: venda.numeroVenda,
                                            dataVenda: venda.dataVenda,
                                            quantidade,
                                            precoUnitario: precoUnit,
                                            custoUnitario: custoUnit
                                        });
                                    } else {
                                        lucrosPorServico.push({
                                            nomeServico: servicoNome,
                                            descricao: servicoNome,
                                            codigoServico,
                                            clienteNome: venda.cliente.nome,
                                            quantidade: quantidade,
                                            horas: quantidade,
                                            unidadeMedida,
                                            receitaServico: receitaTotal,
                                            valorTotalServico: receitaTotal,
                                            custoExecucao: custoTotal,
                                            lucroLiquido: lucroTotal,
                                            margem,
                                            temCusto,
                                            vendas: [{
                                                vendaId: venda.id,
                                                numeroVenda: venda.numeroVenda,
                                                dataVenda: venda.dataVenda,
                                                quantidade,
                                                precoUnitario: precoUnit,
                                                custoUnitario: custoUnit
                                            }]
                                        });
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Erro ao processar serviços do kit ${item.kitId}:`, error);
                    }
                }
                // ✅ PROCESSAR SERVIÇOS DENTRO DE KITS UNIFICADOS
                else if (item.tipo === 'KIT' && !item.kitId && (item as any).itensDoKit) {
                    try {
                        let itensArray: any[] = [];
                        if (typeof (item as any).itensDoKit === 'string') {
                            try {
                                itensArray = JSON.parse((item as any).itensDoKit);
                            } catch (e) {
                                console.warn('Erro ao parsear itensDoKit:', e);
                            }
                        } else if (Array.isArray((item as any).itensDoKit)) {
                            itensArray = (item as any).itensDoKit;
                        }

                        // Processar serviços dentro do kit unificado
                        for (const itemKit of itensArray) {
                            if (itemKit.tipo === 'SERVICO' || itemKit.servicoNome || !itemKit.materialId) {
                                const servicoNome = itemKit.servicoNome || itemKit.nome || 'Serviço do Kit';
                                const quantidade = (itemKit.quantidade || 0) * item.quantidade;
                                
                                // Distribuir custo e preço proporcionalmente
                                const custoUnit = (itemKit.custo || 0) * (item.custoUnit / (item.custoUnit || 1));
                                const precoUnit = (itemKit.valorVenda || itemKit.custo || 0) * (item.precoUnit / (item.subtotal / item.quantidade || 1));
                                const receitaTotal = precoUnit * quantidade;
                                const custoTotal = custoUnit * quantidade;
                                const lucroTotal = receitaTotal - custoTotal;
                                const margem = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;
                                const temCusto = custoUnit > 0;

                                // Buscar unidade do serviço
                                const servicoNomeLower = servicoNome.toLowerCase().trim();
                                let unidadeMedida = 'h';
                                let codigoServico: string | undefined = undefined;
                                
                                if (mapaUnidadesServicos.has(servicoNomeLower)) {
                                    unidadeMedida = mapaUnidadesServicos.get(servicoNomeLower)!;
                                    codigoServico = mapaCodigosServicos.get(servicoNomeLower);
                                }

                                // Verificar se já existe esse serviço para esse cliente
                                const servicoExistente = lucrosPorServico.find(
                                    s => s.nomeServico === servicoNome && s.clienteNome === venda.cliente.nome
                                );

                                if (servicoExistente) {
                                    servicoExistente.quantidade += quantidade;
                                    servicoExistente.horas += quantidade;
                                    servicoExistente.receitaServico += receitaTotal;
                                    servicoExistente.valorTotalServico += receitaTotal;
                                    servicoExistente.custoExecucao += custoTotal;
                                    servicoExistente.lucroLiquido += lucroTotal;
                                    servicoExistente.margem = servicoExistente.receitaServico > 0 
                                        ? (servicoExistente.lucroLiquido / servicoExistente.receitaServico) * 100 
                                        : 0;
                                    servicoExistente.vendas.push({
                                        vendaId: venda.id,
                                        numeroVenda: venda.numeroVenda,
                                        dataVenda: venda.dataVenda,
                                        quantidade,
                                        precoUnitario: precoUnit,
                                        custoUnitario: custoUnit
                                    });
                                } else {
                                    lucrosPorServico.push({
                                        nomeServico: servicoNome,
                                        descricao: servicoNome,
                                        codigoServico,
                                        clienteNome: venda.cliente.nome,
                                        quantidade: quantidade,
                                        horas: quantidade,
                                        unidadeMedida,
                                        receitaServico: receitaTotal,
                                        valorTotalServico: receitaTotal,
                                        custoExecucao: custoTotal,
                                        lucroLiquido: lucroTotal,
                                        margem,
                                        temCusto,
                                        vendas: [{
                                            vendaId: venda.id,
                                            numeroVenda: venda.numeroVenda,
                                            dataVenda: venda.dataVenda,
                                            quantidade,
                                            precoUnitario: precoUnit,
                                            custoUnitario: custoUnit
                                        }]
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Erro ao processar serviços do kit unificado:`, error);
                    }
                }
            }
        }

        // ====================================
        // 3. CALCULAR TOTAIS GERAIS
        // ====================================
        const totalReceitaServicos = lucrosPorServico.reduce((sum, s) => sum + s.receitaServico, 0);
        const totalCustoServicos = lucrosPorServico.reduce((sum, s) => sum + s.custoExecucao, 0);
        const totalLucroServicos = lucrosPorServico.reduce((sum, s) => sum + s.lucroLiquido, 0);
        const margemGeralServicos = totalReceitaServicos > 0 ? (totalLucroServicos / totalReceitaServicos) * 100 : 0;

        // Estatísticas
        const totalServicos = lucrosPorServico.length;
        const servicosComCusto = lucrosPorServico.filter(s => s.temCusto).length;
        const servicosSemCusto = lucrosPorServico.filter(s => !s.temCusto).length;

        // Ordenar por lucro total (maior primeiro)
        lucrosPorServico.sort((a, b) => b.lucroLiquido - a.lucroLiquido);

        return {
            periodo: {
                inicio: dataInicio,
                fim: dataFim
            },
            resumo: {
                totalVenda: totalReceitaServicos,
                totalVendaServicos: totalReceitaServicos,
                totalCusto: totalCustoServicos,
                totalCustoServicos: totalCustoServicos,
                totalLucro: totalLucroServicos,
                totalLucroServicos: totalLucroServicos,
                margemReal: margemGeralServicos,
                margemServicos: margemGeralServicos
            },
            estatisticas: {
                totalServicos,
                servicosComCusto,
                servicosSemCusto,
                totalVendas: vendas.length
            },
            servicos: lucrosPorServico,
            alertas: {
                servicosSemCusto: lucrosPorServico
                    .filter(s => !s.temCusto)
                    .map(s => ({
                        servicoNome: s.nomeServico,
                        clienteNome: s.clienteNome,
                        receitaServico: s.receitaServico
                    }))
            }
        };
    }
}
