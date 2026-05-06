import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { axiosApiService } from '../services/axiosApi';
import { identificarTipoMaterial, podeVenderEmMetroOuCm } from '../utils/unitConverter';
import { servicosService, Servico } from '../services/servicosService';
import { matchCrossSearch } from '../utils/searchUtils';
import { roundMoney } from '../utils/currency';

// Icons
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const WrenchScrewdriverIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
);

interface Material {
    id: string;
    nome: string;
    descricao?: string;
    preco: number;
    estoque: number;
    unidadeMedida: string;
    ativo?: boolean;
    _isCotacao?: boolean;
    _cotacaoId?: string;
    _itemCotacaoId?: string;
    _dataUltimaCotacao?: string;
}

interface ItemKit {
    materialId: string;
    nome: string;
    quantidade: number;
    precoUnit: number;
    subtotal: number;
    unidadeMedida: string;
    unidadeVenda?: string; // ✅ NOVO: Unidade de venda
    tipoMaterial?: 'BARRAMENTO_COBRE' | 'TRILHO_DIN' | 'CABO' | 'PADRAO'; // ✅ NOVO: Tipo para conversão
    isCotacao: boolean;
    isServico?: boolean; // ✅ NOVO: Indica se é um serviço
    dataUltimaCotacao?: string;
}

interface CriacaoKitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    kitParaEditar?: any;
}

const CriacaoKitModal: React.FC<CriacaoKitModalProps> = ({ isOpen, onClose, onSave, kitParaEditar }) => {
    const [nomeKit, setNomeKit] = useState('');
    const [descricaoKit, setDescricaoKit] = useState('');
    const [tipoKit, setTipoKit] = useState<string>('medidores');
    const [searchTerm, setSearchTerm] = useState('');
    const [fonteDados, setFonteDados] = useState<'ESTOQUE' | 'COTACOES' | 'SERVICOS'>('ESTOQUE');
    
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [cotacoes, setCotacoes] = useState<Material[]>([]);
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [itensKit, setItensKit] = useState<ItemKit[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const modoEdicao = !!kitParaEditar;

    useEffect(() => {
        if (isOpen) {
            loadMateriais();
            loadCotacoes();
            loadServicos();
            
            // Se tem kit para editar, carregar seus dados
            if (kitParaEditar) {
                setNomeKit(kitParaEditar.nome || '');
                setDescricaoKit(kitParaEditar.descricao || '');
                setTipoKit(kitParaEditar.tipo || 'medidores');
                
                // Carregar itens do estoque real - usar valorVenda se disponível (sempre 2 decimais)
                const itensEstoque: ItemKit[] = (kitParaEditar.items || []).map((item: any) => {
                    const precoVenda = roundMoney(item.material?.valorVenda || item.material?.preco || 0);
                    return {
                        materialId: item.material?.id || item.materialId,
                        nome: item.material?.nome || 'Material',
                        quantidade: item.quantidade,
                        precoUnit: precoVenda,
                        subtotal: roundMoney(item.quantidade * precoVenda),
                        unidadeMedida: item.material?.unidadeMedida || 'un',
                        isCotacao: false
                    };
                });
                
                // Carregar itens do banco frio

                // Garantir que itensFaltantes seja um array
                let itensFaltantesArray: any[] = [];
                if (kitParaEditar.itensFaltantes) {
                    if (typeof kitParaEditar.itensFaltantes === 'string') {
                        try {
                            const parsed = JSON.parse(kitParaEditar.itensFaltantes);
                            itensFaltantesArray = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            console.error('Erro ao fazer parse de itensFaltantes:', e);
                            itensFaltantesArray = [];
                        }
                    } else if (Array.isArray(kitParaEditar.itensFaltantes)) {
                        itensFaltantesArray = kitParaEditar.itensFaltantes;
                    } else if (typeof kitParaEditar.itensFaltantes === 'object') {
                        // Se for um objeto único, converter para array
                        itensFaltantesArray = [kitParaEditar.itensFaltantes];
                    }
                }
                
                console.log('📦 Carregando kit para edição:');
                console.log('   - Itens estoque:', itensEstoque.length);
                console.log('   - Itens banco frio (itensFaltantes):', itensFaltantesArray.length);
                console.log('   - Detalhes banco frio:', itensFaltantesArray);
                
                // Separar itens do banco frio e serviços
                const itensBancoFrio: ItemKit[] = [];
                const itensServicos: ItemKit[] = [];
                
                itensFaltantesArray.forEach((item: any) => {
                    // Se tem tipo 'SERVICO', é um serviço
                    if (item.tipo === 'SERVICO') {
                        const pu = roundMoney(item.precoUnit || item.preco || 0);
                        const q = item.quantidade || 0;
                        itensServicos.push({
                            materialId: `servico_${item.servicoId || item.id || ''}`,
                            nome: item.nome || item.servicoNome || 'Serviço',
                            quantidade: q,
                            precoUnit: pu,
                            subtotal: roundMoney(q * pu),
                            unidadeMedida: item.unidadeMedida || item.unidade || 'un',
                            isCotacao: false,
                            isServico: true
                        });
                    } else {
                        // É um item do banco frio (cotação) - sempre 2 decimais
                        const pu = roundMoney(item.precoUnit || item.preco || 0);
                        const q = item.quantidade || 0;
                        itensBancoFrio.push({
                            materialId: `cotacao_${item.cotacaoId || item.id || ''}`,
                            nome: item.nome || item.materialNome || 'Item do Banco Frio',
                            quantidade: q,
                            precoUnit: pu,
                            subtotal: roundMoney(q * pu),
                            unidadeMedida: item.unidadeMedida || 'un',
                            isCotacao: true,
                            dataUltimaCotacao: item.dataUltimaCotacao || item.dataAtualizacao
                        });
                    }
                });
                
                setItensKit([...itensEstoque, ...itensBancoFrio, ...itensServicos]);
            }
        } else {
            // Reset ao fechar
            setNomeKit('');
            setDescricaoKit('');
            setTipoKit('medidores');
            setSearchTerm('');
            setFonteDados('ESTOQUE');
            setItensKit([]);
        }
    }, [isOpen, kitParaEditar]);

    // Atualizar preços dos itens do kit quando materiais forem recarregados
    useEffect(() => {
        if (materiais.length > 0 && itensKit.length > 0) {
            // Atualizar preços dos itens que não são do banco frio
            setItensKit(prev => prev.map(item => {
                if (item.isCotacao) return item; // Não atualizar itens do banco frio
                
                // Buscar material atualizado
                const materialAtualizado = materiais.find(m => m.id === item.materialId);
                if (materialAtualizado) {
                    const novoPreco = roundMoney((materialAtualizado as any).valorVenda || materialAtualizado.preco || item.precoUnit);
                    return {
                        ...item,
                        precoUnit: novoPreco,
                        subtotal: roundMoney(item.quantidade * novoPreco)
                    };
                }
                return item;
            }));
        }
    }, [materiais]);

    const loadMateriais = async () => {
        try {
            setLoading(true);
            const response = await axiosApiService.get('/api/materiais');
            if (response.success && response.data) {
                const materiaisArray = Array.isArray(response.data) ? response.data : [];
                setMateriais(materiaisArray.map((m: any) => ({
                    id: m.id,
                    nome: m.nome || m.descricao,
                    descricao: m.descricao,
                    preco: m.preco || 0,
                    valorVenda: m.valorVenda || null, // Incluir valorVenda para atualização dinâmica
                    valorVendaM: m.valorVendaM || null, // Valor de venda em metros
                    valorVendaCM: m.valorVendaCM || null, // Valor de venda em centímetros
                    estoque: m.estoque || 0,
                    unidadeMedida: m.unidadeMedida || m.unidade || 'un',
                    ativo: m.ativo !== false // Incluir materiais do estoque na busca (default ativo se não informado)
                })));
            }
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
            toast.error('Erro ao carregar materiais do estoque');
        } finally {
            setLoading(false);
        }
    };

    const loadCotacoes = async () => {
        try {
            const response = await axiosApiService.get('/api/cotacoes');
            console.log('📦 Resposta cotações:', response);
            
            if (response.success && response.data) {
                const cotacoesArray = Array.isArray(response.data) ? response.data : [];
                console.log(`📋 Total de cotações brutas: ${cotacoesArray.length}`);
                
                // Cada cotação É um item individual, não tem items dentro dela
                const cotacoesFormatadas = cotacoesArray
                    .filter((cotacao: any) => cotacao.ativo) // Só cotações ativas
                    .map((cotacao: any) => {
                        console.log(`📄 Cotação ${cotacao.id}:`, cotacao);
                        // Valor de venda: usar o salvo (já com coeficiente 1.55 do sistema) ou fallback compra × 1.55
                        const valorVenda = cotacao.valorVenda ?? Math.round((cotacao.valorUnitario || 0) * 1.55 * 100) / 100;
                        return {
                            id: `cotacao_${cotacao.id}`,
                            nome: cotacao.nome || 'Item da Cotação',
                            descricao: cotacao.nome,
                            // preco representa o valor de compra; valorVenda é o preço para o cliente
                            preco: cotacao.valorUnitario || 0,
                            valorVenda,
                            valorVendaM: cotacao.valorVendaM || null, // Valor de venda em metros
                            valorVendaCM: cotacao.valorVendaCM || null, // Valor de venda em centímetros
                            estoque: 0, // Cotações não têm estoque físico
                            unidadeMedida: cotacao.unidadeMedida || 'un',
                            _isCotacao: true,
                            _cotacaoId: cotacao.id,
                            _itemCotacaoId: cotacao.id,
                            _dataUltimaCotacao: cotacao.dataAtualizacao || cotacao.updatedAt || cotacao.createdAt,
                            _fornecedorNome: cotacao.fornecedorNome || 'Sem fornecedor'
                        };
                    });
                
                console.log(`✅ ${cotacoesFormatadas.length} itens de cotações formatados`);
                setCotacoes(cotacoesFormatadas);
                
                if (cotacoesFormatadas.length > 0) {
                    console.log('📝 Exemplo de item:', cotacoesFormatadas[0]);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar cotações:', error);
            toast.error('Erro ao carregar itens do banco frio');
        }
    };

    const loadServicos = async () => {
        try {
            const response = await servicosService.listar({ ativo: true });
            
            if (response.success && response.data) {
                const servicosArray = Array.isArray(response.data) ? response.data : [];
                setServicos(servicosArray);
                console.log(`✅ ${servicosArray.length} serviços carregados`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar serviços:', error);
            toast.error('Erro ao carregar serviços');
        }
    };

    // Resultados combinados de busca cruzada (Estoque, Banco Frio e Serviços) — igual à página de orçamentos
    const resultadosBuscaUniversal = useMemo(() => {
        const termo = searchTerm.trim();
        if (!termo) return [];

        const termoLower = termo.toLowerCase();
        const list: any[] = [];

        // Materiais do estoque real — busca cruzada (palavra * ou % segunda palavra)
        (materiais || []).filter(m => m && (m as any).ativo !== false).forEach(m => {
            if (matchCrossSearch(termo, m.nome || '') || (m.descricao || '').toLowerCase().includes(termoLower) || (m.id || '').toLowerCase().includes(termoLower)) {
                list.push({ tipo: 'MATERIAL', raw: m, id: m.id, descricao: m.nome });
            }
        });

        // Cotações (banco frio)
        (cotacoes || []).forEach(c => {
            if (matchCrossSearch(termo, c.nome || '') || (c.descricao || '').toLowerCase().includes(termoLower) || (c.id || '').toLowerCase().includes(termoLower)) {
                list.push({ tipo: 'COTACAO', raw: c, id: c.id, descricao: c.nome });
            }
        });

        // Serviços
        (servicos || []).forEach(s => {
            if (matchCrossSearch(termo, s.nome || '') || (s.descricao || '').toLowerCase().includes(termoLower) || (s.codigo || '').toLowerCase().includes(termoLower)) {
                list.push({ tipo: 'SERVICO', raw: s, id: s.id, descricao: s.nome });
            }
        });

        return list;
    }, [materiais, cotacoes, servicos, searchTerm]);

    const materiaisFiltrados = useMemo(() => {
        if (fonteDados === 'SERVICOS') {
            if (!searchTerm) {
                return servicos;
            }
            return servicos.filter(s => 
                s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                s.codigo.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        const fonte = fonteDados === 'ESTOQUE' ? materiais : cotacoes;
        
        if (!searchTerm) {
            // Não filtrar por estoque aqui — permitir selecionar materiais esgotados também
            return fonte;
        }
        
        return fonte.filter(m => {
            return (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (m.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                 m.id.toLowerCase().includes(searchTerm.toLowerCase()));
        });
    }, [materiais, cotacoes, servicos, fonteDados, searchTerm]);

    const valorTotal = useMemo(() => {
        return roundMoney(itensKit.reduce((total, item) => total + item.subtotal, 0));
    }, [itensKit]);

    const handleAdicionarItem = (material: Material, unidadeVendaParam?: string) => {
        try {
            // Verificar se já existe
            const jaExiste = itensKit.some(item => item.materialId === material.id);
            if (jaExiste) {
                toast.warning('Item já adicionado', {
                    description: 'Este material já está no kit'
                });
                return;
            }

            const unidadeVenda = unidadeVendaParam || material.unidadeMedida;

            // Determinar preço de venda baseado na unidade
            let precoVenda = material.preco || 0;
            
            // Se a unidade de medida permitir venda em M/cm, usar valores específicos
            if (podeVenderEmMetroOuCm(material.unidadeMedida)) {
                if (unidadeVenda === 'm') {
                    // Usar valorVendaM se disponível, senão usar valorVenda padrão ou preço
                    precoVenda = (material as any).valorVendaM || (material as any).valorVenda || material.preco || 0;
                } else if (unidadeVenda === 'cm') {
                    // Usar valorVendaCM se disponível, senão calcular dividindo valorVendaM por 100
                    precoVenda = (material as any).valorVendaCM || 
                                ((material as any).valorVendaM ? (material as any).valorVendaM / 100 : 
                                ((material as any).valorVenda ? (material as any).valorVenda / 100 : (material.preco || 0) / 100));
                }
            } else {
                // Para outras unidades, usar valorVenda padrão se disponível
                precoVenda = (material as any).valorVenda || material.preco || 0;
            }
            precoVenda = roundMoney(precoVenda);
            
            const novoItem: ItemKit = {
                materialId: material.id,
                nome: material.nome,
                quantidade: 1,
                precoUnit: precoVenda,
                subtotal: precoVenda,
                unidadeMedida: material.unidadeMedida,
                unidadeVenda: unidadeVenda,
                isCotacao: material._isCotacao || false,
                dataUltimaCotacao: material._dataUltimaCotacao
            };

            setItensKit(prev => [...prev, novoItem]);
            toast.success('Item adicionado ao kit', {
                description: `${material.nome} (${unidadeVenda})`,
                icon: '✅'
            });
        } catch (error) {
            console.error('❌ Erro ao adicionar item ao kit:', error);
            toast.error('Erro ao adicionar item ao kit', {
                description: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        }
    };

    const handleAdicionarServico = (servico: Servico) => {
        // Verificar se já existe
        const jaExiste = itensKit.some(item => item.materialId === `servico_${servico.id}`);
        if (jaExiste) {
            toast.warning('Serviço já adicionado', {
                description: 'Este serviço já está no kit'
            });
            return;
        }

        const precoServico = roundMoney(servico.preco || 0);
        const novoItem: ItemKit = {
            materialId: `servico_${servico.id}`,
            nome: servico.nome,
            quantidade: 1,
            precoUnit: precoServico,
            subtotal: precoServico,
            unidadeMedida: servico.unidade || 'un',
            isCotacao: false,
            isServico: true
        };

        setItensKit(prev => [...prev, novoItem]);
        toast.success('Serviço adicionado ao kit', {
            description: `${servico.nome}`,
            icon: '✅'
        });
    };

    const handleRemoverItem = (index: number) => {
        setItensKit(prev => prev.filter((_, i) => i !== index));
        toast.success('Item removido do kit');
    };

    const handleAlterarQuantidade = (index: number, quantidade: number) => {
        // Permitir quantidades decimais menores que 1 (ex: 0.5, 0.2, 0.7)
        // Apenas bloquear valores não-positivos
        if (quantidade <= 0) return;

        setItensKit(prev => prev.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    quantidade,
                    subtotal: roundMoney(quantidade * item.precoUnit)
                };
            }
            return item;
        }));
    };

    const handleSalvarKit = async () => {
        // Validações
        if (!nomeKit.trim()) {
            toast.error('Nome obrigatório', {
                description: 'Por favor, informe o nome do kit'
            });
            return;
        }

        if (itensKit.length === 0) {
            toast.error('Kit vazio', {
                description: 'Adicione pelo menos um material ao kit'
            });
            return;
        }

        try {
            setIsSaving(true);

            // Separar itens de estoque real, banco frio e serviços
            const itensBancoFrio = itensKit.filter(item => item.isCotacao && !item.isServico);
            const itensServicos = itensKit.filter(item => item.isServico);
            const itensEstoqueReal = itensKit.filter(item => !item.isCotacao && !item.isServico);

            // Combinar banco frio e serviços em um único array para o backend
            const itensExtras: any[] = [];
            
            // Adicionar itens do banco frio (precoUnit sempre 2 decimais)
            if (itensBancoFrio.length > 0) {
                itensExtras.push(...itensBancoFrio.map(item => ({
                    cotacaoId: item.materialId.replace('cotacao_', ''), // Remove prefixo
                    nome: item.nome,
                    quantidade: item.quantidade,
                    precoUnit: roundMoney(item.precoUnit),
                    dataUltimaCotacao: item.dataUltimaCotacao,
                    tipo: 'COTACAO' as const
                })));
            }
            
            // Adicionar serviços (precoUnit sempre 2 decimais)
            if (itensServicos.length > 0) {
                itensExtras.push(...itensServicos.map(item => ({
                    servicoId: item.materialId.replace('servico_', ''), // Remove prefixo
                    nome: item.nome,
                    quantidade: item.quantidade,
                    precoUnit: roundMoney(item.precoUnit),
                    tipo: 'SERVICO' as const
                })));
            }

            const kitData = {
                nome: nomeKit,
                descricao: descricaoKit,
                tipo: tipoKit,
                preco: valorTotal, // já roundMoney no useMemo
                items: itensEstoqueReal.map(item => ({
                    materialId: item.materialId,
                    quantidade: item.quantidade
                })),
                // Combinar banco frio e serviços em um único array
                itensBancoFrio: itensExtras.length > 0 ? itensExtras : undefined,
                temItensCotacao: itensBancoFrio.length > 0 || itensServicos.length > 0
            };

            console.log('📤 Enviando kit para o backend:', kitData);
            console.log('   - Itens estoque real:', kitData.items.length);
            console.log('   - Itens banco frio:', itensBancoFrio.length);
            console.log('   - Serviços:', itensServicos.length);
            console.log('   - Total itens extras (banco frio + serviços):', itensExtras.length);
            if (kitData.itensBancoFrio) {
                console.log('   - Detalhes itens extras:', kitData.itensBancoFrio);
            }

            let response;
            if (modoEdicao && kitParaEditar) {
                // Atualizar kit existente
                response = await axiosApiService.put(`/api/kits/${kitParaEditar.id}`, kitData);
            } else {
                // Criar novo kit
                response = await axiosApiService.post('/api/kits', kitData);
            }

            console.log('📥 Resposta do backend:', response);

            if (response.success) {
                const temCotacao = itensBancoFrio.length > 0;
                const temServicos = itensServicos.length > 0;
                let descricao = `Kit "${nomeKit}" ${modoEdicao ? 'atualizado' : 'adicionado ao catálogo'}`;
                if (temCotacao || temServicos) {
                    const partes: string[] = [];
                    if (temCotacao) partes.push(`${itensBancoFrio.length} item(ns) do banco frio`);
                    if (temServicos) partes.push(`${itensServicos.length} serviço(s)`);
                    descricao = `⚠️ Kit contém ${partes.join(' e ')}. ${temCotacao ? 'Compre os itens do banco frio' : ''} para usar em obras.`;
                }
                toast.success(modoEdicao ? 'Kit atualizado com sucesso!' : 'Kit criado com sucesso!', {
                    description: descricao,
                    icon: '✅',
                    duration: (temCotacao || temServicos) ? 6000 : 4000
                });
                onSave();
                onClose();
            } else {
                toast.error(modoEdicao ? 'Erro ao atualizar kit' : 'Erro ao criar kit', {
                    description: response.error || 'Erro desconhecido'
                });
            }
        } catch (error: any) {
            console.error('Erro ao salvar kit:', error);
            toast.error('Erro ao criar kit', {
                description: error?.response?.data?.error || error.message || 'Erro desconhecido'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-strong max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="relative p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-gray-700 dark:to-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-medium">
                            <WrenchScrewdriverIcon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {modoEdicao ? 'Editar Kit' : 'Criar Novo Kit'}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {modoEdicao 
                                    ? 'Atualize a composição e informações do kit'
                                    : 'Monte um kit com materiais cadastrados, cotações ou serviços — pode incluir itens mesmo com estoque zerado'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Informações Básicas do Kit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Nome do Kit *
                            </label>
                            <input
                                type="text"
                                value={nomeKit}
                                onChange={(e) => setNomeKit(e.target.value)}
                                placeholder="Ex: Kit Medidor Padrão Cemig"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Tipo do Kit *
                            </label>
                            <select
                                value={tipoKit}
                                onChange={(e) => setTipoKit(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="medidores">Medidores</option>
                                <option value="comando">Comando</option>
                                <option value="quadro-eletrico">Quadro Elétrico</option>
                                <option value="subestacoes">Subestações</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Descrição (Opcional)
                        </label>
                        <textarea
                            value={descricaoKit}
                            onChange={(e) => setDescricaoKit(e.target.value)}
                            placeholder="Descreva os componentes e finalidade deste kit..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Fonte de Dados */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 p-4 rounded-xl border border-blue-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-white">Fonte de Dados</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {fonteDados === 'ESTOQUE' && 'Materiais cadastrados no sistema (independente da quantidade em estoque)'}
                                    {fonteDados === 'COTACOES' && 'Usando materiais do banco frio (cotações)'}
                                    {fonteDados === 'SERVICOS' && 'Usando serviços disponíveis'}
                                </p>
                                {fonteDados === 'ESTOQUE' && (
                                    <p className="text-xs text-green-700 dark:text-green-300 mt-2 font-medium">
                                        ✓ Qualquer material cadastrado pode ser adicionado ao kit, mesmo com estoque zerado.
                                    </p>
                                )}
                                {fonteDados === 'COTACOES' && (
                                    <p className="text-xs text-blue-700 mt-2 font-medium">
                                        ℹ️ Itens do banco frio podem ser adicionados ao kit. Eles devem ser comprados antes de usar em obras.
                                    </p>
                                )}
                                {fonteDados === 'SERVICOS' && (
                                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-2 font-medium">
                                        ℹ️ Serviços podem ser adicionados ao kit para criar kits personalizados completos.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => {
                                        setFonteDados('ESTOQUE');
                                        setSearchTerm(''); // Limpar busca ao trocar
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        fonteDados === 'ESTOQUE'
                                            ? 'bg-green-600 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <span>📦</span>
                                    Estoque Real
                                </button>
                                <button
                                    onClick={() => {
                                        setFonteDados('COTACOES');
                                        setSearchTerm(''); // Limpar busca ao trocar
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        fonteDados === 'COTACOES'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <span>❄️</span>
                                    Banco Frio (Cotações)
                                </button>
                                <button
                                    onClick={() => {
                                        setFonteDados('SERVICOS');
                                        setSearchTerm(''); // Limpar busca ao trocar
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        fonteDados === 'SERVICOS'
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <span>⚙️</span>
                                    Serviços
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Layout em 2 colunas: Lista de materiais disponíveis + Itens do Kit */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Coluna 1: Materiais Disponíveis */}
                        <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-gray-800 dark:text-white">
                                    {fonteDados === 'SERVICOS' ? 'Serviços Disponíveis' : 'Materiais Cadastrados'}
                                </h3>
                                <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {searchTerm.trim() ? resultadosBuscaUniversal.length : (fonteDados === 'ESTOQUE' ? materiais.length : fonteDados === 'COTACOES' ? cotacoes.length : servicos.length)} disponíveis
                                </span>
                            </div>
                            
                            {/* Campo de busca */}
                            <div className="relative mb-4">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={fonteDados === 'SERVICOS' ? 'Buscar serviço (ex: palavra * outra)...' : 'Buscar material (ex: palavra * ou % outra)...'}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Lista de materiais ou serviços */}
                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 dark:border-teal-400 mx-auto"></div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                            {fonteDados === 'SERVICOS' ? 'Carregando serviços...' : 'Carregando materiais...'}
                                        </p>
                                    </div>
                                ) : (searchTerm.trim() ? (
                                    // Resultado da busca universal (Materiais, Cotações, Serviços)
                                    resultadosBuscaUniversal.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                                Nenhum item encontrado
                                            </p>
                                        </div>
                                    ) : (
                                        resultadosBuscaUniversal.map((linha: any) => (
                                            <div
                                                key={linha.id}
                                                className={`p-3 rounded-lg border ${linha.tipo === 'SERVICO' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700' : linha.tipo === 'COTACAO' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' : 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600'}`}
                                            >
                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {linha.tipo === 'SERVICO' && <span className="text-lg">⚙️</span>}
                                                            {linha.tipo === 'COTACAO' && <span className="text-lg">❄️</span>}
                                                            <p className={`font-medium text-sm truncate ${linha.tipo === 'SERVICO' ? 'text-purple-900' : linha.tipo === 'COTACAO' ? 'text-blue-900' : 'text-gray-900'}`}>
                                                                {linha.descricao}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            {linha.tipo === 'MATERIAL' && (
                                                                <span className="text-xs text-gray-600">
                                                                    Estoque: {(linha.raw as any).estoque ?? 0} {(linha.raw as any).unidadeMedida || 'un'}
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-semibold text-teal-700">
                                                                R$ {(((linha.raw as any).valorVenda || (linha.raw as any).preco) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {linha.tipo === 'SERVICO' ? (
                                                            <button onClick={() => handleAdicionarServico(linha.raw)} className="p-2 text-purple-600 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors">
                                                                <PlusIcon className="w-5 h-5" />
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleAdicionarItem(linha.raw)} className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors">
                                                                <PlusIcon className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )
                                ) : materiaisFiltrados.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                                            {fonteDados === 'ESTOQUE' 
                                                ? 'Nenhum material cadastrado encontrado' 
                                                : fonteDados === 'COTACOES'
                                                ? 'Nenhum item de cotação encontrado'
                                                : 'Nenhum serviço encontrado'}
                                        </p>
                                        {fonteDados === 'COTACOES' && cotacoes.length === 0 && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                Importe cotações na página de Cotações para usar itens do banco frio
                                            </p>
                                        )}
                                        {fonteDados === 'SERVICOS' && servicos.length === 0 && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                                Cadastre serviços na página de Serviços para adicionar ao kit
                                            </p>
                                        )}
                                    </div>
                                ) : fonteDados === 'SERVICOS' ? (
                                    // Lista de serviços
                                    (materiaisFiltrados as any[]).map((servico: Servico) => (
                                        <div
                                            key={servico.id}
                                            className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-700"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                        {servico.nome}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                                            Código: {servico.codigo}
                                                        </span>
                                                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                                            R$ {(servico.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        <span className="text-xs text-gray-600 dark:text-gray-400">
                                                            Unidade: {servico.unidade || 'un'}
                                                        </span>
                                                        {servico.tipoServico && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                                                                {servico.tipoServico}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {servico.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                            {servico.descricao}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleAdicionarServico(servico)}
                                                    className="p-2 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors flex-shrink-0"
                                                    title="Adicionar serviço ao kit"
                                                >
                                                    <PlusIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // Lista de materiais (estoque ou cotações)
                                    materiaisFiltrados.map((material) => (
                                        <div
                                            key={material.id}
                                            className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                                        {material.nome}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {fonteDados === 'ESTOQUE' && (
                                                            <span className="text-xs text-gray-600">
                                                                Estoque: {material.estoque} {material.unidadeMedida}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-semibold text-teal-700">
                                                            R$ {((material as any).valorVenda || material.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                        {!((material as any).valorVenda) && (
                                                            <span className="text-xs text-orange-600">
                                                                (Sem valor de venda - usando compra)
                                                            </span>
                                                        )}
                                                        {material._isCotacao && (
                                                            <>
                                                                {material._dataUltimaCotacao && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                        ❄️ {(() => {
                                                                            const data = new Date(material._dataUltimaCotacao);
                                                                            return !isNaN(data.getTime()) ? data.toLocaleDateString('pt-BR') : 'Sem data';
                                                                        })()}
                                                                    </span>
                                                                )}
                                                                {(material as any)._fornecedorNome && (
                                                                    <span className="text-xs text-gray-600">
                                                                        📍 {(material as any)._fornecedorNome}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAdicionarItem(material)}
                                                    className="p-2 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors flex-shrink-0"
                                                    title="Adicionar ao kit"
                                                >
                                                    <PlusIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ))}
                            </div>
                        </div>

                        {/* Coluna 2: Itens do Kit */}
                        <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-gray-700 dark:to-gray-800">
                            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
                                Composição do Kit ({itensKit.length} {itensKit.length === 1 ? 'item' : 'itens'})
                                {itensKit.some(i => i.isCotacao) && (
                                    <span className="ml-2 text-xs text-blue-600 font-normal">
                                        ({itensKit.filter(i => i.isCotacao).length} do banco frio)
                                    </span>
                                )}
                                {itensKit.some(i => i.isServico) && (
                                    <span className="ml-2 text-xs text-purple-600 font-normal">
                                        ({itensKit.filter(i => i.isServico).length} serviço(s))
                                    </span>
                                )}
                            </h3>
                            
                            {itensKit.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                                    <p className="font-medium">Kit vazio</p>
                                    <p className="text-sm mt-1">Adicione materiais da lista ao lado</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {itensKit.map((item, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border-2 ${
                                                item.isServico
                                                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                                                    : item.isCotacao 
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {item.isServico && (
                                                            <span className="text-lg">⚙️</span>
                                                        )}
                                                        {item.isCotacao && !item.isServico && (
                                                            <span className="text-lg">❄️</span>
                                                        )}
                                                        <p className={`font-medium text-sm ${
                                                            item.isServico ? 'text-purple-900' :
                                                            item.isCotacao ? 'text-blue-900' : 'text-gray-900'
                                                        }`}>
                                                            {item.nome}
                                                        </p>
                                                    </div>
                                                    {item.isServico && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                                                            Serviço
                                                        </span>
                                                    )}
                                                    {item.isCotacao && !item.isServico && item.dataUltimaCotacao && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                                            Banco Frio - Cotação: {(() => {
                                                                const data = new Date(item.dataUltimaCotacao);
                                                                return !isNaN(data.getTime()) ? data.toLocaleDateString('pt-BR') : 'Sem data';
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemoverItem(index)}
                                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                                                    title="Remover item"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs text-gray-600 font-medium">Qtd:</label>
                                                    <input
                                                        type="number"
                                                        min="0.1"
                                                        step="0.1"
                                                        value={item.quantidade}
                                                        onChange={(e) => handleAlterarQuantidade(index, parseFloat(e.target.value) || 1)}
                                                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                                                    />
                                                    <span className="text-xs text-gray-600">{item.unidadeMedida}</span>
                                                </div>
                                                <div className="text-right flex-1">
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">Unit.: R$ {item.precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <p className={`text-sm font-bold ${
                                                        item.isServico ? 'text-purple-700' :
                                                        item.isCotacao ? 'text-blue-700' : 'text-teal-700'
                                                    }`}>
                                                        Subtotal: R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Total do Kit */}
                            {itensKit.length > 0 && (
                                <>
                                    <div className="mt-4 pt-4 border-t-2 border-teal-300">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">VALOR TOTAL DO KIT:</span>
                                            <span className="text-2xl font-bold text-teal-700">
                                                R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Avisos se houver itens do banco frio ou serviços */}
                                    {(itensKit.some(item => item.isCotacao) || itensKit.some(item => item.isServico)) && (
                                        <div className="mt-3 space-y-2">
                                            {itensKit.some(item => item.isCotacao) && (
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                                                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium flex items-start gap-2">
                                                        <span className="text-base">ℹ️</span>
                                                        <span>
                                                            Este kit contém {itensKit.filter(i => i.isCotacao).length} item(ns) do banco frio. 
                                                            O kit será criado, mas itens de cotação precisam ser comprados antes de usar em obras.
                                                        </span>
                                                    </p>
                                                </div>
                                            )}
                                            {itensKit.some(item => item.isServico) && (
                                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                                    <p className="text-xs text-purple-800 font-medium flex items-start gap-2">
                                                        <span className="text-base">⚙️</span>
                                                        <span>
                                                            Este kit contém {itensKit.filter(i => i.isServico).length} serviço(s). 
                                                            Os serviços serão incluídos no kit personalizado.
                                                        </span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSalvarKit}
                            disabled={isSaving || !nomeKit.trim() || itensKit.length === 0}
                            className="px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Salvando...' : (modoEdicao ? '✓ Atualizar Kit' : '✓ Criar Kit')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CriacaoKitModal;

