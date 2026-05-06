import { prisma } from '../lib/prisma';
import { roundMoney } from '../utils/currency';

export interface KitItemInput {
    materialId?: string;
    kitFilhoId?: string;
    quantidade: number;
}

export interface KitInput {
    nome: string;
    descricao?: string;
    tipo: string;
    preco: number;
    items: KitItemInput[];
    itensBancoFrio?: Array<{
        cotacaoId?: string;
        servicoId?: string;
        nome: string;
        quantidade: number;
        precoUnit: number;
        dataUltimaCotacao?: string;
        unidade?: string;
        tipo: 'COTACAO' | 'SERVICO'; // Tipo do item: cotação ou serviço
    }>;
    temItensCotacao?: boolean;
}

export interface KitUpdateInput {
    nome?: string;
    descricao?: string;
    tipo?: string;
    preco?: number;
    items?: KitItemInput[];
    ativo?: boolean;
    itensBancoFrio?: Array<{
        cotacaoId?: string;
        servicoId?: string;
        nome: string;
        quantidade: number;
        precoUnit: number;
        dataUltimaCotacao?: string;
        unidade?: string;
        tipo: 'COTACAO' | 'SERVICO'; // Tipo do item: cotação ou serviço
    }>;
    temItensCotacao?: boolean;
}

export class KitsService {
    private static kitIncludeBase = {
        items: {
            include: {
                material: {
                    select: {
                        id: true,
                        nome: true,
                        sku: true,
                        descricao: true,
                        unidadeMedida: true,
                        preco: true,
                        valorVenda: true,
                        estoque: true,
                        tipo: true,
                        categoria: true,
                        imagemUrl: true,
                        ncm: true
                    }
                },
                kitFilho: {
                    select: {
                        id: true,
                        nome: true,
                        descricao: true,
                        tipo: true,
                        preco: true,
                        temItensCotacao: true,
                        statusEstoque: true,
                        itensFaltantes: true,
                        ativo: true
                    }
                }
            }
        }
    } as const;

    /**
     * Lista todos os kits
     */
    static async listar() {
        const kits = await prisma.kit.findMany({
            include: {
                ...this.kitIncludeBase
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Processar itensFaltantes para cada kit (garantir que seja sempre um array)
        return kits.map(kit => {
            let itensFaltantesProcessados: any[] = [];
            if (kit.itensFaltantes) {
                if (typeof kit.itensFaltantes === 'string') {
                    try {
                        const parsed = JSON.parse(kit.itensFaltantes);
                        itensFaltantesProcessados = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                        console.error('Erro ao fazer parse de itensFaltantes:', e);
                        itensFaltantesProcessados = [];
                    }
                } else if (Array.isArray(kit.itensFaltantes)) {
                    itensFaltantesProcessados = kit.itensFaltantes;
                } else if (typeof kit.itensFaltantes === 'object' && kit.itensFaltantes !== null) {
                    itensFaltantesProcessados = [kit.itensFaltantes];
                }
            }
            
            return {
                ...kit,
                itensFaltantes: itensFaltantesProcessados
            };
        });
    }

    /**
     * Busca um kit por ID
     */
    static async buscarPorId(id: string) {
        const kit = await prisma.kit.findUnique({
            where: { id },
            include: {
                ...this.kitIncludeBase
            }
        });

        if (kit) {
            console.log(`📦 Kit encontrado: ${kit.nome}`);
            console.log(`   - Items no estoque: ${kit.items.length}`);
            console.log(`   - ItensFaltantes (raw):`, kit.itensFaltantes);
            console.log(`   - ItensFaltantes (type):`, typeof kit.itensFaltantes);
            console.log(`   - temItensCotacao:`, kit.temItensCotacao);
            console.log(`   - statusEstoque:`, kit.statusEstoque);
            
            // Garantir que itensFaltantes seja sempre um array
            // O Prisma retorna JSON como objeto JavaScript, mas pode ser null
            let itensFaltantesProcessados: any[] = [];
            if (kit.itensFaltantes) {
                if (typeof kit.itensFaltantes === 'string') {
                    try {
                        const parsed = JSON.parse(kit.itensFaltantes);
                        itensFaltantesProcessados = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                        console.error('Erro ao fazer parse de itensFaltantes:', e);
                        itensFaltantesProcessados = [];
                    }
                } else if (Array.isArray(kit.itensFaltantes)) {
                    itensFaltantesProcessados = kit.itensFaltantes;
                } else if (typeof kit.itensFaltantes === 'object' && kit.itensFaltantes !== null) {
                    // Se for um objeto único, converter para array
                    itensFaltantesProcessados = [kit.itensFaltantes];
                }
            }
            
            console.log(`   - ItensFaltantes (processed):`, itensFaltantesProcessados);
            console.log(`   - ItensFaltantes (length):`, itensFaltantesProcessados.length);
            
            // Retornar kit com itensFaltantes processado como array
            return {
                ...kit,
                itensFaltantes: itensFaltantesProcessados
            };
        }

        return kit;
    }

    /**
     * Busca um kit e expande a composição (kits aninhados) até um limite.
     * Retorna uma árvore com proteção contra ciclos.
     */
    static async buscarComposicaoPorId(id: string, maxDepth = 4) {
        const visited = new Set<string>();

        const expand = async (kitId: string, depth: number): Promise<any> => {
            const kit = await prisma.kit.findUnique({
                where: { id: kitId },
                include: {
                    ...this.kitIncludeBase
                }
            });

            if (!kit) return null;

            if (visited.has(kit.id)) {
                return {
                    ...kit,
                    cicloDetectado: true,
                    items: []
                };
            }

            if (depth >= maxDepth) {
                return {
                    ...kit,
                    limiteExpansaoAtingido: true
                };
            }

            visited.add(kit.id);

            const itemsExpandidos = await Promise.all(
                (kit.items || []).map(async (it: any) => {
                    if (it.kitFilho?.id) {
                        const child = await expand(it.kitFilho.id, depth + 1);
                        return { ...it, kitFilho: child };
                    }
                    return it;
                })
            );

            return {
                ...kit,
                items: itemsExpandidos
            };
        };

        return expand(id, 0);
    }

    /**
     * Cria um novo kit
     */
    static async criar(data: KitInput) {
        const { nome, descricao, tipo, preco, items, itensBancoFrio, temItensCotacao } = data;

        console.log(`📦 Criando kit: ${nome}`);
        console.log(`   - Itens estoque real: ${items.length}`);
        console.log(`   - Itens extras (banco frio + serviços): ${itensBancoFrio?.length || 0}`);
        if (itensBancoFrio && itensBancoFrio.length > 0) {
            const cotacoes = itensBancoFrio.filter(i => i.tipo === 'COTACAO').length;
            const servicos = itensBancoFrio.filter(i => i.tipo === 'SERVICO').length;
            console.log(`   - Itens banco frio: ${cotacoes}`);
            console.log(`   - Serviços: ${servicos}`);
            console.log(`   - Detalhes:`, itensBancoFrio);
        }

        // IMPORTANTE: statusEstoque deve ser calculado apenas baseado em itens de estoque real
        // Cotações não afetam o statusEstoque - serão validadas apenas na ordem de serviço quando vinculadas
        // Serviços não afetam o status de estoque - não provêm de estoque
        const temItensBancoFrio = itensBancoFrio && itensBancoFrio.some(i => i.tipo === 'COTACAO');
        const temServicos = itensBancoFrio && itensBancoFrio.some(i => i.tipo === 'SERVICO');
        
        // Validar estoque apenas para itens de estoque real (não cotações, não serviços)
        // Por enquanto, não validamos estoque ao criar kit - apenas salvamos
        // A validação acontecerá na ordem de serviço quando for iniciar obra
        // statusEstoque 'COMPLETO' por padrão - será revalidado quando necessário
        const statusEstoque = 'COMPLETO';
        
        // Combinar cotações e serviços no campo itensFaltantes (precoUnit sempre 2 decimais)
        const todosItensExtras = (itensBancoFrio || []).map((i: any) => ({
            ...i,
            precoUnit: roundMoney(i.precoUnit ?? 0)
        }));
        
        console.log(`📦 Salvando kit com ${todosItensExtras.length} itens extras (cotações + serviços)`);
        if (temServicos) {
            const servicosCount = todosItensExtras.filter(i => i.tipo === 'SERVICO').length;
            console.log(`   - Serviços incluídos: ${servicosCount}`);
        }
        
        const kit = await prisma.kit.create({
            data: {
                nome,
                descricao,
                tipo,
                preco: roundMoney(preco),
                temItensCotacao: temItensCotacao || false,
                // Salvar itens do banco frio E serviços como JSON para referência (valores com 2 decimais)
                itensFaltantes: todosItensExtras.length > 0 ? JSON.parse(JSON.stringify(todosItensExtras)) : null,
                statusEstoque: statusEstoque, // Apenas informativo, não bloqueia criação
                items: {
                    create: (items || []).map(item => {
                        const hasMaterial = !!item.materialId;
                        const hasChildKit = !!item.kitFilhoId;
                        if (hasMaterial === hasChildKit) {
                            throw new Error('Cada item do kit deve ter exatamente um: materialId OU kitFilhoId');
                        }
                        return {
                            materialId: item.materialId ?? null,
                            kitFilhoId: item.kitFilhoId ?? null,
                            quantidade: item.quantidade
                        };
                    })
                },
            },
            include: {
                ...this.kitIncludeBase
            }
        });

        const totalItens = kit.items.length + (itensBancoFrio?.length || 0);
        const cotacoes = itensBancoFrio?.filter(i => i.tipo === 'COTACAO').length || 0;
        const servicos = itensBancoFrio?.filter(i => i.tipo === 'SERVICO').length || 0;
        console.log(`✅ Kit criado: ${kit.nome} (${kit.items.length} em estoque, ${cotacoes} banco frio, ${servicos} serviços, total: ${totalItens})`);
        return kit;
    }

    /**
     * Atualiza um kit existente
     */
    static async atualizar(id: string, data: KitUpdateInput) {
        const { nome, descricao, tipo, preco, items, ativo, itensBancoFrio, temItensCotacao } = data;

        console.log(`📝 Atualizando kit: ${id}`);
        console.log(`   - Novos itens estoque real: ${items?.length || 0}`);
        if (itensBancoFrio && itensBancoFrio.length > 0) {
            const cotacoes = itensBancoFrio.filter(i => i.tipo === 'COTACAO').length;
            const servicos = itensBancoFrio.filter(i => i.tipo === 'SERVICO').length;
            console.log(`   - Novos itens banco frio: ${cotacoes}`);
            console.log(`   - Novos serviços: ${servicos}`);
        } else {
            console.log(`   - Novos itens extras: 0`);
        }

        // Se items foi fornecido, deletar os itens existentes e recriar
        if (items !== undefined) {
            await prisma.kitItem.deleteMany({
                where: { kitId: id }
            });
        }

        const kit = await prisma.kit.update({
            where: { id },
            data: {
                ...(nome !== undefined && { nome }),
                ...(descricao !== undefined && { descricao }),
                ...(tipo !== undefined && { tipo }),
                ...(preco !== undefined && { preco: roundMoney(preco) }),
                ...(ativo !== undefined && { ativo }),
                ...(temItensCotacao !== undefined && { temItensCotacao }),
                ...(itensBancoFrio !== undefined && { 
                    // itensFaltantes com precoUnit sempre 2 decimais
                    itensFaltantes: itensBancoFrio.length > 0
                        ? JSON.parse(JSON.stringify(itensBancoFrio.map((i: any) => ({ ...i, precoUnit: roundMoney(i.precoUnit ?? 0) }))))
                        : null 
                }),
                ...((itensBancoFrio !== undefined || items !== undefined) && {
                    // statusEstoque deve ser calculado apenas baseado em itens de estoque real
                    // Cotações não afetam o statusEstoque - serão validadas apenas na ordem de serviço
                    // Serviços não afetam o status de estoque - não provêm de estoque
                    // Por padrão, mantemos 'COMPLETO' - será revalidado quando necessário na ordem de serviço
                    statusEstoque: 'COMPLETO'
                }),
                ...(items !== undefined && {
                    items: {
                        create: items.map(item => {
                            const hasMaterial = !!item.materialId;
                            const hasChildKit = !!item.kitFilhoId;
                            if (hasMaterial === hasChildKit) {
                                throw new Error('Cada item do kit deve ter exatamente um: materialId OU kitFilhoId');
                            }
                            return {
                                materialId: item.materialId ?? null,
                                kitFilhoId: item.kitFilhoId ?? null,
                                quantidade: item.quantidade
                            };
                        })
                    }
                })
            },
            include: {
                ...this.kitIncludeBase
            }
        });

        const totalItens = kit.items.length + (itensBancoFrio?.length || 0);
        const cotacoes = itensBancoFrio?.filter(i => i.tipo === 'COTACAO').length || 0;
        const servicos = itensBancoFrio?.filter(i => i.tipo === 'SERVICO').length || 0;
        console.log(`✅ Kit atualizado: ${kit.nome} (${kit.items.length} em estoque, ${cotacoes} banco frio, ${servicos} serviços, total: ${totalItens})`);
        return kit;
    }

    /**
     * Deleta um kit
     */
    static async deletar(id: string) {
        // Prisma vai deletar os KitItems automaticamente devido ao onDelete: Cascade
        await prisma.kit.delete({
            where: { id }
        });

        console.log(`🗑️ Kit deletado: ${id}`);
    }

    /**
     * Lista kits por tipo
     */
    static async listarPorTipo(tipo: string) {
        const kits = await prisma.kit.findMany({
            where: { tipo, ativo: true },
            include: {
                ...this.kitIncludeBase
            },
            orderBy: {
                nome: 'asc'
            }
        });

        return kits;
    }
}

