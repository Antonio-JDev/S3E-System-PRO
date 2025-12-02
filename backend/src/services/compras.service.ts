import { PrismaClient } from '@prisma/client';
import { EstoqueService } from './estoque.service';
import { ContasPagarService } from './contasPagar.service';
import { classificarMaterialPorNome } from '../utils/materialClassifier';

const prisma = new PrismaClient();

export interface CompraItemPayload {
    materialId?: string;
    nomeProduto: string;
    ncm?: string;
    quantidade: number;
    valorUnit: number;
}

export interface CompraPayload {
    fornecedorNome: string;
    fornecedorCNPJ: string;
    fornecedorTel?: string;
    numeroNF: string;
    dataEmissaoNF: Date;
    dataCompra: Date;
    dataRecebimento?: Date;
    valorFrete?: number;
    outrasDespesas?: number;
    status: string; // Pendente, Recebido, Cancelado
    items: CompraItemPayload[];
    observacoes?: string;
    // Campos financeiros adicionais (XML ou preenchimento manual)
    valorIPI?: number;
    valorTotalProdutos?: number;
    valorTotalNota?: number;
    duplicatas?: Array<{ numero: string; dataVencimento: string; valor: number }>;
    statusImportacao?: 'MANUAL' | 'XML';
    // Campos para gerar contas a pagar (fallback quando não há duplicatas)
    condicoesPagamento?: string;
    parcelas?: number;
    dataPrimeiroVencimento?: Date;
}

export class ComprasService {
    /**
     * Registra uma compra completa com integração de estoque e contas a pagar
     */
    static async registrarCompra(data: CompraPayload) {
        const {
            fornecedorNome,
            fornecedorCNPJ,
            fornecedorTel,
            numeroNF,
            dataEmissaoNF,
            dataCompra,
            dataRecebimento,
            valorFrete = 0,
            outrasDespesas = 0,
            status,
            items,
            observacoes,
            valorIPI = 0,
            valorTotalProdutos,
            valorTotalNota,
            duplicatas,
            statusImportacao,
            condicoesPagamento,
            parcelas,
            dataPrimeiroVencimento
        } = data;

        // Validações
        if (!items || items.length === 0) {
            throw new Error('Compra deve ter pelo menos um item');
        }

        if (!numeroNF) {
            throw new Error('Número da NF é obrigatório');
        }

        // Buscar ou criar fornecedor (garantir que CNPJ seja string)
        const cnpjString = String(fornecedorCNPJ);
        let fornecedor = await prisma.fornecedor.findUnique({
            where: { cnpj: cnpjString }
        });

        if (!fornecedor) {
            fornecedor = await prisma.fornecedor.create({
                data: {
                    nome: fornecedorNome,
                    cnpj: cnpjString,
                    telefone: fornecedorTel || null
                }
            });
        }

        // Calcular valores básicos
        const valorSubtotal = items.reduce(
            (sum, item) => sum + (item.quantidade * item.valorUnit),
            0
        );

        // Preferência de cálculo:
        // 1) Se vier valorTotalNota do XML, confiar nele
        // 2) Caso contrário, somar subtotal + frete + outras + IPI (se houver)
        let valorTotal = valorTotalNota && valorTotalNota > 0
            ? valorTotalNota
            : valorSubtotal + valorFrete + outrasDespesas + (valorIPI || 0);

        // Usar transação para garantir consistência
        return await prisma.$transaction(async (tx) => {
            // 0. CRIAR MATERIALS AUTOMATICAMENTE para itens novos
            console.log('🔍 Processando items da compra...');
            const itemsComMaterialId: Array<{
                materialId: string;
                nomeProduto: string;
                ncm: string | null;
                quantidade: number;
                valorUnit: number;
                valorTotal: number;
            }> = [];
            
            for (const item of items) {
                let materialId = item.materialId;
                
                // Se não tem materialId, criar ou buscar Material
                if (!materialId) {
                    console.log(`🆕 Item sem materialId: "${item.nomeProduto}". Criando Material...`);
                    
                    // Tentar encontrar material existente pelo NCM ou nome
                    let material: { id: string; preco: number | null } | null = null;
                    if (item.ncm) {
                        material = await tx.material.findFirst({
                            where: { sku: String(item.ncm) }
                        });
                    }
                    
                    if (!material) {
                        material = await tx.material.findFirst({
                            where: { 
                                descricao: { 
                                    contains: item.nomeProduto.substring(0, 20), 
                                    mode: 'insensitive' 
                                } 
                            }
                        });
                    }
                    
                    // Se não encontrou, CRIAR novo Material
                    if (!material) {
                        console.log(`✨ Criando novo Material: "${item.nomeProduto}"`);
                        // Gerar SKU único (timestamp + random para garantir unicidade)
                        const timestamp = Date.now();
                        const random = Math.random().toString(36).substr(2, 9);
                        const skuGerado = item.ncm ? `NCM-${item.ncm}-${random}` : `AUTO-${timestamp}-${random}`;
                        
                        // Classificar categoria automaticamente baseado no nome do produto
                        const categoriaClassificada = classificarMaterialPorNome(item.nomeProduto, item.ncm || undefined);
                        
                        material = await tx.material.create({
                            data: {
                                nome: item.nomeProduto, // ✅ Nome real do produto do XML
                                sku: skuGerado, // ✅ SKU único gerado
                                tipo: 'Material Elétrico', // ✅ Tipo padrão
                                categoria: categoriaClassificada, // ✅ Categoria classificada automaticamente
                                descricao: item.nomeProduto, // ✅ Usar nome do produto ao invés de texto genérico
                                ncm: item.ncm ? String(item.ncm) : null, // ✅ NCM do XML (dado fiscal importante) - sempre string
                                unidadeMedida: 'un',
                                preco: item.valorUnit,
                                estoque: 0, // Será atualizado depois se status = Recebido
                                estoqueMinimo: 5,
                                localizacao: 'Almoxarifado', // ✅ Localização padrão
                                fornecedorId: fornecedor.id,
                                ativo: true
                            }
                        });
                        console.log(`✅ Material criado: ${material.id} (SKU: ${skuGerado})`);
                    } else {
                        console.log(`🔗 Material existente encontrado: ${material.id}`);
                        // Atualizar preço se o novo for diferente
                        if (material.preco !== null && material.preco !== item.valorUnit) {
                            await tx.material.update({
                                where: { id: material.id },
                                data: {
                                    preco: item.valorUnit, // Atualizar com o preço mais recente
                                    fornecedorId: fornecedor.id // Atualizar fornecedor
                                }
                            });
                            console.log(`💰 Preço atualizado: R$ ${material.preco} → R$ ${item.valorUnit}`);
                        } else if (material.preco === null) {
                            // Se o material não tinha preço, atualizar
                            await tx.material.update({
                                where: { id: material.id },
                                data: {
                                    preco: item.valorUnit,
                                    fornecedorId: fornecedor.id
                                }
                            });
                            console.log(`💰 Preço definido: R$ ${item.valorUnit}`);
                        }
                    }
                    
                    if (!material) {
                        throw new Error(`Não foi possível criar ou encontrar material para: ${item.nomeProduto}`);
                    }
                    
                    materialId = material.id;
                }
                
                if (materialId) {
                    itemsComMaterialId.push({
                        materialId,
                        nomeProduto: item.nomeProduto,
                        ncm: item.ncm ? String(item.ncm) : null,
                        quantidade: item.quantidade,
                        valorUnit: item.valorUnit,
                        valorTotal: item.quantidade * item.valorUnit
                    });
                }
            }
            
            // 1. Criar compra com items (agora todos com materialId)
            // Montar metadados financeiros/duplicatas para auditoria (xmlData)
            const xmlMeta: any = {
                valorSubtotal,
                valorFrete,
                outrasDespesas,
                valorIPI: valorIPI || 0,
                valorTotalProdutos: valorTotalProdutos ?? valorSubtotal,
                valorTotalNota: valorTotal,
                duplicatas: duplicatas || [],
                statusImportacao: statusImportacao || 'MANUAL',
                // Guardar também informações de pagamento para gerar contas a pagar somente no recebimento
                condicoesPagamento: condicoesPagamento || null,
                parcelas: parcelas || null,
                dataPrimeiroVencimento: dataPrimeiroVencimento || null
            };

            const compra = await tx.compra.create({
                data: {
                    fornecedorId: fornecedor.id,
                    fornecedorNome,
                    fornecedorCNPJ: cnpjString,
                    fornecedorTel: fornecedorTel || null,
                    numeroNF: String(numeroNF),
                    dataEmissaoNF,
                    dataCompra,
                    dataRecebimento: dataRecebimento || null,
                    valorSubtotal,
                    valorFrete,
                    outrasDespesas,
                    valorTotal,
                    status,
                    observacoes,
                    xmlData: JSON.stringify(xmlMeta),
                    items: {
                        create: itemsComMaterialId
                    }
                },
                include: {
                    items: true,
                    fornecedor: true
                }
            });
            
            console.log(`✅ Compra criada com ${compra.items.length} itens`);

            // ✅ CORREÇÃO: NÃO atualizar estoque automaticamente ao criar compra
            // O estoque só deve ser atualizado quando o usuário confirmar o recebimento
            // através do botão "Receber Remessa" na interface
            console.log('💤 Compra criada - estoque será atualizado quando o usuário confirmar o recebimento.');
            console.log(`📋 Status da compra: ${status}`);

            // 3. Contas a pagar
            // ⚠️ NOVO COMPORTAMENTO:
            // As duplicatas / parcelas NÃO geram mais contas a pagar automaticamente aqui.
            // ✅ As contas a pagar e o estoque só serão atualizados quando o usuário
            // confirmar o recebimento através do botão "Receber Remessa"
            console.log('💤 Compra criada - contas a pagar e estoque serão processados ao confirmar recebimento.');

            return {
                compra,
                contasPagar: null,
                estoqueAtualizado: false // Sempre false na criação
            };
        });
    }

    /**
     * Gera contas a pagar para uma compra que foi marcada como "Recebido",
     * utilizando as duplicatas ou condições de pagamento salvas em xmlData.
     * Só gera se ainda não existirem contas vinculadas a essa compra.
     */
    static async gerarContasPagarAoReceberCompra(id: string) {
        // Verificar se já existem contas a pagar vinculadas a esta compra
        const contasExistentes = await prisma.contaPagar.count({
            where: { compraId: id }
        });

        if (contasExistentes > 0) {
            console.log(`💰 Já existem ${contasExistentes} conta(s) a pagar para a compra ${id}. Nada a fazer.`);
            return;
        }

        const compra = await prisma.compra.findUnique({
            where: { id }
        });

        if (!compra) {
            console.warn(`⚠️ Não foi possível gerar contas a pagar: compra ${id} não encontrada.`);
            return;
        }

        // Somente gerar contas a pagar se a compra estiver com status "Recebido"
        if (compra.status !== 'Recebido') {
            console.log(`💤 Compra ${id} com status "${compra.status}" - contas a pagar serão geradas apenas ao receber.`);
            return;
        }

        // Recuperar metadados financeiros/duplicatas do xmlData
        let xmlMeta: any = null;
        if (compra.xmlData) {
            try {
                xmlMeta = JSON.parse(compra.xmlData);
            } catch (err) {
                console.error('❌ Erro ao parsear xmlData da compra para gerar contas a pagar:', err);
            }
        }

        const duplicatas = xmlMeta?.duplicatas || [];
        const condicoesPagamento = xmlMeta?.condicoesPagamento || undefined;
        const parcelas = xmlMeta?.parcelas || undefined;
        const dataPrimeiroVencimentoRaw = xmlMeta?.dataPrimeiroVencimento || undefined;
        const dataPrimeiroVencimento = dataPrimeiroVencimentoRaw ? new Date(dataPrimeiroVencimentoRaw) : undefined;
        const valorTotalNota = xmlMeta?.valorTotalNota ?? compra.valorTotal ?? compra.valorSubtotal;

        let contasPagar: any = null;

        if (duplicatas && Array.isArray(duplicatas) && duplicatas.length > 0) {
            console.log(`💰 (Recebimento) Gerando contas a pagar a partir de duplicatas para compra NF ${compra.numeroNF}`);
            contasPagar = await ContasPagarService.criarContasPagarPorDuplicatas({
                fornecedorId: compra.fornecedorId,
                compraId: compra.id,
                descricao: `Compra NF ${compra.numeroNF} - ${compra.fornecedorNome}`,
                duplicatas,
                observacoes: condicoesPagamento
            });
        } else if (parcelas && parcelas > 0 && valorTotalNota && dataPrimeiroVencimento) {
            console.log(`💰 (Recebimento) Gerando ${parcelas} conta(s) a pagar para compra NF ${compra.numeroNF}`);
            contasPagar = await ContasPagarService.criarContasPagarParceladas({
                fornecedorId: compra.fornecedorId,
                compraId: compra.id,
                descricao: `Compra NF ${compra.numeroNF} - ${compra.fornecedorNome}`,
                valorTotal: valorTotalNota,
                parcelas,
                dataPrimeiroVencimento,
                observacoes: condicoesPagamento
            });
        } else {
            console.warn(`⚠️ (Recebimento) Nenhuma conta a pagar gerada para compra ${id} - sem duplicatas ou dados de parcelamento suficientes.`);
        }

        return contasPagar;
    }

    /**
     * Busca uma compra específica por ID
     */
    static async buscarCompra(id: string) {
        try {
            const compra = await prisma.compra.findUnique({
                where: { id },
                include: {
                    fornecedor: {
                        select: {
                            id: true,
                            nome: true,
                            cnpj: true,
                            telefone: true,
                            email: true,
                            endereco: true
                        }
                    },
                    items: {
                        include: {
                            material: {
                                select: {
                                    id: true,
                                    nome: true,
                                    sku: true,
                                    categoria: true
                                }
                            }
                        }
                    }
                }
            });

            if (!compra) {
                throw new Error('Compra não encontrada');
            }

            return compra;
        } catch (error) {
            console.error('Erro ao buscar compra:', error);
            throw error;
        }
    }

    /**
     * Lista compras com filtros
     */
    static async listarCompras(
        status?: string,
        fornecedorId?: string,
        dataInicio?: Date,
        dataFim?: Date,
        page: number = 1,
        limit: number = 10
    ) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (fornecedorId) {
            where.fornecedorId = fornecedorId;
        }

        if (dataInicio || dataFim) {
            where.dataCompra = {};
            if (dataInicio) {
                where.dataCompra.gte = dataInicio;
            }
            if (dataFim) {
                where.dataCompra.lte = dataFim;
            }
        }

        const [compras, total] = await Promise.all([
            prisma.compra.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dataCompra: 'desc' },
                include: {
                    fornecedor: {
                        select: {
                            id: true,
                            nome: true,
                            cnpj: true,
                            telefone: true
                        }
                    },
                    items: true
                }
            }),
            prisma.compra.count({ where })
        ]);

        return {
            compras,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }


    /**
     * Atualiza status da compra
     * Se mudar para "Recebido", atualiza estoque
     */
    static async atualizarStatusCompra(id: string, novoStatus: string) {
        const compra = await prisma.compra.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!compra) {
            throw new Error('Compra não encontrada');
        }

        // Se mudou para Recebido e antes não estava, atualizar estoque
        const deveAtualizarEstoque = novoStatus === 'Recebido' && compra.status !== 'Recebido';

        const resultado = await prisma.$transaction(async (tx) => {
            // Atualizar compra
            const compraAtualizada = await tx.compra.update({
                where: { id },
                data: {
                    status: novoStatus,
                    dataRecebimento: novoStatus === 'Recebido' ? new Date() : compra.dataRecebimento
                },
                include: { items: true, fornecedor: true }
            });

            // Atualizar estoque se necessário
            if (deveAtualizarEstoque) {
                console.log('📦 Mudança para "Recebido" - Criando Materials e dando entrada no estoque...');
                
                for (const item of compra.items) {
                    let materialIdFinal = item.materialId;
                    
                    // Se item não tem materialId, criar Material automaticamente
                    if (!materialIdFinal) {
                        console.log(`🆕 Item sem material vinculado: "${item.nomeProduto}". Criando...`);
                        
                        // Tentar encontrar material existente
                        let material: { id: string } | null = null;
                        if (item.ncm) {
                            material = await tx.material.findFirst({
                                where: { sku: String(item.ncm) }
                            });
                        }
                        
                        if (!material) {
                            material = await tx.material.findFirst({
                                where: { 
                                    descricao: { 
                                        contains: item.nomeProduto.substring(0, 20), 
                                        mode: 'insensitive' 
                                    } 
                                }
                            });
                        }
                        
                        // Criar novo Material se não encontrou
                        if (!material) {
                            // Gerar SKU único (timestamp + random para garantir unicidade)
                            const timestamp = Date.now();
                            const random = Math.random().toString(36).substr(2, 9);
                            const skuGerado = item.ncm ? `NCM-${item.ncm}-${random}` : `AUTO-${timestamp}-${random}`;
                            
                            // Classificar categoria automaticamente baseado no nome do produto
                            const categoriaClassificada = classificarMaterialPorNome(item.nomeProduto, item.ncm || undefined);
                            
                            material = await tx.material.create({
                                data: {
                                    nome: item.nomeProduto, // ✅ Campo obrigatório
                                    sku: skuGerado, // ✅ Campo obrigatório e único
                                    tipo: 'Produto', // ✅ Campo obrigatório
                                    categoria: categoriaClassificada, // ✅ Categoria classificada automaticamente
                                    descricao: `Produto importado via XML - NF ${compra.numeroNF}`,
                                    ncm: item.ncm ? String(item.ncm) : null, // ✅ NCM do XML - sempre string
                                    unidadeMedida: 'UN',
                                    preco: item.valorUnit,
                                    estoque: 0,
                                    estoqueMinimo: 5,
                                    ativo: true
                                }
                            });
                            console.log(`✅ Material criado: ${material.id} (SKU: ${skuGerado})`);
                        }
                        
                        if (!material) {
                            throw new Error(`Não foi possível criar ou encontrar material para: ${item.nomeProduto}`);
                        }
                        
                        materialIdFinal = material.id;
                        
                        // Atualizar CompraItem com o materialId
                        await tx.compraItem.update({
                            where: { id: item.id },
                            data: { materialId: material.id }
                        });
                    }
                    
                    // Dar entrada no estoque
                    if (materialIdFinal) {
                        await EstoqueService.incrementarEstoque(
                            materialIdFinal,
                            item.quantidade,
                            'COMPRA',
                            id,
                            `Compra NF: ${compra.numeroNF} - Recebimento confirmado`
                        );
                    }
                }
                
                console.log('✅ Todos os Materials criados e estoque atualizado!');
            }

            return compraAtualizada;
        });

        // Após a transação, se a compra passou a ficar como "Recebido",
        // gerar contas a pagar (se ainda não existirem) usando as duplicatas/condições salvas em xmlData
        if (novoStatus === 'Recebido') {
            await ComprasService.gerarContasPagarAoReceberCompra(id);
        }

        return resultado;
    }

    /**
     * Receber remessa parcial (apenas itens específicos)
     */
    static async receberRemessaParcial(
        id: string,
        novoStatus: string,
        produtoIds: string[],
        dataRecebimento?: Date
    ) {
        const compra = await prisma.compra.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!compra) {
            throw new Error('Compra não encontrada');
        }

        // Se mudou para Recebido, processar apenas os itens marcados
        const deveAtualizarEstoque = novoStatus === 'Recebido' && compra.status !== 'Recebido';

        const resultado = await prisma.$transaction(async (tx) => {
            // Atualizar compra (mantém pendente se ainda há itens não recebidos)
            const todosRecebidos = produtoIds.length === compra.items.length;
            const dataRecebimentoParaSalvar = deveAtualizarEstoque
                ? (dataRecebimento ?? new Date())
                : compra.dataRecebimento;
            
            console.log(`📅 Salvando dataRecebimento: ${dataRecebimentoParaSalvar?.toISOString()} (${dataRecebimentoParaSalvar?.toLocaleDateString('pt-BR')})`);
            
            const compraAtualizada = await tx.compra.update({
                where: { id },
                data: {
                    status: todosRecebidos ? novoStatus : 'Pendente',
                    dataRecebimento: dataRecebimentoParaSalvar
                },
                include: { items: true, fornecedor: true }
            });
            
            console.log(`📅 Data salva no banco: ${compraAtualizada.dataRecebimento?.toISOString()} (${compraAtualizada.dataRecebimento?.toLocaleDateString('pt-BR')})`);

            // Atualizar estoque apenas dos itens marcados
            if (deveAtualizarEstoque) {
                console.log('📦 Recebendo itens parciais - Processando estoque...');
                console.log('📦 Produtos selecionados:', produtoIds);
                console.log('📦 Total de itens na compra:', compra.items.length);
                console.log('📦 Status da compra:', compra.status);
                console.log('📦 Novo status:', novoStatus);
                
                // ✅ CORREÇÃO: Filtrar pelos IDs dos CompraItem, não pelos materialIds
                // Isso permite processar itens sem materialId (que serão criados automaticamente)
                const itensSelecionados = compra.items.filter(item => 
                    produtoIds.includes(item.id)
                );
                
                console.log(`📦 ${itensSelecionados.length} de ${compra.items.length} itens serão processados`);
                console.log(`📦 IDs dos itens selecionados:`, produtoIds);
                
                if (itensSelecionados.length === 0) {
                    console.error('❌ ERRO: Nenhum item foi selecionado para processamento!');
                    console.error('❌ IDs recebidos:', produtoIds);
                    console.error('❌ IDs disponíveis:', compra.items.map(i => i.id));
                }
                
                for (const item of itensSelecionados) {
                    let materialIdFinal = item.materialId;
                    
                    // Se item não tem materialId, criar Material automaticamente
                    if (!materialIdFinal) {
                        console.log(`🆕 Item sem material vinculado: "${item.nomeProduto}". Criando...`);
                        
                        // Tentar encontrar material existente
                        let material: { id: string } | null = null;
                        if (item.ncm) {
                            material = await tx.material.findFirst({
                                where: { sku: String(item.ncm) }
                            });
                        }
                        
                        if (!material) {
                            material = await tx.material.findFirst({
                                where: { 
                                    descricao: { 
                                        contains: item.nomeProduto.substring(0, 20), 
                                        mode: 'insensitive' 
                                    } 
                                }
                            });
                        }
                        
                        // Criar novo Material se não encontrou
                        if (!material) {
                            const timestamp = Date.now();
                            const random = Math.random().toString(36).substr(2, 9);
                            const skuGerado = item.ncm ? `NCM-${item.ncm}-${random}` : `AUTO-${timestamp}-${random}`;
                            
                            // Classificar categoria automaticamente baseado no nome do produto
                            const categoriaClassificada = classificarMaterialPorNome(item.nomeProduto, item.ncm || undefined);
                            
                            material = await tx.material.create({
                                data: {
                                    nome: item.nomeProduto,
                                    sku: skuGerado,
                                    tipo: 'Produto',
                                    categoria: categoriaClassificada, // ✅ Categoria classificada automaticamente
                                    descricao: `Produto importado via XML - NF ${compra.numeroNF}`,
                                    ncm: item.ncm ? String(item.ncm) : null,
                                    unidadeMedida: 'UN',
                                    preco: item.valorUnit,
                                    estoque: 0,
                                    estoqueMinimo: 5,
                                    ativo: true
                                }
                            });
                            console.log(`✅ Material criado: ${material.id} (SKU: ${skuGerado})`);
                        }
                        
                        if (!material) {
                            throw new Error(`Não foi possível criar ou encontrar material para: ${item.nomeProduto}`);
                        }
                        
                        materialIdFinal = material.id;
                        
                        // Atualizar CompraItem com o materialId
                        await tx.compraItem.update({
                            where: { id: item.id },
                            data: { materialId: material.id }
                        });
                    }
                    
                    // ✅ CORREÇÃO: Dar entrada no estoque usando a transação existente
                    if (materialIdFinal) {
                        // Buscar material atual para verificar estoque antes
                        const materialAtual = await tx.material.findUnique({
                            where: { id: materialIdFinal },
                            select: { estoque: true, nome: true }
                        });
                        
                        const estoqueAnterior = materialAtual?.estoque || 0;
                        console.log(`📦 Material: ${materialAtual?.nome || materialIdFinal}`);
                        console.log(`📦 Estoque anterior: ${estoqueAnterior}, Quantidade a adicionar: ${item.quantidade}`);
                        
                        // Incrementar estoque diretamente na transação
                        const materialAtualizado = await tx.material.update({
                            where: { id: materialIdFinal },
                            data: {
                                estoque: {
                                    increment: item.quantidade
                                }
                            },
                            select: { estoque: true, nome: true }
                        });
                        
                        console.log(`✅ Estoque atualizado: ${estoqueAnterior} → ${materialAtualizado.estoque} (adicionado ${item.quantidade})`);
                        
                        // Registrar movimentação
                        await tx.movimentacaoEstoque.create({
                            data: {
                                materialId: materialIdFinal,
                                tipo: 'ENTRADA',
                                quantidade: item.quantidade,
                                motivo: 'COMPRA',
                                referencia: id,
                                observacoes: `Compra NF: ${compra.numeroNF} - Recebimento parcial confirmado`
                            }
                        });
                        
                        console.log(`✅ Movimentação registrada para material ${materialIdFinal}`);
                    } else {
                        console.error(`❌ materialIdFinal é null para item: ${item.nomeProduto}`);
                    }
                    
                    console.log(`✅ Item ${item.nomeProduto} processado no estoque`);
                    
                    // 🔍 VERIFICAR SE HÁ PROJETOS BLOQUEADOS ESPERANDO ESTE MATERIAL
                    const projetosBloqueados = await tx.projeto.findMany({
                        where: {
                            status: 'PROPOSTA', // Projetos em PROPOSTA podem ter items frios
                            orcamento: {
                                items: {
                                    some: {
                                        materialId: materialIdFinal,
                                        tipo: 'MATERIAL'
                                    }
                                }
                            }
                        },
                        include: {
                            orcamento: {
                                include: {
                                    items: {
                                        include: {
                                            material: true
                                        }
                                    }
                                }
                            }
                        }
                    });

                    if (projetosBloqueados.length > 0) {
                        console.log(`📢 Material ${item.nomeProduto} desbloqueou ${projetosBloqueados.length} projeto(s)!`);
                        // Nota: Projeto não possui campo observacoes no schema
                    }
                }
                
                console.log('✅ Remessa parcial processada!');
            }

            return compraAtualizada;
        });

        // Se após o processamento a compra passou a ser considerada "Recebida",
        // gerar contas a pagar (se ainda não existirem)
        if (resultado.status === 'Recebido') {
            await ComprasService.gerarContasPagarAoReceberCompra(id);
        }

        return resultado;
    }

    /**
     * Receber compra com associações explícitas de materiais
     * Previne criação de duplicatas ao permitir que o usuário associe a materiais existentes
     */
    static async receberComAssociacoes(
        id: string, 
        associacoes: { [compraItemId: string]: { materialId?: string; criarNovo?: boolean; nomeMaterial?: string } },
        dataRecebimento: Date = new Date()
    ) {
        const compra = await prisma.compra.findUnique({
            where: { id },
            include: { items: true, fornecedor: true }
        });

        if (!compra) {
            throw new Error('Compra não encontrada');
        }

        console.log(`📦 Recebendo compra ${compra.numeroNF} com associações explícitas`);

        const resultado = await prisma.$transaction(async (tx) => {
            // Processar cada item da compra
            for (const item of compra.items) {
                const associacao = associacoes[item.id];

                if (!associacao) {
                    console.log(`⚠️ Item "${item.nomeProduto}" sem associação definida - pulando`);
                    continue;
                }

                let materialIdFinal = item.materialId;

                // Se usuário optou por criar novo material
                if (associacao.criarNovo) {
                    console.log(`🆕 Criando novo material para: "${item.nomeProduto}"`);
                    
                    const timestamp = Date.now();
                    const random = Math.random().toString(36).substr(2, 9);
                    const skuGerado = item.ncm ? `NCM-${item.ncm}-${random}` : `AUTO-${timestamp}-${random}`;

                    // Classificar categoria automaticamente baseado no nome do produto
                    const nomeMaterial = associacao.nomeMaterial || item.nomeProduto;
                    const categoriaClassificada = classificarMaterialPorNome(nomeMaterial, item.ncm || undefined);

                    const novoMaterial = await tx.material.create({
                        data: {
                            nome: nomeMaterial,
                            sku: skuGerado,
                            tipo: 'Material Elétrico',
                            categoria: categoriaClassificada, // ✅ Categoria classificada automaticamente
                            descricao: nomeMaterial,
                            ncm: item.ncm ? String(item.ncm) : null, // ✅ NCM do XML - sempre string
                            unidadeMedida: 'un',
                            preco: item.valorUnit,
                            estoque: 0,
                            estoqueMinimo: 5,
                            localizacao: 'Almoxarifado',
                            fornecedorId: compra.fornecedorId,
                            ativo: true
                        }
                    });

                    materialIdFinal = novoMaterial.id;
                    console.log(`✅ Novo material criado: ${novoMaterial.id}`);
                }
                // Se usuário escolheu associar a material existente
                else if (associacao.materialId) {
                    console.log(`🔗 Associando "${item.nomeProduto}" ao material existente: ${associacao.materialId}`);
                    materialIdFinal = associacao.materialId;

                    // Atualizar preço do material se for diferente
                    const materialExistente = await tx.material.findUnique({
                        where: { id: associacao.materialId }
                    });

                    if (materialExistente && materialExistente.preco !== item.valorUnit) {
                        await tx.material.update({
                            where: { id: associacao.materialId },
                            data: {
                                preco: item.valorUnit,
                                fornecedorId: compra.fornecedorId
                            }
                        });
                        console.log(`💰 Preço atualizado: R$ ${materialExistente.preco} → R$ ${item.valorUnit}`);
                    }
                }

                // Atualizar CompraItem com o materialId definitivo
                if (materialIdFinal && materialIdFinal !== item.materialId) {
                    await tx.compraItem.update({
                        where: { id: item.id },
                        data: { materialId: materialIdFinal }
                    });
                }

                // Dar entrada no estoque
                if (materialIdFinal) {
                    await EstoqueService.incrementarEstoque(
                        materialIdFinal,
                        item.quantidade,
                        'COMPRA',
                        id,
                        `Compra NF: ${compra.numeroNF} - ${item.nomeProduto}`
                    );
                    console.log(`✅ Entrada no estoque: ${item.nomeProduto} - Qtd: ${item.quantidade}`);
                }
            }

            // Atualizar status da compra
            const compraAtualizada = await tx.compra.update({
                where: { id },
                data: {
                    status: 'Recebido',
                    dataRecebimento
                },
                include: { items: true, fornecedor: true }
            });

            console.log('✅ Compra recebida com sucesso com todas as associações!');
            return compraAtualizada;
        });
    }

    /**
     * Cancela uma compra
     */
    static async cancelarCompra(id: string) {
        const compra = await prisma.compra.findUnique({
            where: { id }
        });

        if (!compra) {
            throw new Error('Compra não encontrada');
        }

        if (compra.status === 'Recebido') {
            throw new Error('Não é possível cancelar uma compra já recebida. Faça uma devolução.');
        }

        return await prisma.compra.update({
            where: { id },
            data: {
                status: 'Cancelado',
                updatedAt: new Date()
            }
        });
    }

    /**
     * Busca compras de um fornecedor
     */
    static async getComprasPorFornecedor(fornecedorId: string) {
        return await prisma.compra.findMany({
            where: { fornecedorId },
            orderBy: { dataCompra: 'desc' },
            include: {
                items: true
            }
        });
    }

    /**
     * Busca total de compras por período
     */
    static async getTotalComprasPorPeriodo(dataInicio: Date, dataFim: Date) {
        const resultado = await prisma.compra.aggregate({
            where: {
                dataCompra: {
                    gte: dataInicio,
                    lte: dataFim
                },
                status: {
                    not: 'Cancelado'
                }
            },
            _sum: {
                valorTotal: true
            },
            _count: true
        });

        return {
            totalCompras: resultado._count,
            valorTotal: resultado._sum.valorTotal || 0
        };
    }
}

