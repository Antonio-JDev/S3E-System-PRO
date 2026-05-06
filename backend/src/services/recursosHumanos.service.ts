/**
 * Serviço de ESTOQUE de Recursos Humanos (EPIs, uniformes, itens vinculados a funcionários).
 * Usado pela aba "Estoque de Recursos Humanos" na Gestão empresarial.
 * Para folha de pagamento, benefícios e registro de ponto, use rh.service.ts (RhService).
 */
import { prisma } from '../lib/prisma';

export interface CriarRecursoHumanoDTO {
    compraId?: string;      // Opcional: entrada manual (item já na empresa, sem compra cadastrada)
    compraItemId?: string;
    nomeItem: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    funcionarioId?: string;
    observacoes?: string;
}

export interface AtualizarRecursoHumanoDTO {
    nomeItem?: string;
    quantidade?: number;
    valorUnitario?: number;
    valorTotal?: number;
    funcionarioId?: string;
    dataVinculacao?: Date;
    observacoes?: string;
    quantidadeMovimentacao?: number; // Quantidade movimentada em uma vinculação/desvinculação
}

export interface RegistrarEntregasRecursoHumanoDTO {
    funcionarioIds: string[];
    quantidadePorFuncionario?: number;
    dataEntrega?: Date;
    observacoes?: string;
}

export class RecursosHumanosService {
    /**
     * Lista todos os recursos humanos do estoque
     */
    static async listar(filtros?: {
        compraId?: string;
        funcionarioId?: string;
        semVinculacao?: boolean; // true = apenas itens sem funcionário vinculado
    }) {
        const where: any = {};

        if (filtros?.compraId) {
            where.compraId = filtros.compraId;
        }

        if (filtros?.funcionarioId) {
            where.funcionarioId = filtros.funcionarioId;
        }

        if (filtros?.semVinculacao === true) {
            where.funcionarioId = null;
        }

        const recursos = await (prisma as any).recursoHumanoEstoque.findMany({
            where,
            include: {
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true,
                        dataCompra: true,
                        dataRecebimento: true,
                        fornecedorNome: true
                    }
                },
                funcionario: {
                    select: {
                        id: true,
                        nome: true,
                        cargo: true,
                        cpf: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return recursos;
    }

    /**
     * Busca um recurso humano por ID
     */
    static async buscar(id: string) {
        const recurso = await (prisma as any).recursoHumanoEstoque.findUnique({
            where: { id },
            include: {
                compra: {
                    select: {
                        id: true,
                        numeroSequencial: true,
                        numeroNF: true,
                        dataCompra: true,
                        dataRecebimento: true,
                        fornecedorNome: true
                    }
                },
                funcionario: {
                    select: {
                        id: true,
                        nome: true,
                        cargo: true,
                        cpf: true
                    }
                }
            }
        });

        if (!recurso) {
            throw new Error('Recurso humano não encontrado');
        }

        return recurso;
    }

    /**
     * Cria um novo recurso humano no estoque.
     * Entrada manual: sem compraId (item já na empresa, compra antiga não cadastrada).
     * Entrada via compra: compraId obrigatório e compra deve ser RECURSOS_HUMANOS.
     */
    static async criar(data: CriarRecursoHumanoDTO) {
        if (data.compraId) {
            const compra = await prisma.compra.findUnique({
                where: { id: data.compraId }
            });

            if (!compra) {
                throw new Error('Compra não encontrada');
            }

            if ((compra as any).classificacao !== 'RECURSOS_HUMANOS') {
                throw new Error('A compra deve ter classificação RECURSOS_HUMANOS');
            }
        }

            if (data.funcionarioId) {
            const funcionario = await prisma.funcionario.findUnique({
                where: { id: data.funcionarioId }
            });

            if (!funcionario) {
                throw new Error('Funcionário não encontrado');
            }
        }

        const recurso = await prisma.$transaction(async (tx) => {
            const recurso = await (tx as any).recursoHumanoEstoque.create({
                data: {
                    compraId: data.compraId || null,
                    compraItemId: data.compraItemId || null,
                    nomeItem: data.nomeItem,
                    quantidade: data.quantidade,
                    valorUnitario: data.valorUnitario,
                    valorTotal: data.valorTotal,
                    funcionarioId: data.funcionarioId || null,
                    dataVinculacao: data.funcionarioId ? new Date() : null,
                    observacoes: data.observacoes || null
                },
                include: {
                    compra: {
                        select: {
                            id: true,
                            numeroSequencial: true,
                            numeroNF: true,
                            dataCompra: true,
                            fornecedorNome: true
                        }
                    },
                    funcionario: {
                        select: {
                            id: true,
                            nome: true,
                            cargo: true,
                            cpf: true
                        }
                    }
                }
            });

            // Registrar histórico se foi vinculado diretamente
            if (data.funcionarioId) {
                await (tx as any).historicoRecursoHumano.create({
                    data: {
                        recursoHumanoId: recurso.id,
                        funcionarioId: data.funcionarioId,
                        tipoMovimentacao: 'VINCULACAO',
                        quantidade: data.quantidade,
                        descricao: `Recurso criado e vinculado ao funcionário`,
                        dataMovimentacao: new Date()
                    }
                });
            } else {
                // Registrar recebimento sem vinculação
                await (tx as any).historicoRecursoHumano.create({
                    data: {
                        recursoHumanoId: recurso.id,
                        funcionarioId: null,
                        tipoMovimentacao: 'RECEBIMENTO',
                        quantidade: data.quantidade,
                        descricao: `Recurso recebido e adicionado ao estoque`,
                        dataMovimentacao: new Date()
                    }
                });
            }

            return recurso;
        });

        return recurso;
    }

    /**
     * Atualiza um recurso humano
     */
    static async atualizar(id: string, data: AtualizarRecursoHumanoDTO) {
        const recurso = await (prisma as any).recursoHumanoEstoque.findUnique({
            where: { id }
        });

        if (!recurso) {
            throw new Error('Recurso humano não encontrado');
        }

        // Verificar se funcionário existe (se fornecido)
        if (data.funcionarioId) {
            const funcionario = await prisma.funcionario.findUnique({
                where: { id: data.funcionarioId }
            });

            if (!funcionario) {
                throw new Error('Funcionário não encontrado');
            }
        }

        // Usar transação para garantir consistência
        const recursoAtualizado = await prisma.$transaction(async (tx) => {
            // Separar quantidadeMovimentacao para não tentar salvar esse campo na tabela
            const { quantidadeMovimentacao, ...rest } = data;

            // Se está vinculando a um funcionário, atualizar dataVinculacao
            const updateData: any = { ...rest };
            const estavaVinculado = !!recurso.funcionarioId;
            const vaiVincular = !!data.funcionarioId;
            const quantidadeMov = typeof quantidadeMovimentacao === 'number' ? quantidadeMovimentacao : 0;
            
            if (vaiVincular && !estavaVinculado) {
                // Saída de estoque (entrega para funcionário)
                if (quantidadeMov > 0) {
                    if (quantidadeMov > recurso.quantidade) {
                        throw new Error('Quantidade insuficiente em estoque para esta entrega');
                    }
                    updateData.quantidade = recurso.quantidade - quantidadeMov;
                }
                // Nova vinculação
                updateData.dataVinculacao = new Date();
            } else if (!vaiVincular && estavaVinculado) {
                // Entrada de estoque (devolução do funcionário)
                if (quantidadeMov > 0) {
                    updateData.quantidade = recurso.quantidade + quantidadeMov;
                }
                // Desvinculação
                updateData.dataVinculacao = null;
            } else if (vaiVincular && estavaVinculado && data.funcionarioId !== recurso.funcionarioId) {
                // Troca de funcionário
                updateData.dataVinculacao = new Date();
            }

            const recursoAtualizado = await (tx as any).recursoHumanoEstoque.update({
                where: { id },
                data: updateData,
                include: {
                    compra: {
                        select: {
                            id: true,
                            numeroSequencial: true,
                            numeroNF: true,
                            dataCompra: true,
                            fornecedorNome: true
                        }
                    },
                    funcionario: {
                        select: {
                            id: true,
                            nome: true,
                            cargo: true,
                            cpf: true
                        }
                    }
                }
            });

            // Registrar histórico
            if (vaiVincular && !estavaVinculado) {
                // Nova vinculação
                await (tx as any).historicoRecursoHumano.create({
                    data: {
                        recursoHumanoId: id,
                        funcionarioId: data.funcionarioId,
                        tipoMovimentacao: 'VINCULACAO',
                        quantidade: data.quantidadeMovimentacao,
                        descricao: `Recurso vinculado ao funcionário`,
                        dataMovimentacao: new Date()
                    }
                });
            } else if (!vaiVincular && estavaVinculado) {
                // Desvinculação
                await (tx as any).historicoRecursoHumano.create({
                    data: {
                        recursoHumanoId: id,
                        funcionarioId: recurso.funcionarioId,
                        tipoMovimentacao: 'DESVINCULACAO',
                        quantidade: data.quantidadeMovimentacao,
                        descricao: `Recurso desvinculado do funcionário`,
                        dataMovimentacao: new Date()
                    }
                });
            } else if (vaiVincular && estavaVinculado && data.funcionarioId !== recurso.funcionarioId) {
                // Troca de funcionário - registrar desvinculação e nova vinculação
                await (tx as any).historicoRecursoHumano.create({
                    data: {
                        recursoHumanoId: id,
                        funcionarioId: recurso.funcionarioId,
                        tipoMovimentacao: 'DESVINCULACAO',
                        quantidade: data.quantidadeMovimentacao,
                        descricao: `Recurso transferido para outro funcionário`,
                        dataMovimentacao: new Date()
                    }
                });
                await (tx as any).historicoRecursoHumano.create({
                    data: {
                        recursoHumanoId: id,
                        funcionarioId: data.funcionarioId,
                        tipoMovimentacao: 'VINCULACAO',
                        quantidade: data.quantidadeMovimentacao,
                        descricao: `Recurso vinculado ao funcionário`,
                        dataMovimentacao: new Date()
                    }
                });
            }

            return recursoAtualizado;
        });

        return recursoAtualizado;
    }

    /**
     * Exclui um recurso humano
     */
    static async excluir(id: string) {
        const recurso = await (prisma as any).recursoHumanoEstoque.findUnique({
            where: { id }
        });

        if (!recurso) {
            throw new Error('Recurso humano não encontrado');
        }

        await (prisma as any).recursoHumanoEstoque.delete({
            where: { id }
        });

        return { message: 'Recurso humano excluído com sucesso' };
    }

    /**
     * Cria recursos humanos automaticamente a partir de uma compra de classificação RECURSOS_HUMANOS
     */
    static async criarRecursosDeCompra(compraId: string) {
        const compra = await prisma.compra.findUnique({
            where: { id: compraId },
            include: {
                items: true
            }
        });

        if (!compra) {
            throw new Error('Compra não encontrada');
        }

        if ((compra as any).classificacao !== 'RECURSOS_HUMANOS') {
            throw new Error('A compra deve ter classificação RECURSOS_HUMANOS');
        }

        // Verificar se já existem recursos criados para esta compra
        const recursosExistentes = await (prisma as any).recursoHumanoEstoque.count({
            where: { compraId }
        });

        if (recursosExistentes > 0) {
            throw new Error('Recursos humanos já foram criados para esta compra');
        }

        // Criar recursos humanos para cada item da compra
        const recursosCriados = await Promise.all(
            compra.items.map(item =>
                (prisma as any).recursoHumanoEstoque.create({
                    data: {
                        compraId: compra.id,
                        compraItemId: item.id,
                        nomeItem: item.nomeProduto,
                        quantidade: item.quantidade,
                        valorUnitario: item.valorUnit,
                        valorTotal: item.valorTotal,
                        funcionarioId: null, // Inicialmente sem vinculação
                        observacoes: null
                    }
                })
            )
        );

        return recursosCriados;
    }

    /**
     * Busca histórico de um recurso humano
     */
    static async buscarHistorico(recursoHumanoId: string) {
        const historico = await (prisma as any).historicoRecursoHumano.findMany({
            where: { recursoHumanoId },
            include: {
                funcionario: {
                    select: {
                        id: true,
                        nome: true,
                        cargo: true,
                        cpf: true
                    }
                }
            },
            orderBy: {
                dataMovimentacao: 'desc'
            }
        });

        return historico;
    }

    /**
     * Busca histórico de um funcionário
     */
    static async buscarHistoricoPorFuncionario(funcionarioId: string) {
        const historico = await (prisma as any).historicoRecursoHumano.findMany({
            where: { funcionarioId },
            include: {
                recursoHumano: {
                    include: {
                        compra: {
                            select: {
                                id: true,
                                numeroSequencial: true,
                                numeroNF: true,
                                dataCompra: true,
                                fornecedorNome: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                dataMovimentacao: 'desc'
            }
        });

        return historico;
    }

    /**
     * Registra a entrega de um recurso para múltiplos funcionários de uma vez.
     * Cada funcionário recebe a mesma quantidade (quantidadePorFuncionario).
     */
    static async registrarEntregas(
        recursoHumanoId: string,
        data: RegistrarEntregasRecursoHumanoDTO
    ) {
        const idsUnicos = Array.from(
            new Set(
                (Array.isArray(data.funcionarioIds) ? data.funcionarioIds : [])
                    .map((id) => String(id || '').trim())
                    .filter(Boolean)
            )
        );

        if (idsUnicos.length === 0) {
            throw new Error('Informe ao menos um funcionário para registrar a entrega');
        }

        const quantidadePorFuncionario =
            typeof data.quantidadePorFuncionario === 'number' ? data.quantidadePorFuncionario : 1;

        if (!Number.isFinite(quantidadePorFuncionario) || quantidadePorFuncionario <= 0) {
            throw new Error('Quantidade por funcionário deve ser maior que zero');
        }

        const recurso = await (prisma as any).recursoHumanoEstoque.findUnique({
            where: { id: recursoHumanoId }
        });

        if (!recurso) {
            throw new Error('Recurso humano não encontrado');
        }

        const funcionarios = await prisma.funcionario.findMany({
            where: { id: { in: idsUnicos } },
            select: { id: true, nome: true }
        });

        if (funcionarios.length !== idsUnicos.length) {
            throw new Error('Um ou mais funcionários informados não foram encontrados');
        }

        const quantidadeTotal = quantidadePorFuncionario * idsUnicos.length;
        if (quantidadeTotal > Number(recurso.quantidade)) {
            throw new Error(
                `Quantidade insuficiente em estoque. Disponível: ${recurso.quantidade}, necessário: ${quantidadeTotal}`
            );
        }

        const dataMovimentacao = data.dataEntrega ?? new Date();

        const recursoAtualizado = await prisma.$transaction(async (tx) => {
            const atualizado = await (tx as any).recursoHumanoEstoque.update({
                where: { id: recursoHumanoId },
                data: {
                    quantidade: Number(recurso.quantidade) - quantidadeTotal,
                    // Mantém compatibilidade com o modelo atual, sem forçar vínculo único.
                    funcionarioId: null,
                    dataVinculacao: dataMovimentacao
                },
                include: {
                    compra: {
                        select: {
                            id: true,
                            numeroSequencial: true,
                            numeroNF: true,
                            dataCompra: true,
                            fornecedorNome: true
                        }
                    },
                    funcionario: {
                        select: {
                            id: true,
                            nome: true,
                            cargo: true,
                            cpf: true
                        }
                    }
                }
            });

            await (tx as any).historicoRecursoHumano.createMany({
                data: idsUnicos.map((funcionarioId) => ({
                    recursoHumanoId,
                    funcionarioId,
                    tipoMovimentacao: 'VINCULACAO',
                    quantidade: quantidadePorFuncionario,
                    descricao: `Entrega registrada para colaborador (${quantidadePorFuncionario} un.)`,
                    dataMovimentacao,
                    observacoes: data.observacoes || null
                }))
            });

            return atualizado;
        });

        return {
            recurso: recursoAtualizado,
            quantidadeTotalEntregue: quantidadeTotal,
            funcionariosImpactados: funcionarios.length
        };
    }
}
