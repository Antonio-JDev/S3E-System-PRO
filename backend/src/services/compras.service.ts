import { prisma } from '../lib/prisma';
import type { DestinoCompraAvulsa } from '@prisma/client';
import { EstoqueService } from './estoque.service';
import { ContasPagarService } from './contasPagar.service';
import { ReservaMaterialProjetoService } from './reservaMaterialProjeto.service';
import { classificarMaterialPorNome } from '../utils/materialClassifier';
import { gerarSKUUnico } from '../utils/skuGenerator';
import {
    matchMaterial,
    upsertAlias,
    normalizarEan,
    normalizarCodigoFornecedor,
} from './materialFornecedorAlias.service';

export interface CompraItemPayload {
    materialId?: string;
    nomeProduto: string;
    ncm?: string;
    quantidade: number; // Quantidade de embalagens
    valorUnit: number; // Preço por embalagem
    unidadeMedida?: string; // Unidade de medida do produto (ex: 'un', 'm', 'kg')
    codigoFornecedor?: string;
    sku?: string;
    ean?: string;
    /** Só cria Material novo quando o usuário confirma que o item ainda não existe no estoque */
    criarNovoMaterial?: boolean;
    // Campos de fracionamento
    quantidadeFracionada?: number; // Quantidade de unidades por embalagem
    tipoEmbalagem?: string; // "CAIXA", "PACOTE", etc.
    unidadeEmbalagem?: string; // "cx", "pct", etc.
    /** false = item segue destinoTipo da compra (obra/OS); true = apenas estoque */
    destinoEstoque?: boolean;
}

function identificadoresItemNf(item: CompraItemPayload) {
    return {
        codigoFornecedor: normalizarCodigoFornecedor(item.codigoFornecedor || item.sku),
        ean: normalizarEan(item.ean),
    };
}

async function aprenderAlias(
    tx: any,
    params: {
        materialId: string;
        fornecedorId: string;
        nomeProduto: string;
        codigoFornecedor?: string | null;
        ean?: string | null;
        ncm?: string | null;
        origem?: string;
    }
) {
    await upsertAlias(tx, {
        materialId: params.materialId,
        fornecedorId: params.fornecedorId,
        nomeOriginal: params.nomeProduto,
        codigoFornecedor: params.codigoFornecedor,
        ean: params.ean,
        ncm: params.ncm,
        origem: params.origem || 'IMPORTACAO',
    });
}

async function criarMaterialCanonico(
    tx: any,
    params: {
        nomeProduto: string;
        ncm?: string | null;
        valorUnit: number;
        fornecedorId: string;
        temFracionamento?: boolean;
        quantidadeFracionada?: number;
        tipoEmbalagem?: string;
        precoUnitarioCalculado?: number | null;
        precoEmbalagem?: number | null;
        numeroNF?: string;
    }
) {
    const skuGerado = await gerarSKUUnico(tx, params.ncm || null);
    const categoriaClassificada = classificarMaterialPorNome(params.nomeProduto, params.ncm || undefined);
    const materialData: any = {
        nome: params.nomeProduto,
        sku: skuGerado,
        tipo: 'Material Elétrico',
        categoria: categoriaClassificada,
        descricao: params.nomeProduto,
        ncm: params.ncm ? String(params.ncm) : null,
        unidadeMedida: 'un',
        preco: params.temFracionamento ? params.precoUnitarioCalculado : params.valorUnit,
        estoque: 0,
        estoqueMinimo: 5,
        localizacao: 'Almoxarifado',
        fornecedorId: params.fornecedorId,
        ativo: true,
    };
    if (params.temFracionamento) {
        materialData.quantidadePorEmbalagem = params.quantidadeFracionada;
        materialData.tipoEmbalagem = params.tipoEmbalagem || 'CAIXA';
        materialData.precoEmbalagem = params.precoEmbalagem;
        materialData.precoUnitario = params.precoUnitarioCalculado;
    }
    return tx.material.create({ data: materialData });
}

async function resolverMaterialNoRecebimento(
    tx: any,
    item: {
        id: string;
        materialId?: string | null;
        nomeProduto: string;
        ncm?: string | null;
        codigoFornecedor?: string | null;
        ean?: string | null;
    },
    fornecedorId: string,
): Promise<string> {
    if (item.materialId) {
        await aprenderAlias(tx, {
            materialId: item.materialId,
            fornecedorId,
            nomeProduto: item.nomeProduto,
            codigoFornecedor: item.codigoFornecedor,
            ean: item.ean,
            ncm: item.ncm,
            origem: 'IMPORTACAO',
        });
        return item.materialId;
    }

    const match = await matchMaterial(tx, {
        fornecedorId,
        nomeProduto: item.nomeProduto,
        codigoFornecedor: item.codigoFornecedor,
        ean: item.ean,
    });
    if (!match) {
        throw new Error(
            `Item "${item.nomeProduto}" não está vinculado ao estoque. Vincule a um material existente ou marque como item novo antes de receber.`
        );
    }

    await tx.compraItem.update({
        where: { id: item.id },
        data: { materialId: match.material.id },
    });
    await aprenderAlias(tx, {
        materialId: match.material.id,
        fornecedorId,
        nomeProduto: item.nomeProduto,
        codigoFornecedor: item.codigoFornecedor,
        ean: item.ean,
        ncm: item.ncm,
        origem: 'IMPORTACAO',
    });
    return match.material.id;
}

export interface CompraPayload {
    fornecedorNome: string;
    fornecedorCNPJ: string;
    fornecedorTel?: string;
    numeroNF: string;
    serieNF?: string; // Série da Nota Fiscal (ex: "1", "2", etc.)
    dataEmissaoNF: Date;
    dataCompra: Date;
    dataRecebimento?: Date;
    valorFrete?: number;
    outrasDespesas?: number;
    /** Desconto em R$ sobre o subtotal dos produtos (não ultrapassa o subtotal) */
    valorDesconto?: number;
    status: string; // Pendente, Recebido, Cancelado
    classificacao?: 'COMPOSICAO_ESTOQUE' | 'FERRAMENTAS' | 'RECURSOS_HUMANOS' | 'LIMPEZA_INSUMOS' | 'ESCRITORIO_INSUMOS' | 'DESPESAS_VARIADAS';
    items: CompraItemPayload[];
    observacoes?: string;
    valorIPI?: number;
    valorTotalProdutos?: number;
    valorTotalNota?: number;
    duplicatas?: Array<{ numero: string; dataVencimento: string; valor: number }>;
    statusImportacao?: 'MANUAL' | 'XML';
    // Campos para gerar contas a pagar (fallback quando não há duplicatas)
    condicoesPagamento?: string;
    parcelas?: number;
    dataPrimeiroVencimento?: Date;
    meioPagamento?: string;
    cartaoCreditoId?: string | null;
    // ✅ NOVO: Obra vinculada (para compras avulsas de obras em andamento)
    obraId?: string;
    destinoTipo?: DestinoCompraAvulsa | null;
    projetoId?: string;
    // ✅ NOVO: Empresa compradora (para identificar qual CNPJ está sendo usado)
    empresaCompradoraNome?: string;
    empresaCompradoraCNPJ?: string;
}

export class ComprasService {
    /**
     * Retorna o destino do processamento da compra baseado na classificação.
     * Possíveis retornos:
     * - 'estoque' (COMPOSICAO_ESTOQUE, LIMPEZA_INSUMOS, ESCRITORIO_INSUMOS)
     * - 'despesas_variadas' (DESPESAS_VARIADAS) — apenas registro financeiro / histórico; não cria Material nem movimenta estoque
     * - 'ferramentas' (FERRAMENTAS)
     * - 'rh' (RECURSOS_HUMANOS)
     */
    static destinoPorClassificacao(
        classificacao?: string | null
    ): 'estoque' | 'ferramentas' | 'rh' | 'despesas_variadas' {
        const cls = (classificacao || 'COMPOSICAO_ESTOQUE').toString().toUpperCase();
        if (cls === 'FERRAMENTAS') return 'ferramentas';
        if (cls === 'RECURSOS_HUMANOS') return 'rh';
        if (cls === 'DESPESAS_VARIADAS') return 'despesas_variadas';
        // LIMPEZA_INSUMOS e ESCRITORIO_INSUMOS seguem fluxo de estoque
        return 'estoque';
    }

    /**
     * Entrada no estoque + destino por item (obra / OS com reserva / estoque).
     */
    private static async aplicarDestinoItemRecebimento(
        tx: any,
        params: {
            compra: {
                id: string;
                numeroNF: string | number;
                obraId?: string | null;
                projetoId?: string | null;
                destinoTipo?: DestinoCompraAvulsa | string | null;
            };
            item: { id: string; destinoEstoque?: boolean | null };
            materialId: string;
            quantidadeParaEstoque: number;
            observacoesEntrada: string;
        },
    ): Promise<void> {
        const { compra, item, materialId, quantidadeParaEstoque, observacoesEntrada } = params;
        const legacyObraAvulsa = !!(compra.obraId && !compra.destinoTipo);
        const segueDestino = legacyObraAvulsa || item.destinoEstoque === false;

        await tx.material.update({
            where: { id: materialId },
            data: { estoque: { increment: quantidadeParaEstoque } },
        });
        await tx.movimentacaoEstoque.create({
            data: {
                materialId,
                tipo: 'ENTRADA',
                quantidade: quantidadeParaEstoque,
                motivo: 'COMPRA',
                referencia: compra.id,
                observacoes: observacoesEntrada,
            },
        });

        if (!segueDestino) return;

        const destinoTipo =
            (compra.destinoTipo as DestinoCompraAvulsa | null) ||
            (compra.obraId ? 'OBRA' : compra.projetoId ? 'PROJETO' : null);

        if (destinoTipo === 'OBRA' || (legacyObraAvulsa && compra.obraId)) {
            const obraIdDestino = compra.obraId!;
            await tx.material.update({
                where: { id: materialId },
                data: { estoque: { decrement: quantidadeParaEstoque } },
            });
            await tx.movimentacaoEstoque.create({
                data: {
                    materialId,
                    tipo: 'SAIDA',
                    quantidade: quantidadeParaEstoque,
                    motivo: 'OBRA',
                    referencia: obraIdDestino,
                    observacoes: `Material alocado para obra via Compra Avulsa NF: ${compra.numeroNF}`,
                },
            });
            return;
        }

        if (destinoTipo === 'PROJETO' && compra.projetoId) {
            const obra = await tx.obra.findUnique({
                where: { projetoId: compra.projetoId },
                select: { id: true },
            });
            if (obra?.id) {
                await tx.material.update({
                    where: { id: materialId },
                    data: { estoque: { decrement: quantidadeParaEstoque } },
                });
                await tx.movimentacaoEstoque.create({
                    data: {
                        materialId,
                        tipo: 'SAIDA',
                        quantidade: quantidadeParaEstoque,
                        motivo: 'OBRA',
                        referencia: obra.id,
                        observacoes: `Material alocado para obra (OS) via Compra Avulsa NF: ${compra.numeroNF}`,
                    },
                });
                return;
            }

            await tx.reservaMaterialProjeto.create({
                data: {
                    projetoId: compra.projetoId,
                    materialId,
                    quantidade: quantidadeParaEstoque,
                    compraId: compra.id,
                    compraItemId: item.id,
                    observacoes: `Reserva OS — NF ${compra.numeroNF}`,
                },
            });
        }
    }

    /**
     * Registra uma compra completa com integração de estoque e contas a pagar
     */
    static async registrarCompra(data: CompraPayload) {
        const {
            fornecedorNome,
            fornecedorCNPJ,
            fornecedorTel,
            numeroNF,
            serieNF,
            dataEmissaoNF,
            dataCompra,
            dataRecebimento,
            valorFrete = 0,
            outrasDespesas = 0,
            valorDesconto: valorDescontoRaw = 0,
            status,
            classificacao = 'COMPOSICAO_ESTOQUE', // ✅ NOVO: Classificação da compra (padrão: Composição Estoque)
            items,
            observacoes,
            valorIPI = 0,
            valorTotalProdutos,
            valorTotalNota,
            duplicatas,
            statusImportacao,
            condicoesPagamento,
            parcelas,
            dataPrimeiroVencimento,
            meioPagamento,
            cartaoCreditoId,
            obraId,
            destinoTipo,
            projetoId,
        } = data;

        if (meioPagamento && String(meioPagamento).toUpperCase() === 'CARTAO_CREDITO' && !cartaoCreditoId) {
            throw new Error('Selecione o cartão de crédito para compras pagas no cartão');
        }

        // Validações
        if (!items || items.length === 0) {
            throw new Error('Compra deve ter pelo menos um item');
        }

        if (destinoTipo === 'OBRA' && !obraId) {
            throw new Error('Compra avulsa para obra exige obraId');
        }
        if (destinoTipo === 'PROJETO' && !projetoId) {
            throw new Error('Compra avulsa para OS exige projetoId');
        }
        if (obraId && projetoId && destinoTipo !== 'PROJETO') {
            throw new Error('Informe apenas obraId ou projetoId conforme o destino');
        }

        let obraIdPersistir: string | null = obraId || null;
        const projetoIdPersistir: string | null = projetoId || null;
        if (destinoTipo === 'PROJETO' && projetoIdPersistir) {
            const resolved = await ReservaMaterialProjetoService.resolverObraIdParaDestino(
                'PROJETO',
                null,
                projetoIdPersistir,
            );
            if (resolved.obraId) {
                obraIdPersistir = resolved.obraId;
            }
        }

        if (!numeroNF) {
            throw new Error('Número da NF é obrigatório');
        }

        // Buscar ou criar fornecedor (garantir que CNPJ seja string)
        const cnpjString = String(fornecedorCNPJ);
        let fornecedorTemp = await prisma.fornecedor.findUnique({
            where: { cnpj: cnpjString }
        });

        if (!fornecedorTemp) {
            fornecedorTemp = await prisma.fornecedor.create({
                data: {
                    nome: fornecedorNome,
                    cnpj: cnpjString,
                    telefone: fornecedorTel || null
                }
            });
        }

        // Garantir que fornecedor não é null após criação/busca
        if (!fornecedorTemp) {
            throw new Error('Erro ao buscar ou criar fornecedor');
        }

        // Variável final garantidamente não-null para o TypeScript
        const fornecedor = fornecedorTemp;

        // Calcular valores básicos
        const valorSubtotal = items.reduce(
            (sum, item) => sum + (item.quantidade * item.valorUnit),
            0
        );

        const valorDesconto = Math.min(
            Math.max(0, Number(valorDescontoRaw) || 0),
            valorSubtotal
        );

        // Preferência de cálculo:
        // 1) Se vier valorTotalNota do XML, confiar nele
        // 2) Caso contrário: (subtotal - desconto) + frete + outras + IPI
        let valorTotal = valorTotalNota && valorTotalNota > 0
            ? valorTotalNota
            : valorSubtotal - valorDesconto + valorFrete + outrasDespesas + (valorIPI || 0);

        // Buscar o próximo número sequencial disponível
        // Isso garante que não haverá conflito mesmo após importações com números específicos
        const ultimaCompra = await prisma.compra.findFirst({
            orderBy: { numeroSequencial: 'desc' } as any,
            select: { numeroSequencial: true } as any
        });

        const proximoNumero = ((ultimaCompra as any)?.numeroSequencial || 0) + 1;

        // Atualizar a sequência do PostgreSQL para evitar conflitos futuros
        // Tentar diferentes nomes possíveis da sequência
        try {
            // Tentar com o nome padrão do Prisma (case-sensitive)
            await prisma.$executeRawUnsafe(`
                SELECT setval('"compras_numeroSequencial_seq"', ${proximoNumero}, true);
            `);
        } catch (error: any) {
            try {
                // Tentar com nome em minúsculas (PostgreSQL pode criar assim)
                await prisma.$executeRawUnsafe(`
                    SELECT setval('compras_numerosequencial_seq', ${proximoNumero}, true);
                `);
            } catch (error2: any) {
                // Se não conseguir atualizar a sequência, não é crítico
                // O importante é que estamos especificando o número manualmente
                console.warn('⚠️  Não foi possível atualizar a sequência (não crítico):', error2.message);
            }
        }

        // Usar transação para garantir consistência
        const resultado = await prisma.$transaction(async (tx) => {
            // Determinar destino por classificação
            const destino = ComprasService.destinoPorClassificacao(classificacao);

            // ========== CLASSIFICAÇÃO FERRAMENTAS: não vai para estoque (Material), vai para página Ferramentas ==========
            if (destino === 'ferramentas') {
                console.log('🔧 Compra classificada como FERRAMENTAS - itens entram na página Ferramentas (não no estoque).');
                const categoriaPadrao = 'Ferramenta';
                const itemsComFerramentaId: Array<{
                    ferramentaId: string;
                    nomeProduto: string;
                    ncm: string | null;
                    quantidade: number;
                    valorUnit: number;
                    valorTotal: number;
                    quantidadeFracionada?: number;
                    tipoEmbalagem?: string;
                    unidadeEmbalagem?: string;
                }> = [];

                for (const item of items) {
                    const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                    const quantidadeParaFerramenta = temFracionamento
                        ? Math.round(item.quantidade * (item as any).quantidadeFracionada)
                        : Math.round(item.quantidade);

                    let ferramenta = await tx.ferramenta.findFirst({
                        where: { nome: item.nomeProduto, ativo: true }
                    });
                    if (!ferramenta) {
                        let codigo = `FER-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                        let exists = await tx.ferramenta.findUnique({ where: { codigo } });
                        while (exists) {
                            codigo = `FER-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                            exists = await tx.ferramenta.findUnique({ where: { codigo } });
                        }
                        ferramenta = await tx.ferramenta.create({
                            data: {
                                nome: item.nomeProduto,
                                codigo,
                                categoria: categoriaPadrao,
                                valorCompra: item.valorUnit,
                                quantidade: 0,
                                ativo: true
                            }
                        });
                        console.log(`✅ Ferramenta criada: ${ferramenta.nome} (${ferramenta.codigo})`);
                    }

                    itemsComFerramentaId.push({
                        ferramentaId: ferramenta.id,
                        nomeProduto: item.nomeProduto,
                        ncm: item.ncm ? String(item.ncm) : null,
                        quantidade: item.quantidade,
                        valorUnit: item.valorUnit,
                        valorTotal: item.quantidade * item.valorUnit,
                        quantidadeFracionada: (item as any).quantidadeFracionada,
                        tipoEmbalagem: (item as any).tipoEmbalagem,
                        unidadeEmbalagem: item.unidadeEmbalagem
                    });
                }

                const xmlMeta: any = {
                    valorSubtotal,
                    valorFrete,
                    outrasDespesas,
                    valorDesconto,
                    valorIPI: valorIPI || 0,
                    valorTotalProdutos: valorTotalProdutos ?? valorSubtotal,
                    valorTotalNota: valorTotal,
                    duplicatas: duplicatas || [],
                    statusImportacao: statusImportacao || 'MANUAL',
                    condicoesPagamento: condicoesPagamento || null,
                    parcelas: parcelas || null,
                    dataPrimeiroVencimento: dataPrimeiroVencimento || null,
                    meioPagamento: meioPagamento || null,
                    cartaoCreditoId: cartaoCreditoId || null
                };

                const compra = await tx.compra.create({
                    data: {
                        numeroSequencial: proximoNumero,
                        fornecedorId: fornecedor.id,
                        fornecedorNome,
                        fornecedorCNPJ: cnpjString,
                        fornecedorTel: fornecedorTel || null,
                        numeroNF: String(numeroNF),
                        serieNF: serieNF != null && serieNF !== '' ? String(serieNF) : null,
                        dataEmissaoNF,
                        dataCompra,
                        dataRecebimento: dataRecebimento || null,
                        valorSubtotal,
                        valorFrete,
                        outrasDespesas,
                        valorDesconto,
                        valorTotal,
                        status,
                        classificacao,
                        observacoes,
                        xmlData: JSON.stringify(xmlMeta),
                        obraId: obraId || null,
                        empresaCompradoraNome: data.empresaCompradoraNome || null,
                        empresaCompradoraCNPJ: data.empresaCompradoraCNPJ || null,
                        items: {
                            create: itemsComFerramentaId.map((it: any) => ({
                                ferramentaId: it.ferramentaId,
                                nomeProduto: it.nomeProduto,
                                ncm: it.ncm,
                                quantidade: it.quantidade,
                                valorUnit: it.valorUnit,
                                valorTotal: it.valorTotal,
                                quantidadeFracionada: it.quantidadeFracionada || null,
                                tipoEmbalagem: it.tipoEmbalagem || null,
                                unidadeEmbalagem: it.unidadeEmbalagem || null
                            }))
                        }
                    } as any,
                    include: { items: true, fornecedor: true }
                });

                if (status === 'Recebido') {
                    for (const it of itemsComFerramentaId) {
                        const temFrac = it.quantidadeFracionada && it.quantidadeFracionada > 0;
                        const qtd = temFrac ? Math.round(it.quantidade * it.quantidadeFracionada!) : Math.round(it.quantidade);
                        await tx.ferramenta.update({
                            where: { id: it.ferramentaId },
                            data: { quantidade: { increment: qtd } }
                        });
                    }
                    console.log('✅ Quantidade adicionada às ferramentas (compra Recebida).');
                }

                return {
                    compra,
                    contasPagar: null,
                    estoqueAtualizado: false,
                    estatisticas: { materiaisCriados: 0, materiaisIncrementados: 0, totalItens: items.length }
                };
            }

            // ========== CLASSIFICAÇÃO RECURSOS_HUMANOS: itens aparecem na página RH (vincular eletricista, data compra/entrega) ==========
            if (destino === 'rh') {
                console.log('👥 Compra classificada como RECURSOS_HUMANOS - itens entram na página Recursos Humanos.');
                const xmlMeta: any = {
                    valorSubtotal,
                    valorFrete,
                    outrasDespesas,
                    valorDesconto,
                    valorIPI: valorIPI || 0,
                    valorTotalProdutos: valorTotalProdutos ?? valorSubtotal,
                    valorTotalNota: valorTotal,
                    duplicatas: duplicatas || [],
                    statusImportacao: statusImportacao || 'MANUAL',
                    condicoesPagamento: condicoesPagamento || null,
                    parcelas: parcelas || null,
                    dataPrimeiroVencimento: dataPrimeiroVencimento || null,
                    meioPagamento: meioPagamento || null,
                    cartaoCreditoId: cartaoCreditoId || null
                };

                const compra = await tx.compra.create({
                    data: {
                        numeroSequencial: proximoNumero,
                        fornecedorId: fornecedor.id,
                        fornecedorNome,
                        fornecedorCNPJ: cnpjString,
                        fornecedorTel: fornecedorTel || null,
                        numeroNF: String(numeroNF),
                        serieNF: serieNF != null && serieNF !== '' ? String(serieNF) : null,
                        dataEmissaoNF,
                        dataCompra,
                        dataRecebimento: dataRecebimento || null,
                        valorSubtotal,
                        valorFrete,
                        outrasDespesas,
                        valorDesconto,
                        valorTotal,
                        status,
                        classificacao,
                        observacoes,
                        xmlData: JSON.stringify(xmlMeta),
                        obraId: obraId || null,
                        empresaCompradoraNome: data.empresaCompradoraNome || null,
                        empresaCompradoraCNPJ: data.empresaCompradoraCNPJ || null,
                        items: {
                            create: items.map((item: any) => ({
                                nomeProduto: item.nomeProduto,
                                quantidade: item.quantidade,
                                valorUnit: item.valorUnit,
                                valorTotal: item.quantidade * item.valorUnit,
                                ncm: item.ncm ? String(item.ncm) : null,
                                quantidadeFracionada: item.quantidadeFracionada || null,
                                tipoEmbalagem: item.tipoEmbalagem || null,
                                unidadeEmbalagem: item.unidadeEmbalagem || null
                            }))
                        }
                    } as any,
                    include: { items: true, fornecedor: true }
                });

                if (status === 'Recebido') {
                    const compraComItems = await tx.compra.findUnique({
                        where: { id: compra.id },
                        include: { items: true }
                    });
                    if (compraComItems?.items) {
                        for (const item of compraComItems.items) {
                            await (tx as any).recursoHumanoEstoque.create({
                                data: {
                                    compraId: compra.id,
                                    compraItemId: item.id,
                                    nomeItem: item.nomeProduto,
                                    quantidade: item.quantidade,
                                    valorUnitario: item.valorUnit,
                                    valorTotal: item.valorTotal
                                }
                            });
                        }
                    }
                    console.log('✅ Itens de RH criados no estoque de Recursos Humanos.');
                }

                return {
                    compra,
                    contasPagar: null,
                    estoqueAtualizado: false,
                    estatisticas: { materiaisCriados: 0, materiaisIncrementados: 0, totalItens: items.length }
                };
            }

            // ========== DESPESAS VARIADAS: só registro de gasto (NF, fornecedor, itens descritivos); sem Material e sem estoque ==========
            if (destino === 'despesas_variadas') {
                console.log(
                    '💸 Compra classificada como DESPESAS_VARIADAS — registro financeiro apenas (sem cadastro em estoque).'
                );
                // Sem remessa física / reposição: concluída no registro (contas a pagar seguem pelo xmlData).
                const statusDespesa = 'Recebido';
                const dataRefRecebimento = dataRecebimento ?? dataCompra;
                const xmlMeta: any = {
                    valorSubtotal,
                    valorFrete,
                    outrasDespesas,
                    valorDesconto,
                    valorIPI: valorIPI || 0,
                    valorTotalProdutos: valorTotalProdutos ?? valorSubtotal,
                    valorTotalNota: valorTotal,
                    duplicatas: duplicatas || [],
                    statusImportacao: statusImportacao || 'MANUAL',
                    condicoesPagamento: condicoesPagamento || null,
                    parcelas: parcelas || null,
                    dataPrimeiroVencimento: dataPrimeiroVencimento || null,
                    meioPagamento: meioPagamento || null,
                    cartaoCreditoId: cartaoCreditoId || null
                };

                const compra = await tx.compra.create({
                    data: {
                        numeroSequencial: proximoNumero,
                        fornecedorId: fornecedor.id,
                        fornecedorNome,
                        fornecedorCNPJ: cnpjString,
                        fornecedorTel: fornecedorTel || null,
                        numeroNF: String(numeroNF),
                        serieNF: serieNF != null && serieNF !== '' ? String(serieNF) : null,
                        dataEmissaoNF,
                        dataCompra,
                        dataRecebimento: dataRefRecebimento,
                        valorSubtotal,
                        valorFrete,
                        outrasDespesas,
                        valorDesconto,
                        valorTotal,
                        status: statusDespesa,
                        classificacao,
                        observacoes,
                        xmlData: JSON.stringify(xmlMeta),
                        obraId: obraId || null,
                        empresaCompradoraNome: data.empresaCompradoraNome || null,
                        empresaCompradoraCNPJ: data.empresaCompradoraCNPJ || null,
                        items: {
                            create: items.map((item: any) => ({
                                nomeProduto: item.nomeProduto,
                                quantidade: item.quantidade,
                                valorUnit: item.valorUnit,
                                valorTotal: item.quantidade * item.valorUnit,
                                ncm: item.ncm ? String(item.ncm) : null,
                                quantidadeFracionada: item.quantidadeFracionada || null,
                                tipoEmbalagem: item.tipoEmbalagem || null,
                                unidadeEmbalagem: item.unidadeEmbalagem || null
                            }))
                        }
                    } as any,
                    include: { items: true, fornecedor: true }
                });

                return {
                    compra,
                    contasPagar: null,
                    estoqueAtualizado: false,
                    estatisticas: { materiaisCriados: 0, materiaisIncrementados: 0, totalItens: items.length }
                };
            }

            // 0. Vincular itens ao material canônico (alias do fornecedor). Não cria SKU novo sozinho.
            console.log('🔍 Processando items da compra...');
            const itemsProcessados: Array<{
                materialId: string | null;
                nomeProduto: string;
                ncm: string | null;
                quantidade: number;
                valorUnit: number;
                valorTotal: number;
                codigoFornecedor?: string | null;
                ean?: string | null;
                quantidadeFracionada?: number;
                tipoEmbalagem?: string;
                unidadeEmbalagem?: string;
                destinoEstoque?: boolean;
            }> = [];
            
            // Contadores para resumo
            let materiaisCriados = 0;
            let materiaisIncrementados = 0;
            
            const exigirVinculo = status === 'Recebido';
            
            for (const item of items) {
                let materialId = item.materialId || null;
                const idsNf = identificadoresItemNf(item);
                
                const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                let precoUnitarioCalculado: number | null = null;
                let precoEmbalagem: number | null = null;
                
                if (temFracionamento) {
                    precoEmbalagem = item.valorUnit;
                    precoUnitarioCalculado = item.valorUnit / (item as any).quantidadeFracionada;
                    console.log(`📦 Item fracionado: ${item.quantidade} ${(item as any).tipoEmbalagem || 'embalagens'} × ${(item as any).quantidadeFracionada} un`);
                }

                if (!materialId) {
                    const match = await matchMaterial(tx, {
                        fornecedorId: fornecedor.id,
                        nomeProduto: item.nomeProduto,
                        codigoFornecedor: idsNf.codigoFornecedor,
                        ean: idsNf.ean,
                    });
                    if (match) {
                        materialId = match.material.id;
                        console.log(`✅ Match ${match.tipo}: "${item.nomeProduto}" → ${match.material.nome}`);
                        materiaisIncrementados++;
                    }
                } else {
                    materiaisIncrementados++;
                }

                if (!materialId && item.criarNovoMaterial) {
                    const material = await criarMaterialCanonico(tx, {
                        nomeProduto: item.nomeProduto,
                        ncm: item.ncm,
                        valorUnit: item.valorUnit,
                        fornecedorId: fornecedor.id,
                        temFracionamento,
                        quantidadeFracionada: (item as any).quantidadeFracionada,
                        tipoEmbalagem: (item as any).tipoEmbalagem,
                        precoUnitarioCalculado,
                        precoEmbalagem,
                    });
                    materialId = material.id;
                    materiaisCriados++;
                    console.log(`🆕 Material criado por confirmação do usuário: ${material.id}`);
                }

                if (!materialId && exigirVinculo) {
                    throw new Error(
                        `Item "${item.nomeProduto}" não está vinculado ao estoque. Vincule a um material existente ou marque como item novo.`
                    );
                }

                if (materialId) {
                    await aprenderAlias(tx, {
                        materialId,
                        fornecedorId: fornecedor.id,
                        nomeProduto: item.nomeProduto,
                        codigoFornecedor: idsNf.codigoFornecedor,
                        ean: idsNf.ean,
                        ncm: item.ncm,
                        origem: item.materialId ? 'MANUAL' : 'IMPORTACAO',
                    });

                    const materialAtual = await tx.material.findUnique({
                        where: { id: materialId },
                        select: { preco: true, ncm: true },
                    });
                    if (materialAtual) {
                        const updateData: any = {};
                        if (temFracionamento) {
                            updateData.quantidadePorEmbalagem = (item as any).quantidadeFracionada;
                            updateData.tipoEmbalagem = (item as any).tipoEmbalagem || 'CAIXA';
                            updateData.precoEmbalagem = precoEmbalagem;
                            updateData.precoUnitario = precoUnitarioCalculado;
                        }
                        const precoParaUsar = temFracionamento ? precoUnitarioCalculado : item.valorUnit;
                        if (materialAtual.preco !== precoParaUsar) {
                            updateData.preco = precoParaUsar;
                            updateData.fornecedorId = fornecedor.id;
                        }
                        if (item.ncm && !materialAtual.ncm) {
                            updateData.ncm = String(item.ncm);
                            updateData.fornecedorId = fornecedor.id;
                        }
                        if (Object.keys(updateData).length > 0) {
                            await tx.material.update({ where: { id: materialId }, data: updateData });
                        }
                    }
                } else {
                    console.log(`⚠️ Item pendente de vínculo: "${item.nomeProduto}"`);
                }

                itemsProcessados.push({
                    materialId,
                    nomeProduto: item.nomeProduto,
                    ncm: item.ncm ? String(item.ncm) : null,
                    quantidade: item.quantidade,
                    valorUnit: item.valorUnit,
                    valorTotal: item.quantidade * item.valorUnit,
                    codigoFornecedor: idsNf.codigoFornecedor,
                    ean: idsNf.ean,
                    quantidadeFracionada: (item as any).quantidadeFracionada,
                    tipoEmbalagem: (item as any).tipoEmbalagem,
                    unidadeEmbalagem: item.unidadeEmbalagem,
                    destinoEstoque: (item as CompraItemPayload).destinoEstoque !== false,
                });
            }
            
            // 1. Criar compra com items (agora todos com materialId)
            // Montar metadados financeiros/duplicatas para auditoria (xmlData)
            const xmlMeta: any = {
                valorSubtotal,
                valorFrete,
                outrasDespesas,
                valorDesconto,
                valorIPI: valorIPI || 0,
                valorTotalProdutos: valorTotalProdutos ?? valorSubtotal,
                valorTotalNota: valorTotal,
                duplicatas: duplicatas || [],
                statusImportacao: statusImportacao || 'MANUAL',
                // Guardar também informações de pagamento para gerar contas a pagar somente no recebimento
                condicoesPagamento: condicoesPagamento || null,
                parcelas: parcelas || null,
                dataPrimeiroVencimento: dataPrimeiroVencimento || null,
                meioPagamento: meioPagamento || null,
                cartaoCreditoId: cartaoCreditoId || null
            };

            const compra = await tx.compra.create({
                data: {
                    numeroSequencial: proximoNumero, // ✅ Especificar manualmente o número para evitar conflitos
                    fornecedorId: fornecedor.id,
                    fornecedorNome,
                    fornecedorCNPJ: cnpjString,
                    fornecedorTel: fornecedorTel || null,
                    numeroNF: String(numeroNF),
                    serieNF: serieNF != null && serieNF !== '' ? String(serieNF) : null,
                    dataEmissaoNF,
                    dataCompra,
                    dataRecebimento: dataRecebimento || null,
                    valorSubtotal,
                    valorFrete,
                    outrasDespesas,
                    valorDesconto,
                    valorTotal,
                    status,
                    classificacao, // ✅ NOVO: Classificação da compra
                    observacoes,
                    xmlData: JSON.stringify(xmlMeta),
                    obraId: obraIdPersistir,
                    destinoTipo: destinoTipo || null,
                    projetoId: projetoIdPersistir,
                    empresaCompradoraNome: data.empresaCompradoraNome || null, // ✅ NOVO: Nome da empresa compradora
                    empresaCompradoraCNPJ: data.empresaCompradoraCNPJ || null, // ✅ NOVO: CNPJ da empresa compradora
                    items: {
                        create: itemsProcessados.map(item => ({
                            materialId: item.materialId,
                            nomeProduto: item.nomeProduto,
                            ncm: item.ncm,
                            quantidade: item.quantidade,
                            valorUnit: item.valorUnit,
                            valorTotal: item.valorTotal,
                            codigoFornecedor: item.codigoFornecedor || null,
                            ean: item.ean || null,
                            destinoEstoque: item.destinoEstoque !== false,
                            quantidadeFracionada: item.quantidadeFracionada || null,
                            tipoEmbalagem: item.tipoEmbalagem || null,
                            unidadeEmbalagem: item.unidadeEmbalagem || null
                        }))
                    }
                } as any,
                include: {
                    items: true,
                    fornecedor: true
                }
            });
            
            console.log(`✅ Compra criada: #${(compra as any).numeroSequencial} com ${(compra as any).items.length} itens`);

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
                estoqueAtualizado: false, // Sempre false na criação
                estatisticas: {
                    materiaisCriados,
                    materiaisIncrementados,
                    totalItens: items.length
                }
            };
        });

        // ✅ CORREÇÃO CRÍTICA: Gerar contas a pagar SEMPRE que houver duplicatas/parcelas,
        // independente do status (Pendente ou Recebido). As parcelas são obrigações financeiras
        // que existem desde o momento da compra - tanto para XML quanto para registro manual.
        let xmlMetaCriacao: any = {};
        try {
            xmlMetaCriacao = JSON.parse((resultado.compra as any).xmlData || '{}');
        } catch (_) {
            xmlMetaCriacao = {};
        }
        const duplicatasCriacao = Array.isArray(xmlMetaCriacao?.duplicatas) ? xmlMetaCriacao.duplicatas : [];
        const temParcelasFallback = xmlMetaCriacao?.parcelas && xmlMetaCriacao?.dataPrimeiroVencimento;

        if (duplicatasCriacao.length > 0 || temParcelasFallback) {
            console.log('💰 Gerando contas a pagar para compra (manual ou XML) com parcelas cadastradas...');
            await ComprasService.gerarContasPagarParaCompra(resultado.compra.id);
        }

        return resultado;
    }

    /**
     * Gera contas a pagar para uma compra utilizando as duplicatas ou condições de pagamento salvas em xmlData.
     * Só gera se ainda não existirem contas vinculadas a essa compra.
     * É chamado tanto na CRIAÇÃO da compra (manual ou XML) quanto no RECEBIMENTO.
     * As parcelas são obrigações financeiras que existem desde o momento da compra.
     */
    static async gerarContasPagarParaCompra(id: string) {
        // Verificar se já existem contas a pagar vinculadas a esta compra
        const contasExistentes = await prisma.contaPagar.count({
            where: { compraId: id }
        });

        if (contasExistentes > 0) {
            console.log(`💰 Já existem ${contasExistentes} conta(s) a pagar para a compra ${id}. Nada a fazer.`);
            return null;
        }

        const compra = await prisma.compra.findUnique({
            where: { id }
        });

        if (!compra) {
            console.warn(`⚠️ Não foi possível gerar contas a pagar: compra ${id} não encontrada.`);
            return null;
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
        const meioPagamento = xmlMeta?.meioPagamento || undefined;
        const cartaoCreditoId = xmlMeta?.cartaoCreditoId || undefined;

        let contasPagar: any = null;

        if (duplicatas && Array.isArray(duplicatas) && duplicatas.length > 0) {
            console.log(`💰 (Recebimento) Gerando contas a pagar a partir de duplicatas para compra NF ${compra.numeroNF}`);
            contasPagar = await ContasPagarService.criarContasPagarPorDuplicatas({
                fornecedorId: compra.fornecedorId,
                compraId: compra.id,
                descricao: `Compra NF ${compra.numeroNF} - ${compra.fornecedorNome}`,
                duplicatas,
                observacoes: condicoesPagamento,
                meioPagamento,
                cartaoCreditoId,
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
                observacoes: condicoesPagamento,
                meioPagamento,
                cartaoCreditoId,
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
                    obra: {
                        select: {
                            id: true,
                            nomeObra: true,
                            status: true
                        }
                    },
                    items: {
                        include: {
                            material: {
                                select: {
                                    id: true,
                                    nome: true,
                                    sku: true,
                                    categoria: true,
                                    ncm: true,
                                    unidadeMedida: true,
                                    preco: true,
                                    valorVenda: true,
                                    estoque: true,
                                    descricao: true,
                                    imagemUrl: true // ✅ Incluir imagem do material
                                }
                            }
                        }
                    }
                } as any
            });

            if (!compra) {
                throw new Error('Compra não encontrada');
            }

            // Buscar contas a pagar vinculadas
            const contasPagar = await prisma.contaPagar.findMany({
                where: { compraId: id },
                orderBy: { dataVencimento: 'asc' }
            });

            // Parsear duplicatas do xmlData
            let duplicatas: Array<{ numero: string; dataVencimento: string; valor: number }> = [];
            if (compra.xmlData) {
                try {
                    const xmlMeta = JSON.parse(compra.xmlData);
                    if (xmlMeta.duplicatas && Array.isArray(xmlMeta.duplicatas)) {
                        duplicatas = xmlMeta.duplicatas;
                    }
                } catch (err) {
                    console.error('Erro ao parsear duplicatas do xmlData:', err);
                }
            }

            // Retornar compra com duplicatas e contas vinculadas
            return {
                ...compra,
                duplicatas,
                contasPagar
            };
        } catch (error) {
            console.error('Erro ao buscar compra:', error);
            throw error;
        }
    }

    /**
     * Lista compras com filtros
     */
    /**
     * Lista compras com filtros
     * ✅ CORREÇÃO CRÍTICA: Aumentar limit padrão de 10 para 1000 para evitar perda de dados em auditoria
     */
    static async listarCompras(
        status?: string,
        fornecedorId?: string,
        dataInicio?: Date,
        dataFim?: Date,
        page: number = 1,
        limit: number = 1000
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
                orderBy: { numeroSequencial: 'desc' } as any, // ✅ Ordenar por número sequencial (mais recente no topo)
                include: {
                    fornecedor: {
                        select: {
                            id: true,
                            nome: true,
                            cnpj: true,
                            telefone: true
                        }
                    },
                    obra: {
                        select: {
                            id: true,
                            nomeObra: true,
                            status: true
                        }
                    } as any,
                    items: true,
                    contasPagar: {
                        select: {
                            id: true,
                            status: true,
                            valorParcela: true,
                            dataVencimento: true
                        }
                    }
                } as any
            }),
            prisma.compra.count({ where })
        ]);

        console.log(`📦 Compras listadas: ${compras.length} de ${total} total (página ${page}, limit ${limit})`);

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

        // Contadores para estatísticas (declarados fora do bloco para uso no retorno)
        let materiaisCriados = 0;
        let materiaisIncrementados = 0;

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

            // Atualizar estoque/ferramentas/RH conforme classificação
            if (deveAtualizarEstoque) {
                const classificacaoCompra = (compra as any).classificacao;
                const destino = ComprasService.destinoPorClassificacao(classificacaoCompra);

                if (destino === 'ferramentas') {
                    console.log('🔧 Recebido - adicionando quantidade às Ferramentas (não ao estoque).');
                    for (const item of compra.items) {
                        const ferramentaId = (item as any).ferramentaId;
                        if (ferramentaId) {
                            const temFrac = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                            const qtd = temFrac ? Math.round(item.quantidade * (item as any).quantidadeFracionada) : Math.round(item.quantidade);
                            await tx.ferramenta.update({
                                where: { id: ferramentaId },
                                data: { quantidade: { increment: qtd } }
                            });
                        }
                    }
                } else if (destino === 'rh') {
                    console.log('👥 Recebido - criando itens no estoque de Recursos Humanos.');
                    for (const item of compra.items) {
                        await (tx as any).recursoHumanoEstoque.create({
                            data: {
                                compraId: compra.id,
                                compraItemId: item.id,
                                nomeItem: item.nomeProduto,
                                quantidade: item.quantidade,
                                valorUnitario: item.valorUnit,
                                valorTotal: item.valorTotal
                            }
                        });
                    }
                } else if (destino === 'despesas_variadas') {
                    console.log(
                        '💸 Recebido — DESPESAS_VARIADAS: sem criação de Material e sem movimentação de estoque.'
                    );
                } else {
                    console.log('📦 Mudança para "Recebido" - Criando Materials e dando entrada no estoque...');
                
                for (const item of compra.items) {
                    const materialIdFinal = await resolverMaterialNoRecebimento(
                        tx,
                        item as any,
                        compra.fornecedorId,
                    );
                    
                    // ✅ Dar entrada no estoque (considerando fracionamento)
                    if (materialIdFinal) {
                        // ✅ ATUALIZAR PREÇO DO MATERIAL COM O VALOR DA ÚLTIMA COMPRA
                        const materialAtual = await tx.material.findUnique({
                            where: { id: materialIdFinal },
                            select: { preco: true, fornecedorId: true }
                        });
                        
                        if (materialAtual) {
                            // ✅ PROCESSAR FRACIONAMENTO para calcular preço unitário
                            const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                            const precoParaUsar = temFracionamento 
                                ? item.valorUnit / (item as any).quantidadeFracionada // Preço unitário quando fracionado
                                : item.valorUnit; // Preço normal
                            
                            // Atualizar preço se for diferente (sempre usar o valor da última compra)
                            if (materialAtual.preco !== precoParaUsar) {
                                await tx.material.update({
                                    where: { id: materialIdFinal },
                                    data: {
                                        preco: precoParaUsar,
                                        fornecedorId: compra.fornecedorId
                                    }
                                });
                                console.log(`💰 Preço atualizado na recepção: R$ ${materialAtual.preco} → R$ ${precoParaUsar} (Material: ${materialIdFinal})`);
                            } else if (materialAtual.preco === null) {
                                // Se material não tinha preço, definir agora
                                await tx.material.update({
                                    where: { id: materialIdFinal },
                                    data: {
                                        preco: precoParaUsar,
                                        fornecedorId: compra.fornecedorId
                                    }
                                });
                                console.log(`💰 Preço definido na recepção: R$ ${precoParaUsar} (Material: ${materialIdFinal})`);
                            }
                        }
                        
                        // ✅ PROCESSAR FRACIONAMENTO
                        const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                        const quantidadeParaEstoque = temFracionamento 
                            ? item.quantidade * (item as any).quantidadeFracionada // Quantidade de embalagens × unidades por embalagem
                            : item.quantidade; // Quantidade normal
                        
                        const observacoesEstoque = temFracionamento
                            ? `Compra NF: ${compra.numeroNF} - ${item.quantidade} ${(item as any).tipoEmbalagem || 'embalagens'} (${quantidadeParaEstoque} unidades) - Recebimento confirmado`
                            : `Compra NF: ${compra.numeroNF} - Recebimento confirmado`;

                        await ComprasService.aplicarDestinoItemRecebimento(tx, {
                            compra: {
                                id,
                                numeroNF: compra.numeroNF,
                                obraId: (compra as any).obraId,
                                projetoId: (compra as any).projetoId,
                                destinoTipo: (compra as any).destinoTipo,
                            },
                            item: item as any,
                            materialId: materialIdFinal,
                            quantidadeParaEstoque,
                            observacoesEntrada: observacoesEstoque,
                        });
                        
                        // ✅ Marcar fracionamento como aplicado se houver
                        if (temFracionamento) {
                            await tx.compraItem.update({
                                where: { id: item.id },
                                data: {
                                    fracionamentoAplicado: true
                                } as any
                            });
                            console.log(`✅ Fracionamento marcado como aplicado para item ${item.nomeProduto}`);
                        }
                    }
                }
                
                console.log('✅ Todos os Materials criados e estoque atualizado!');
                }
            }

            return {
                compra: compraAtualizada,
                estatisticas: deveAtualizarEstoque ? {
                    materiaisCriados,
                    materiaisIncrementados,
                    totalItens: compra.items.length
                } : undefined
            };
        });
        
        // Extrair compra e estatísticas do resultado
        const compraAtualizada = (resultado as any).compra || resultado;
        const estatisticas = (resultado as any).estatisticas;
        
        // Após a transação, se a compra passou a ficar como "Recebido",
        // gerar contas a pagar (se ainda não existirem) usando as duplicatas/condições salvas em xmlData
        if (novoStatus === 'Recebido' && compra.status !== 'Recebido') {
            await ComprasService.gerarContasPagarParaCompra(id);
        }

        return {
            compra: compraAtualizada,
            estatisticas
        };
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

            // Atualizar estoque/ferramentas/RH apenas dos itens marcados
            if (deveAtualizarEstoque) {
                const itensSelecionados = compra.items.filter(item => produtoIds.includes(item.id));
                const classificacaoCompra = (compra as any).classificacao;
                const destino = ComprasService.destinoPorClassificacao(classificacaoCompra);

                if (destino === 'ferramentas') {
                    console.log('🔧 Recebimento parcial - adicionando quantidade às Ferramentas.');
                    for (const item of itensSelecionados) {
                        const ferramentaId = (item as any).ferramentaId;
                        if (ferramentaId) {
                            const temFrac = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                            const qtd = temFrac ? Math.round(item.quantidade * (item as any).quantidadeFracionada) : Math.round(item.quantidade);
                            await tx.ferramenta.update({
                                where: { id: ferramentaId },
                                data: { quantidade: { increment: qtd } }
                            });
                        }
                    }
                } else if (destino === 'rh') {
                    console.log('👥 Recebimento parcial - criando itens no estoque de Recursos Humanos.');
                    for (const item of itensSelecionados) {
                        await (tx as any).recursoHumanoEstoque.create({
                            data: {
                                compraId: compra.id,
                                compraItemId: item.id,
                                nomeItem: item.nomeProduto,
                                quantidade: item.quantidade,
                                valorUnitario: item.valorUnit,
                                valorTotal: item.valorTotal
                            }
                        });
                    }
                } else if (destino === 'despesas_variadas') {
                    console.log(
                        '💸 Recebimento parcial — DESPESAS_VARIADAS: sem processamento de estoque.'
                    );
                } else {
                console.log('📦 Recebendo itens parciais - Processando estoque...');
                console.log('📦 Produtos selecionados:', produtoIds);
                console.log('📦 Total de itens na compra:', compra.items.length);
                
                const itensSelecionadosEstoque = compra.items.filter(item => produtoIds.includes(item.id));
                
                if (itensSelecionadosEstoque.length === 0) {
                    console.error('❌ ERRO: Nenhum item foi selecionado para processamento!');
                }
                
                for (const item of itensSelecionadosEstoque) {
                    const materialIdFinal = await resolverMaterialNoRecebimento(
                        tx,
                        item as any,
                        compra.fornecedorId,
                    );
                    
                    // ✅ CORREÇÃO: Dar entrada no estoque usando a transação existente
                    if (materialIdFinal) {
                        // ✅ ATUALIZAR PREÇO DO MATERIAL COM O VALOR DA ÚLTIMA COMPRA
                        const materialAtual = await tx.material.findUnique({
                            where: { id: materialIdFinal },
                            select: { preco: true, fornecedorId: true, estoque: true, nome: true }
                        });
                        
                        if (materialAtual) {
                            // ✅ PROCESSAR FRACIONAMENTO para calcular preço unitário
                            const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                            const precoParaUsar = temFracionamento 
                                ? item.valorUnit / (item as any).quantidadeFracionada // Preço unitário quando fracionado
                                : item.valorUnit; // Preço normal
                            
                            // Atualizar preço se for diferente (sempre usar o valor da última compra)
                            if (materialAtual.preco !== precoParaUsar) {
                                await tx.material.update({
                                    where: { id: materialIdFinal },
                                    data: {
                                        preco: precoParaUsar,
                                        fornecedorId: compra.fornecedorId
                                    }
                                });
                                console.log(`💰 Preço atualizado na remessa parcial: R$ ${materialAtual.preco} → R$ ${precoParaUsar} (Material: ${materialIdFinal})`);
                            } else if (materialAtual.preco === null) {
                                // Se material não tinha preço, definir agora
                                await tx.material.update({
                                    where: { id: materialIdFinal },
                                    data: {
                                        preco: precoParaUsar,
                                        fornecedorId: compra.fornecedorId
                                    }
                                });
                                console.log(`💰 Preço definido na remessa parcial: R$ ${precoParaUsar} (Material: ${materialIdFinal})`);
                            }
                        }
                        
                        // ✅ PROCESSAR FRACIONAMENTO
                        const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                        const quantidadeParaEstoque = temFracionamento 
                            ? item.quantidade * (item as any).quantidadeFracionada // Quantidade de embalagens × unidades por embalagem
                            : item.quantidade; // Quantidade normal
                        
                        const estoqueAnterior = materialAtual?.estoque || 0;
                        console.log(`📦 Material: ${materialAtual?.nome || materialIdFinal}`);
                        if (temFracionamento) {
                            console.log(`📦 Fracionado: ${item.quantidade} ${(item as any).tipoEmbalagem || 'embalagens'} × ${(item as any).quantidadeFracionada} un = ${quantidadeParaEstoque} unidades`);
                        } else {
                            console.log(`📦 Estoque anterior: ${estoqueAnterior}, Quantidade a adicionar: ${quantidadeParaEstoque}`);
                        }

                        const sufixoRecebimento = todosRecebidos ? 'Recebimento confirmado' : 'Recebimento parcial confirmado';
                        const observacoesMovimentacao = temFracionamento
                            ? `Compra NF: ${compra.numeroNF} - ${item.quantidade} ${(item as any).tipoEmbalagem || 'embalagens'} (${quantidadeParaEstoque} unidades) - ${sufixoRecebimento}`
                            : `Compra NF: ${compra.numeroNF} - ${sufixoRecebimento}`;

                        await ComprasService.aplicarDestinoItemRecebimento(tx, {
                            compra: {
                                id,
                                numeroNF: compra.numeroNF,
                                obraId: (compra as any).obraId,
                                projetoId: (compra as any).projetoId,
                                destinoTipo: (compra as any).destinoTipo,
                            },
                            item: item as any,
                            materialId: materialIdFinal,
                            quantidadeParaEstoque,
                            observacoesEntrada: observacoesMovimentacao,
                        });

                        const materialAtualizado = await tx.material.findUnique({
                            where: { id: materialIdFinal },
                            select: { estoque: true, nome: true },
                        });
                        console.log(
                            `✅ Estoque atualizado: ${estoqueAnterior} → ${materialAtualizado?.estoque} (processado ${quantidadeParaEstoque} unidades)`,
                        );
                        
                        // ✅ Marcar fracionamento como aplicado se houver
                        if (temFracionamento) {
                            await tx.compraItem.update({
                                where: { id: item.id },
                                data: {
                                    fracionamentoAplicado: true
                                } as any
                            });
                            console.log(`✅ Fracionamento marcado como aplicado para item ${item.nomeProduto}`);
                        }
                        
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
            }

            return compraAtualizada;
        });

        // Se após o processamento a compra passou a ser considerada "Recebida",
        // gerar contas a pagar (se ainda não existirem)
        if (resultado.status === 'Recebido') {
            await ComprasService.gerarContasPagarParaCompra(id);
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

        const classificacaoCompra = (compra as any).classificacao;
        if (classificacaoCompra === 'DESPESAS_VARIADAS') {
            const resultadoDv = await prisma.$transaction(async (tx) => {
                return tx.compra.update({
                    where: { id },
                    data: { status: 'Recebido', dataRecebimento },
                    include: { items: true, fornecedor: true }
                });
            });
            await ComprasService.gerarContasPagarParaCompra(id);
            return resultadoDv;
        }

        if (classificacaoCompra === 'FERRAMENTAS' || classificacaoCompra === 'RECURSOS_HUMANOS') {
            return await prisma.$transaction(async (tx) => {
                const compraAtualizada = await tx.compra.update({
                    where: { id },
                    data: { status: 'Recebido', dataRecebimento },
                    include: { items: true, fornecedor: true }
                });
                if (classificacaoCompra === 'FERRAMENTAS') {
                    for (const item of compra.items) {
                        const ferramentaId = (item as any).ferramentaId;
                        if (ferramentaId) {
                            const temFrac = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                            const qtd = temFrac ? Math.round(item.quantidade * (item as any).quantidadeFracionada) : Math.round(item.quantidade);
                            await tx.ferramenta.update({
                                where: { id: ferramentaId },
                                data: { quantidade: { increment: qtd } }
                            });
                        }
                    }
                } else {
                    for (const item of compra.items) {
                        await (tx as any).recursoHumanoEstoque.create({
                            data: {
                                compraId: compra.id,
                                compraItemId: item.id,
                                nomeItem: item.nomeProduto,
                                quantidade: item.quantidade,
                                valorUnitario: item.valorUnit,
                                valorTotal: item.valorTotal
                            }
                        });
                    }
                }
                return compraAtualizada;
            }).then(async (compraAtualizada) => {
                await ComprasService.gerarContasPagarParaCompra(id);
                return compraAtualizada;
            });
        }

        const resultado = await prisma.$transaction(async (tx) => {
            // Processar cada item da compra (COMPOSICAO_ESTOQUE)
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
                    
                    // Gerar SKU único e aleatório
                    const skuGerado = await gerarSKUUnico(tx, item.ncm || null);

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
                            ncm: item.ncm ? String(item.ncm) : null, // ✅ NCM preservado do XML (NÃO alterado) // ✅ NCM do XML - sempre string
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

                if (materialIdFinal) {
                    await aprenderAlias(tx, {
                        materialId: materialIdFinal,
                        fornecedorId: compra.fornecedorId,
                        nomeProduto: item.nomeProduto,
                        codigoFornecedor: (item as any).codigoFornecedor,
                        ean: (item as any).ean,
                        ncm: item.ncm,
                        origem: associacao.criarNovo ? 'MANUAL' : 'MANUAL',
                    });
                }

                // ✅ Dar entrada no estoque (considerando fracionamento) - dentro da transação
                if (materialIdFinal) {
                    // ✅ PROCESSAR FRACIONAMENTO
                    const temFracionamento = (item as any).quantidadeFracionada && (item as any).quantidadeFracionada > 0;
                    const quantidadeParaEstoque = temFracionamento 
                        ? item.quantidade * (item as any).quantidadeFracionada // Quantidade de embalagens × unidades por embalagem
                        : item.quantidade; // Quantidade normal
                    
                    const observacoesEstoque = temFracionamento
                        ? `Compra NF: ${compra.numeroNF} - ${item.nomeProduto} - ${item.quantidade} ${(item as any).tipoEmbalagem || 'embalagens'} (${quantidadeParaEstoque} unidades)`
                        : `Compra NF: ${compra.numeroNF} - ${item.nomeProduto}`;
                    
                    // Incrementar estoque diretamente na transação
                    await tx.material.update({
                        where: { id: materialIdFinal },
                        data: {
                            estoque: {
                                increment: quantidadeParaEstoque
                            }
                        }
                    });
                    
                    // Registrar movimentação
                    await tx.movimentacaoEstoque.create({
                        data: {
                            materialId: materialIdFinal,
                            tipo: 'ENTRADA',
                            quantidade: quantidadeParaEstoque,
                            motivo: 'COMPRA',
                            referencia: id,
                            observacoes: observacoesEstoque
                        }
                    });
                    
                    // ✅ Marcar fracionamento como aplicado se houver
                    if (temFracionamento) {
                        await tx.compraItem.update({
                            where: { id: item.id },
                            data: {
                                fracionamentoAplicado: true
                            } as any
                        });
                        console.log(`✅ Fracionamento marcado como aplicado para item ${item.nomeProduto}`);
                    }
                    
                    if (temFracionamento) {
                        console.log(`✅ Entrada no estoque: ${item.nomeProduto} - ${item.quantidade} ${(item as any).tipoEmbalagem || 'embalagens'} = ${quantidadeParaEstoque} unidades`);
                    } else {
                        console.log(`✅ Entrada no estoque: ${item.nomeProduto} - Qtd: ${quantidadeParaEstoque}`);
                    }
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

        // ✅ CORREÇÃO CRÍTICA: Gerar contas a pagar após receber a compra
        // (se ainda não existirem) usando as duplicatas/condições salvas em xmlData
        await ComprasService.gerarContasPagarParaCompra(id);

        return resultado;
    }

    /**
     * Cancela uma compra e suas contas a pagar vinculadas
     */
    static async cancelarCompra(id: string) {
        const compra = await prisma.compra.findUnique({
            where: { id },
            include: {
                items: true
            }
        });

        if (!compra) {
            throw new Error('Compra não encontrada');
        }

        if (compra.status === 'Recebido') {
            throw new Error('Não é possível cancelar uma compra já recebida. Faça uma devolução.');
        }

        if (compra.status === 'Cancelado') {
            throw new Error('Esta compra já está cancelada.');
        }

        // Usar transação para garantir consistência
        return await prisma.$transaction(async (tx) => {
            // Cancelar todas as contas a pagar vinculadas a esta compra
            const contasPagar = await tx.contaPagar.findMany({
                where: { compraId: id }
            });

            if (contasPagar.length > 0) {
                console.log(`💰 Cancelando ${contasPagar.length} conta(s) a pagar vinculada(s) à compra ${id}`);
                
                for (const conta of contasPagar) {
                    // Só cancelar se ainda não estiver paga
                    if (conta.status !== 'Pago' && conta.status !== 'Cancelado') {
                        await tx.contaPagar.update({
                            where: { id: conta.id },
                            data: {
                                status: 'Cancelado',
                                updatedAt: new Date()
                            }
                        });
                        console.log(`✅ Conta a pagar ${conta.id} cancelada`);
                    }
                }
            }

            // Atualizar status da compra
            const compraCancelada = await tx.compra.update({
                where: { id },
                data: {
                    status: 'Cancelado',
                    updatedAt: new Date()
                }
            });

            console.log(`✅ Compra #${(compra as any).numeroSequencial} cancelada com sucesso`);
            return compraCancelada;
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

