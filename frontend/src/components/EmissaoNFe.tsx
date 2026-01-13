import React, { useState, useEffect } from 'react';
import { empresaFiscalService, type EmpresaFiscal } from '../services/empresaFiscalService';
import { nfeFiscalService } from '../services/nfeFiscalService';
import { axiosApiService } from '../services/axiosApi';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
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

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PencilSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

interface EmissaoNFeProps {
    toggleSidebar: () => void;
}

type SectionType = 'emitir' | 'operacoes' | 'configurar';

const EmissaoNFe: React.FC<EmissaoNFeProps> = ({ toggleSidebar }) => {
    const [activeSection, setActiveSection] = useState<SectionType>('emitir');
    
    // Estados para Emissão
    const [step, setStep] = useState(1);
    const [vendaSelecionada, setVendaSelecionada] = useState('');
    const [vendas, setVendas] = useState<any[]>([]);
    const [loadingVendas, setLoadingVendas] = useState(false);
    const [empresaEmissoraId, setEmpresaEmissoraId] = useState('');
    const [ambiente, setAmbiente] = useState<'1' | '2'>('2'); // 1 = Produção, 2 = Homologação
    const [tipoNF, setTipoNF] = useState<'PRODUTO' | 'SERVICO'>('PRODUTO');
    const [naturezaOperacao, setNaturezaOperacao] = useState('Venda de produção do estabelecimento');
    const [cfop, setCfop] = useState('5101');
    const [serie, setSerie] = useState('1');
    const [emitindo, setEmitindo] = useState(false);
    
    // Estados para Configuração de Empresas
    const [empresas, setEmpresas] = useState<EmpresaFiscal[]>([]);
    const [loadingEmpresas, setLoadingEmpresas] = useState(false);
    const [isModalEmpresaOpen, setIsModalEmpresaOpen] = useState(false);
    const [editandoEmpresaId, setEditandoEmpresaId] = useState<string | null>(null);
    const [empresaForm, setEmpresaForm] = useState({
        cnpj: '',
        inscricaoEstadual: '',
        razaoSocial: '',
        nomeFantasia: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        email: '',
        regimeTributario: 'SimplesNacional'
    });
    const [certificadoFile, setCertificadoFile] = useState<File | null>(null);
    const [certificadoSenha, setCertificadoSenha] = useState('');
    const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
    const [usarCertificadoExistente, setUsarCertificadoExistente] = useState(false);
    const [empresaCertificadoId, setEmpresaCertificadoId] = useState('');

    // Estados para Operações Fiscais (Cancelamento e Correção)
    const [chaveAcessoCancelamento, setChaveAcessoCancelamento] = useState('');
    const [justificativaCancelamento, setJustificativaCancelamento] = useState('');
    const [empresaCancelamentoId, setEmpresaCancelamentoId] = useState('');
    const [cancelando, setCancelando] = useState(false);
    const [resultadoCancelamento, setResultadoCancelamento] = useState<any>(null);

    const [chaveAcessoCorrecao, setChaveAcessoCorrecao] = useState('');
    const [textoCorrecao, setTextoCorrecao] = useState('');
    const [empresaCorrecaoId, setEmpresaCorrecaoId] = useState('');
    const [corrigindo, setCorrigindo] = useState(false);
    const [resultadoCorrecao, setResultadoCorrecao] = useState<any>(null);

    // Estados para Consulta de NF-e
    const [chaveAcessoConsulta, setChaveAcessoConsulta] = useState('');
    const [empresaConsultaId, setEmpresaConsultaId] = useState('');
    const [ambienteConsulta, setAmbienteConsulta] = useState<'1' | '2'>('2');
    const [consultando, setConsultando] = useState(false);
    const [resultadoConsulta, setResultadoConsulta] = useState<any>(null);

    // Estados para Inutilização
    const [empresaInutilizacaoId, setEmpresaInutilizacaoId] = useState('');
    const [anoInutilizacao, setAnoInutilizacao] = useState(new Date().getFullYear().toString());
    const [serieInutilizacao, setSerieInutilizacao] = useState('1');
    const [numeroInicialInutilizacao, setNumeroInicialInutilizacao] = useState('');
    const [numeroFinalInutilizacao, setNumeroFinalInutilizacao] = useState('');
    const [justificativaInutilizacao, setJustificativaInutilizacao] = useState('');
    const [ambienteInutilizacao, setAmbienteInutilizacao] = useState<'1' | '2'>('2');
    const [inutilizando, setInutilizando] = useState(false);
    const [resultadoInutilizacao, setResultadoInutilizacao] = useState<any>(null);

    // Estados para Manifestação
    const [empresaManifestacaoId, setEmpresaManifestacaoId] = useState('');
    const [chaveAcessoManifestacao, setChaveAcessoManifestacao] = useState('');
    const [tipoEventoManifestacao, setTipoEventoManifestacao] = useState<'210200' | '210210' | '210220' | '210240'>('210210');
    const [justificativaManifestacao, setJustificativaManifestacao] = useState('');
    const [ambienteManifestacao, setAmbienteManifestacao] = useState<'1' | '2'>('2');
    const [manifestando, setManifestando] = useState(false);
    const [resultadoManifestacao, setResultadoManifestacao] = useState<any>(null);

    // Histórico de NF-es
    const [notasFiscais, setNotasFiscais] = useState<any[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);

    // Itens da venda selecionada (para revisão)
    const [itensVendaEditados, setItensVendaEditados] = useState<any[]>([]);

    // Pré-visualização de XML da NF-e
    const [xmlPreview, setXmlPreview] = useState<string | null>(null);
    const [previewingXml, setPreviewingXml] = useState(false);
    const [isXmlPreviewOpen, setIsXmlPreviewOpen] = useState(false);
    
    // AlertDialog para exclusão de empresa
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [empresaParaExcluir, setEmpresaParaExcluir] = useState<string | null>(null);

    // Venda atualmente selecionada (objeto completo)
    const vendaAtual = vendas.find(v => v.id === vendaSelecionada);

    // Resetar itens editados ao trocar de venda
    useEffect(() => {
        setItensVendaEditados([]);
    }, [vendaSelecionada]);

    // Carregar empresas ao montar componente ou trocar de seção
    useEffect(() => {
        if (activeSection === 'configurar' || activeSection === 'operacoes') {
            loadEmpresas();
        }
        if (activeSection === 'emitir') {
            loadVendas();
            loadEmpresas();
        }
        if (activeSection === 'historico') {
            loadNotasFiscais();
        }
    }, [activeSection]);

    const loadEmpresas = async () => {
        try {
            setLoadingEmpresas(true);
            const response = await empresaFiscalService.listar();
            if (response.success && response.data) {
                setEmpresas(response.data);
                // Selecionar primeira empresa ativa por padrão
                const empresaAtiva = response.data.find(e => e.ativo);
                if (empresaAtiva) {
                    setEmpresaEmissoraId(empresaAtiva.id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            toast.error('❌ Erro ao carregar empresas fiscais');
        } finally {
            setLoadingEmpresas(false);
        }
    };
    
    const loadVendas = async () => {
        try {
            setLoadingVendas(true);
            console.log('📥 Carregando vendas disponíveis para faturamento...');
            
            // Buscar vendas com status Ativa ou Pendente que ainda não têm NF-e
            const response = await axiosApiService.get<any>('/api/vendas', {
                status: 'Ativa',
                limit: 50
            });
            
            if (response.success && response.data) {
                const vendasDisponiveis = response.data.vendas || response.data || [];
                setVendas(vendasDisponiveis);
                console.log(`✅ ${vendasDisponiveis.length} vendas disponíveis para faturamento`);
            } else {
                console.warn('⚠️ Erro ao carregar vendas:', response.error);
                setVendas([]);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar vendas:', error);
            toast.error('❌ Erro ao carregar vendas para faturamento');
            setVendas([]);
        } finally {
            setLoadingVendas(false);
        }
    };

    // Handler para Emissão de NF-e
    const handleEmitirNFe = async () => {
        if (!vendaSelecionada || !empresaEmissoraId) {
            toast.error('❌ Dados incompletos', {
                description: 'Selecione a venda e a empresa emissora.'
            });
            return;
        }

        // Verificar se há kits sem NCM antes de emitir
        if (vendaAtual?.orcamento?.items) {
            const kitsSemNCM = vendaAtual.orcamento.items.filter((item: any) => {
                const isKit = item.tipo === 'KIT';
                const temNCM = item.ncm || item.material?.ncm || item.cotacao?.ncm;
                return isKit && !temNCM;
            });

            if (kitsSemNCM.length > 0) {
                const nomesKits = kitsSemNCM.map((kit: any) => kit.nome || kit.descricao || 'Kit').join(', ');
                toast.warning('⚠️ Atenção: Kit(s) sem NCM', {
                    description: `Este pedido contém ${kitsSemNCM.length} kit(s) sem NCM informado: ${nomesKits}. É necessário adicionar o NCM antes de emitir a nota fiscal.`,
                    duration: 12000
                });
                // Não bloquear a emissão, apenas avisar
            }
        }

        try {
            setEmitindo(true);
            console.log('📤 Iniciando emissão de NF-e...');
            console.log('   Venda:', vendaSelecionada);
            console.log('   Empresa:', empresaEmissoraId);
            console.log('   Ambiente:', ambiente === '1' ? 'Produção' : 'Homologação');

            const response = await axiosApiService.post<any>('/api/nfe/emitir', {
                pedidoId: vendaSelecionada, // Backend usa pedidoId
                empresaId: empresaEmissoraId,
                ambiente: ambiente,
                tipo: tipoNF,
                serie: serie,
                cfop: cfop,
                naturezaOperacao: naturezaOperacao
            });

            if (response.success && response.data) {
                const resultado = response.data;
                
                toast.success('✅ NF-e emitida com sucesso!', {
                    description: `Chave de Acesso: ${resultado.chaveAcesso?.substring(0, 20)}...`,
                    duration: 5000
                });

                console.log('✅ NF-e emitida:', resultado);

                // Mostrar detalhes da emissão
                if (resultado.chaveAcesso) {
                    setTimeout(() => {
                        toast.success('📄 Protocolo SEFAZ', {
                            description: `Protocolo: ${resultado.protocolo}`,
                            duration: 5000
                        });
                    }, 1000);
                }

                // Resetar formulário
                setTimeout(() => {
                    setStep(1);
                    setVendaSelecionada('');
                    loadVendas(); // Recarregar vendas
                }, 2000);

            } else {
                toast.error('❌ Erro ao emitir NF-e', {
                    description: response.error || response.message || 'Erro desconhecido.'
                });
            }
        } catch (error: any) {
            console.error('❌ Erro ao emitir NF-e:', error);
            toast.error('❌ Falha na emissão da NF-e', {
                description: error.response?.data?.message || error.message || 'Erro de conexão com o servidor.'
            });
        } finally {
            setEmitindo(false);
        }
    };

    // Handler para pré-visualizar XML da NF-e (sem emitir)
    const handlePreviewXmlNFe = async () => {
        if (!vendaSelecionada || !empresaEmissoraId) {
            toast.error('❌ Dados incompletos', {
                description: 'Selecione a venda e a empresa emissora antes de pré-visualizar o XML.'
            });
            return;
        }

        try {
            setPreviewingXml(true);
            console.log('👀 Gerando pré-visualização do XML da NF-e...');

            const response = await axiosApiService.post<any>('/api/nfe/preview-xml', {
                pedidoId: vendaSelecionada,
                empresaId: empresaEmissoraId,
                ambiente: ambiente,
                cfop: cfop,
                naturezaOperacao: naturezaOperacao,
                serie: serie
            });

            if (response.success && response.data?.xml) {
                setXmlPreview(response.data.xml);
                setIsXmlPreviewOpen(true);
                toast.success('✅ XML gerado para pré-visualização');
            } else {
                toast.error('❌ Erro ao gerar XML de pré-visualização', {
                    description: response.error || response.message || 'Resposta inválida do servidor.'
                });
            }
        } catch (error: any) {
            console.error('❌ Erro ao gerar XML de pré-visualização:', error);
            toast.error('❌ Falha ao gerar XML da NF-e', {
                description: error.response?.data?.message || error.message || 'Erro de conexão com o servidor.'
            });
        } finally {
            setPreviewingXml(false);
        }
    };

    // Handlers para Configuração de Empresas
    const handleOpenModalEmpresa = () => {
        setEmpresaForm({
            cnpj: '',
            inscricaoEstadual: '',
            razaoSocial: '',
            nomeFantasia: '',
            endereco: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
            telefone: '',
            email: '',
            regimeTributario: 'SimplesNacional'
        });
        setCertificadoFile(null);
        setCertificadoSenha('');
        setUsarCertificadoExistente(false);
        setEmpresaCertificadoId('');
        setIsModalEmpresaOpen(true);
    };

    const handleCloseModalEmpresa = () => {
        setIsModalEmpresaOpen(false);
        setEditandoEmpresaId(null);
        setCertificadoFile(null);
        setCertificadoSenha('');
        setUsarCertificadoExistente(false);
        setEmpresaCertificadoId('');
    };

    const handleEditarEmpresa = (empresa: EmpresaFiscal) => {
        setEmpresaForm({
            cnpj: empresa.cnpj,
            inscricaoEstadual: empresa.inscricaoEstadual,
            razaoSocial: empresa.razaoSocial,
            nomeFantasia: empresa.nomeFantasia || '',
            endereco: empresa.endereco,
            numero: empresa.numero,
            complemento: empresa.complemento || '',
            bairro: empresa.bairro,
            cidade: empresa.cidade,
            estado: empresa.estado,
            cep: empresa.cep,
            telefone: empresa.telefone || '',
            email: empresa.email || '',
            regimeTributario: empresa.regimeTributario
        });
        setEditandoEmpresaId(empresa.id);
        setCertificadoFile(null);
        setCertificadoSenha('');
        setUsarCertificadoExistente(false);
        setEmpresaCertificadoId('');
        setIsModalEmpresaOpen(true);
    };

    const handleSalvarEmpresa = async () => {
        try {
            // Validações
            if (!empresaForm.cnpj || !empresaForm.razaoSocial || !empresaForm.inscricaoEstadual) {
                toast.error('❌ Campos obrigatórios não preenchidos', {
                    description: 'Preencha CNPJ, Razão Social e Inscrição Estadual.'
                });
                return;
            }

            setSalvandoEmpresa(true);

            // Converter certificado para Base64 se fornecido
            let certificadoBase64 = undefined;
            let certificadoSenhaFinal = undefined;
            
            if (usarCertificadoExistente && empresaCertificadoId) {
                // Usar certificado de outra empresa
                const empresaOrigem = empresas.find(e => e.id === empresaCertificadoId);
                if (empresaOrigem) {
                    // Nota: Backend deve copiar certificado da empresa origem
                    console.log('📋 Usando certificado da empresa:', empresaOrigem.razaoSocial);
                }
            } else if (certificadoFile && certificadoSenha) {
                // Upload de novo certificado
                certificadoBase64 = await empresaFiscalService.converterCertificadoParaBase64(certificadoFile);
                certificadoSenhaFinal = certificadoSenha;
            }

            const dataToSave = {
                ...empresaForm,
                certificadoBase64,
                certificadoSenha: certificadoSenhaFinal,
                copiarCertificadoDeEmpresaId: usarCertificadoExistente ? empresaCertificadoId : undefined
            };

            if (editandoEmpresaId) {
                // Atualizar empresa existente
                const response = await empresaFiscalService.atualizar(editandoEmpresaId, dataToSave);
                if (response.success) {
                    toast.success('✅ Empresa atualizada com sucesso!', {
                        description: `${empresaForm.nomeFantasia || empresaForm.razaoSocial}`
                    });
                    await loadEmpresas();
                    handleCloseModalEmpresa();
                } else {
                    toast.error('❌ Erro ao atualizar empresa', {
                        description: response.error || 'Tente novamente.'
                    });
                }
            } else {
                // Criar nova empresa
                const response = await empresaFiscalService.criar(dataToSave);
                if (response.success) {
                    toast.success('✅ Empresa configurada com sucesso!', {
                        description: `${empresaForm.nomeFantasia || empresaForm.razaoSocial} cadastrada.`
                    });
                    await loadEmpresas();
                    handleCloseModalEmpresa();
                } else {
                    toast.error('❌ Erro ao criar empresa', {
                        description: response.error || 'Tente novamente.'
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            toast.error('❌ Erro ao salvar empresa fiscal', {
                description: 'Erro de conexão com o servidor.'
            });
        } finally {
            setSalvandoEmpresa(false);
        }
    };

    const handleOpenDeleteDialog = (id: string) => {
        setEmpresaParaExcluir(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteEmpresa = async () => {
        if (!empresaParaExcluir) return;

        try {
            const response = await empresaFiscalService.deletar(empresaParaExcluir);
            if (response.success) {
                toast.success('✅ Empresa excluída com sucesso!');
                await loadEmpresas();
                setIsDeleteDialogOpen(false);
                setEmpresaParaExcluir(null);
            } else {
                toast.error('❌ Erro ao excluir empresa', {
                    description: response.error || 'Tente novamente.'
                });
            }
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            toast.error('❌ Erro ao excluir empresa fiscal', {
                description: 'Erro de conexão com o servidor.'
            });
        }
    };

    const handleCertificadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCertificadoFile(e.target.files[0]);
        }
    };

    // Handlers para Operações Fiscais
    const handleCancelarNFe = async () => {
        try {
            if (!chaveAcessoCancelamento || !justificativaCancelamento || !empresaCancelamentoId) {
                toast.error('❌ Campos obrigatórios não preenchidos', {
                    description: 'Preencha chave de acesso, justificativa e empresa.'
                });
                return;
            }

            if (justificativaCancelamento.length < 15) {
                toast.error('❌ Justificativa muito curta', {
                    description: 'A justificativa deve ter pelo menos 15 caracteres.'
                });
                return;
            }

            setCancelando(true);
            setResultadoCancelamento(null);

            const response = await nfeFiscalService.cancelarNFe({
                chaveAcesso: chaveAcessoCancelamento,
                justificativa: justificativaCancelamento,
                empresaId: empresaCancelamentoId
            });

            if (response.success) {
                setResultadoCancelamento(response.data);
                toast.success('✅ NF-e cancelada com sucesso!', {
                    description: `Protocolo: ${response.data?.protocolo || 'N/A'}`
                });
                setChaveAcessoCancelamento('');
                setJustificativaCancelamento('');
            } else {
                toast.error('❌ Erro ao cancelar NF-e', {
                    description: response.error || 'Erro ao processar cancelamento.'
                });
            }
        } catch (error: any) {
            console.error('Erro ao cancelar NF-e:', error);
            toast.error('❌ Falha no cancelamento da NF-e', {
                description: error.response?.data?.message || error.message || 'Erro de conexão.'
            });
        } finally {
            setCancelando(false);
        }
    };

    const handleCorrigirNFe = async () => {
        try {
            if (!chaveAcessoCorrecao || !textoCorrecao || !empresaCorrecaoId) {
                toast.error('❌ Campos obrigatórios não preenchidos', {
                    description: 'Preencha chave de acesso, texto da correção e empresa.'
                });
                return;
            }

            if (textoCorrecao.length < 15) {
                toast.error('❌ Texto da correção muito curto', {
                    description: 'O texto deve ter pelo menos 15 caracteres.'
                });
                return;
            }

            setCorrigindo(true);
            setResultadoCorrecao(null);

            const response = await nfeFiscalService.corrigirNFe({
                chaveAcesso: chaveAcessoCorrecao,
                correcao: textoCorrecao,
                empresaId: empresaCorrecaoId
            });

            if (response.success) {
                setResultadoCorrecao(response.data);
                toast.success('✅ Carta de Correção enviada com sucesso!', {
                    description: `Protocolo: ${response.data?.protocolo || 'N/A'}`
                });
                setChaveAcessoCorrecao('');
                setTextoCorrecao('');
            } else {
                toast.error('❌ Erro ao enviar Carta de Correção', {
                    description: response.error || 'Erro ao processar CC-e.'
                });
            }
        } catch (error: any) {
            console.error('Erro ao enviar CC-e:', error);
            toast.error('❌ Falha no envio da CC-e', {
                description: error.response?.data?.message || error.message || 'Erro de conexão.'
            });
        } finally {
            setCorrigindo(false);
        }
    };

    const loadNotasFiscais = async () => {
        try {
            setLoadingNotas(true);
            const response = await axiosApiService.get<any>('/api/nfe/notas');
            if (response.success && Array.isArray(response.data)) {
                setNotasFiscais(response.data);
            } else {
                setNotasFiscais([]);
            }
        } catch (error) {
            console.error('Erro ao carregar notas fiscais:', error);
            toast.error('❌ Erro ao carregar histórico de NF-es');
            setNotasFiscais([]);
        } finally {
            setLoadingNotas(false);
        }
    };

    const handleVerDanfeNota = (notaId: string) => {
        if (!notaId) return;
        const url = `/api/nfe/notas/${notaId}/danfe`;
        window.open(url, '_blank');
    };

    // Handler para Consulta de NF-e
    const handleConsultarNFe = async () => {
        try {
            if (!chaveAcessoConsulta || !empresaConsultaId) {
                toast.error('❌ Campos obrigatórios não preenchidos', {
                    description: 'Preencha chave de acesso e empresa.'
                });
                return;
            }

            if (chaveAcessoConsulta.length !== 44) {
                toast.error('❌ Chave de acesso inválida', {
                    description: 'A chave de acesso deve ter 44 dígitos.'
                });
                return;
            }

            setConsultando(true);
            setResultadoConsulta(null);

            const response = await nfeFiscalService.consultarNFe(
                chaveAcessoConsulta,
                empresaConsultaId,
                ambienteConsulta
            );

            if (response.success) {
                setResultadoConsulta(response.data);
                toast.success('✅ NF-e consultada com sucesso!', {
                    description: `Status: ${response.data?.situacao || 'N/A'}`
                });
            } else {
                toast.error('❌ Erro ao consultar NF-e', {
                    description: response.error || 'Erro ao processar consulta.'
                });
            }
        } catch (error: any) {
            console.error('Erro ao consultar NF-e:', error);
            toast.error('❌ Falha na consulta da NF-e', {
                description: error.response?.data?.message || error.message || 'Erro de conexão.'
            });
        } finally {
            setConsultando(false);
        }
    };

    // Handler para Inutilização
    const handleInutilizarNumeracao = async () => {
        try {
            if (!empresaInutilizacaoId || !anoInutilizacao || !serieInutilizacao || !numeroInicialInutilizacao || !numeroFinalInutilizacao || !justificativaInutilizacao) {
                toast.error('❌ Campos obrigatórios não preenchidos', {
                    description: 'Preencha todos os campos obrigatórios.'
                });
                return;
            }

            if (justificativaInutilizacao.length < 15) {
                toast.error('❌ Justificativa muito curta', {
                    description: 'A justificativa deve ter pelo menos 15 caracteres.'
                });
                return;
            }

            setInutilizando(true);
            setResultadoInutilizacao(null);

            const response = await nfeFiscalService.inutilizarNumeracao({
                empresaId: empresaInutilizacaoId,
                ano: anoInutilizacao,
                modelo: '55',
                serie: serieInutilizacao,
                numeroInicial: numeroInicialInutilizacao,
                numeroFinal: numeroFinalInutilizacao,
                justificativa: justificativaInutilizacao,
                ambiente: ambienteInutilizacao
            });

            if (response.success) {
                setResultadoInutilizacao(response.data);
                toast.success('✅ Numeração inutilizada com sucesso!', {
                    description: `Protocolo: ${response.data?.protocolo || 'N/A'}`
                });
                // Limpar campos
                setNumeroInicialInutilizacao('');
                setNumeroFinalInutilizacao('');
                setJustificativaInutilizacao('');
            } else {
                toast.error('❌ Erro ao inutilizar numeração', {
                    description: response.error || 'Erro ao processar inutilização.'
                });
            }
        } catch (error: any) {
            console.error('Erro ao inutilizar numeração:', error);
            toast.error('❌ Falha na inutilização', {
                description: error.response?.data?.message || error.message || 'Erro de conexão.'
            });
        } finally {
            setInutilizando(false);
        }
    };

    // Handler para Manifestação
    const handleManifestarDestinatario = async () => {
        try {
            if (!empresaManifestacaoId || !chaveAcessoManifestacao) {
                toast.error('❌ Campos obrigatórios não preenchidos', {
                    description: 'Preencha empresa e chave de acesso.'
                });
                return;
            }

            if (chaveAcessoManifestacao.length !== 44) {
                toast.error('❌ Chave de acesso inválida', {
                    description: 'A chave de acesso deve ter 44 dígitos.'
                });
                return;
            }

            if (tipoEventoManifestacao === '210240' && justificativaManifestacao.length < 15) {
                toast.error('❌ Justificativa obrigatória', {
                    description: 'Para "Operação não realizada", a justificativa deve ter pelo menos 15 caracteres.'
                });
                return;
            }

            setManifestando(true);
            setResultadoManifestacao(null);

            const response = await nfeFiscalService.manifestarDestinatario({
                empresaId: empresaManifestacaoId,
                chaveAcesso: chaveAcessoManifestacao,
                tipoEvento: tipoEventoManifestacao,
                justificativa: tipoEventoManifestacao === '210240' ? justificativaManifestacao : undefined,
                ambiente: ambienteManifestacao
            });

            if (response.success) {
                setResultadoManifestacao(response.data);
                toast.success('✅ Manifestação registrada com sucesso!', {
                    description: `Protocolo: ${response.data?.protocolo || 'N/A'}`
                });
                setChaveAcessoManifestacao('');
                setJustificativaManifestacao('');
            } else {
                toast.error('❌ Erro ao manifestar destinatário', {
                    description: response.error || 'Erro ao processar manifestação.'
                });
            }
        } catch (error: any) {
            console.error('Erro ao manifestar destinatário:', error);
            toast.error('❌ Falha na manifestação', {
                description: error.response?.data?.message || error.message || 'Erro de conexão.'
            });
        } finally {
            setManifestando(false);
        }
    };

    return (
        <div className="p-4 sm:p-8">
            {/* Header Principal */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center">
                    <button onClick={toggleSidebar} className="lg:hidden mr-4 p-1 text-brand-gray-500 rounded-md hover:bg-brand-gray-100">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-brand-gray-800">Nota Fiscal Eletrônica</h1>
                        <p className="text-sm sm:text-base text-brand-gray-500">Gestão de NF-e e configurações fiscais</p>
                    </div>
                </div>
            </header>

            {/* Navegação entre seções */}
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-2 mb-6">
                <nav className="flex gap-2">
                    <button
                        onClick={() => setActiveSection('emitir')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            activeSection === 'emitir'
                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Emitir NF-e
                    </button>
                    <button
                        onClick={() => setActiveSection('historico')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            activeSection === 'historico'
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M5 19h14M5 7h14M5 15h14" />
                        </svg>
                        Histórico de NF-e
                    </button>
                    <button
                        onClick={() => setActiveSection('operacoes')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            activeSection === 'operacoes'
                                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        Operações (Cancelar/Corrigir)
                    </button>
                    <button
                        onClick={() => setActiveSection('configurar')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                            activeSection === 'configurar'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                                : 'text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Configurar Empresas
                    </button>
                </nav>
            </div>

            {/* SEÇÃO: Emitir NF-e */}
            {activeSection === 'emitir' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-5xl mx-auto">
                    {/* Progress Steps */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                        step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                        {s}
                                    </div>
                                    {s < 3 && (
                                        <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs font-medium text-gray-600">Selecionar Venda</span>
                            <span className="text-xs font-medium text-gray-600">Dados Fiscais</span>
                            <span className="text-xs font-medium text-gray-600">Revisão</span>
                        </div>
                    </div>

                <div className="p-6">
                    {/* Step 1: Selecionar Venda e Ambiente */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Selecione a Venda para Faturamento</h2>
                                
                                {/* Toggle Ambiente */}
                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <span className="text-sm font-medium text-gray-700">Ambiente:</span>
                                    <button
                                        onClick={() => setAmbiente('2')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            ambiente === '2'
                                                ? 'bg-yellow-500 text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        🧪 Homologação
                                    </button>
                                    <button
                                        onClick={() => setAmbiente('1')}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                            ambiente === '1'
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        🚀 Produção
                                    </button>
                                </div>
                            </div>

                            {/* Alerta de Ambiente */}
                            {ambiente === '1' && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="text-sm font-semibold text-red-800">
                                            ATENÇÃO: Emissão em PRODUÇÃO. NF-e será enviada à SEFAZ oficial.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {ambiente === '2' && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-semibold text-yellow-800">
                                            Ambiente de TESTES. NF-e será enviada para homologação da SEFAZ.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {loadingVendas ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Carregando vendas disponíveis...</p>
                                </div>
                            ) : vendas.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-gray-500 font-medium">Nenhuma venda disponível para faturamento</p>
                                    <p className="text-sm text-gray-400 mt-1">Realize uma venda primeiro</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {vendas.map(venda => (
                                        <div
                                            key={venda.id}
                                            onClick={() => setVendaSelecionada(venda.id)}
                                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                                vendaSelecionada === venda.id
                                                    ? 'border-green-500 bg-green-50 shadow-md'
                                                    : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                                            {venda.numeroVenda}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(venda.dataVenda).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {venda.cliente?.nome || 'Cliente não informado'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {venda.formaPagamento} - {venda.parcelas}x parcelas
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-green-600">
                                                        R$ {venda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                                                        {venda.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!vendaSelecionada}
                                    className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                                >
                                    Próximo →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Dados Fiscais */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800">Dados Fiscais da NF-e</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Empresa Emissora *
                                    </label>
                                    <select
                                        value={empresaEmissoraId}
                                        onChange={(e) => setEmpresaEmissoraId(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                                    >
                                        <option value="">Selecione a empresa emissora</option>
                                        {empresas.filter(e => e.ativo).map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.nomeFantasia || emp.razaoSocial} - {emp.cnpj}
                                            </option>
                                        ))}
                                    </select>
                                    {!empresaEmissoraId && (
                                        <p className="text-xs text-red-600 mt-1">
                                            ⚠️ Selecione a empresa que emitirá a nota fiscal
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de NF-e *</label>
                                    <select
                                        value={tipoNF}
                                        onChange={(e) => setTipoNF(e.target.value as 'PRODUTO' | 'SERVICO')}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="PRODUTO">NF-e de Produto</option>
                                        <option value="SERVICO">NF-e de Serviço</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Série *</label>
                                    <input
                                        type="text"
                                        value={serie}
                                        onChange={(e) => setSerie(e.target.value)}
                                        placeholder="1"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">CFOP *</label>
                                    <input
                                        type="text"
                                        value={cfop}
                                        onChange={(e) => setCfop(e.target.value)}
                                        placeholder="5101"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        5101 - Venda de produção dentro do estado
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Natureza da Operação *</label>
                                    <input
                                        type="text"
                                        value={naturezaOperacao}
                                        onChange={(e) => setNaturezaOperacao(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-blue-800">
                                        <strong>Nota:</strong> Certifique-se de que os dados fiscais estão corretos antes de prosseguir.
                                        A emissão da NF-e será enviada para a SEFAZ após a confirmação.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                                >
                                    ← Voltar
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!empresaEmissoraId}
                                    className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                                >
                                    Próximo →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Revisão */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800">Revisão da NF-e</h2>
                            
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <h3 className="font-bold text-gray-800">Nota Fiscal Pronta para Emissão</h3>
                                        <p className="text-sm text-gray-600">Revise os dados antes de emitir</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Venda:</p>
                                        <p className="font-semibold text-gray-900">
                                            {vendas.find(v => v.id === vendaSelecionada)?.numeroVenda || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Cliente:</p>
                                        <p className="font-semibold text-gray-900">
                                            {vendas.find(v => v.id === vendaSelecionada)?.cliente?.nome || 'Cliente não informado'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Ambiente:</p>
                                        <p className={`font-semibold ${ambiente === '1' ? 'text-green-700' : 'text-yellow-700'}`}>
                                            {ambiente === '1' ? '🚀 Produção' : '🧪 Homologação'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Empresa Emissora:</p>
                                        <p className="font-semibold text-gray-900">
                                            {empresas.find(e => e.id === empresaEmissoraId)?.nomeFantasia || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Tipo:</p>
                                        <p className="font-semibold text-gray-900">{tipoNF}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">CFOP:</p>
                                        <p className="font-semibold text-gray-900">{cfop}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Série:</p>
                                        <p className="font-semibold text-gray-900">{serie}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-gray-600">Natureza da Operação:</p>
                                        <p className="font-semibold text-gray-900">{naturezaOperacao}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-gray-600">Valor Total:</p>
                                        <p className="font-bold text-green-700 text-lg">
                                            R$ {vendas.find(v => v.id === vendaSelecionada)?.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bloco de ajustes rápidos (editável) */}
                            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 space-y-4">
                                <h3 className="font-semibold text-gray-800 dark:text-dark-text mb-2">
                                    Ajustar dados fiscais antes da emissão
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
                                            Tipo de NF-e
                                        </label>
                                        <select
                                            value={tipoNF}
                                            onChange={(e) => setTipoNF(e.target.value as 'PRODUTO' | 'SERVICO')}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text rounded-lg focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="PRODUTO">NF-e de Produto</option>
                                            <option value="SERVICO">NF-e de Serviço</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
                                            Série
                                        </label>
                                        <input
                                            type="text"
                                            value={serie}
                                            onChange={(e) => setSerie(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">
                                            CFOP
                                        </label>
                                        <input
                                            type="text"
                                            value={cfop}
                                            onChange={(e) => setCfop(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Natureza da Operação
                                        </label>
                                        <input
                                            type="text"
                                            value={naturezaOperacao}
                                            onChange={(e) => setNaturezaOperacao(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-text-secondary rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quadro de itens da venda para revisão */}
                            <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-gray-800 dark:text-dark-text">
                                        Itens da venda para revisão
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                        Os itens serão carregados do orçamento vinculado à venda.
                                    </p>
                                </div>

                                {vendaAtual?.orcamento?.items && vendaAtual.orcamento.items.length > 0 ? (
                                    <div className="overflow-x-auto -mx-2 md:mx-0">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 dark:border-dark-border">
                                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                                        Item
                                                    </th>
                                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                                        Descrição
                                                    </th>
                                                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                                        Qtde
                                                    </th>
                                                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                                        Vlr Unit.
                                                    </th>
                                                    <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                                        Subtotal
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(vendaAtual.orcamento.items || []).map((item: any, index: number) => {
                                                    const nomeItem =
                                                        item.nome ||
                                                        item.material?.nome ||
                                                        item.servico?.nome ||
                                                        item.descricao ||
                                                        'Item';
                                                    const quantidade = item.quantidade || 1;
                                                    const precoUnit =
                                                        item.material?.valorVenda ||
                                                        item.precoUnitario ||
                                                        item.precoUnit ||
                                                        0;
                                                    const subtotal =
                                                        item.subtotal || precoUnit * quantidade;
                                                    const isKit = item.tipo === 'KIT';
                                                    const ncm = item.ncm || item.material?.ncm || item.cotacao?.ncm || null;
                                                    const kitSemNCM = isKit && !ncm;

                                                    return (
                                                        <tr
                                                            key={item.id || index}
                                                            className={`border-b border-gray-100 dark:border-dark-border/60 ${kitSemNCM ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                                                        >
                                                            <td className="px-2 py-2 align-top text-gray-800 dark:text-dark-text text-xs md:text-sm">
                                                                {nomeItem}
                                                                {isKit && (
                                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                                        📦 Kit
                                                                    </span>
                                                                )}
                                                                {kitSemNCM && (
                                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                                        ⚠️ Sem NCM
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 align-top text-gray-600 dark:text-dark-text-secondary text-xs md:text-sm">
                                                                {item.descricao || '-'}
                                                            </td>
                                                            <td className="px-2 py-2 align-top text-right text-gray-800 dark:text-dark-text text-xs md:text-sm">
                                                                {quantidade.toLocaleString('pt-BR', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}
                                                            </td>
                                                            <td className="px-2 py-2 align-top text-right text-gray-800 dark:text-dark-text text-xs md:text-sm">
                                                                R{' '}
                                                                {precoUnit.toLocaleString('pt-BR', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}
                                                            </td>
                                                            <td className="px-2 py-2 align-top text-right text-gray-900 dark:text-dark-text font-semibold text-xs md:text-sm">
                                                                R{' '}
                                                                {subtotal.toLocaleString('pt-BR', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                        Não foram encontrados itens vinculados ao orçamento desta venda.
                                    </p>
                                )}
                            </div>

                            {ambiente === '1' && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="text-sm font-semibold text-red-800">
                                            ⚠️ ATENÇÃO: Esta NF-e será emitida em PRODUÇÃO e enviada à SEFAZ oficial. A ação não poderá ser desfeita facilmente.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={emitindo}
                                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    ← Voltar
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handlePreviewXmlNFe}
                                        disabled={previewingXml || !vendaSelecionada || !empresaEmissoraId}
                                        className="px-4 py-2.5 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {previewingXml ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                                Gerando XML...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Pré-visualizar XML
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleEmitirNFe}
                                        disabled={emitindo}
                                        className={`px-8 py-3 bg-gradient-to-r ${
                                            ambiente === '1' 
                                                ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' 
                                                : 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                                        } text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2`}
                                    >
                                        {emitindo ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Emitindo NF-e...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Emitir NF-e
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* SEÇÃO: Operações Fiscais (Cancelar e Corrigir) */}
            {activeSection === 'operacoes' && (
                <div className="space-y-6">
                    {/* GRID de Cards */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* CARD: CANCELAMENTO DE NF-E */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border-2 border-red-200 dark:border-red-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center gap-3">
                                <XCircleIcon className="w-8 h-8 text-white" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">Cancelamento de NF-e</h2>
                                    <p className="text-sm text-white/80">Cancelar NF-e autorizada na SEFAZ</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Selecionar Empresa */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                        Empresa *
                                    </label>
                                    <select
                                        value={empresaCancelamentoId}
                                        onChange={(e) => setEmpresaCancelamentoId(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.razaoSocial} ({emp.cnpj})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Chave de Acesso */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                        Chave de Acesso da NF-e *
                                    </label>
                                    <input
                                        type="text"
                                        value={chaveAcessoCancelamento}
                                        onChange={(e) => setChaveAcessoCancelamento(e.target.value)}
                                        placeholder="44 dígitos"
                                        maxLength={44}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-red-500 font-mono bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    />
                                </div>

                                {/* Justificativa */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                        Justificativa do Cancelamento *
                                    </label>
                                    <textarea
                                        value={justificativaCancelamento}
                                        onChange={(e) => setJustificativaCancelamento(e.target.value)}
                                        placeholder="Mínimo de 15 caracteres..."
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-red-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        {justificativaCancelamento.length}/15 caracteres mínimos
                                    </p>
                                </div>

                                {/* Botão Cancelar */}
                                <button
                                    onClick={handleCancelarNFe}
                                    disabled={cancelando}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:from-red-700 hover:to-red-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {cancelando ? (
                                        <>
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Cancelando...
                                        </>
                                    ) : (
                                        <>
                                            <XCircleIcon className="w-5 h-5 inline mr-2" />
                                            Cancelar NF-e
                                        </>
                                    )}
                                </button>

                                {/* Resultado */}
                                {resultadoCancelamento && (
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                        <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">✅ NF-e Cancelada</h4>
                                        <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                            <p><strong>Protocolo:</strong> {resultadoCancelamento.protocolo}</p>
                                            <p><strong>Mensagem:</strong> {resultadoCancelamento.mensagem}</p>
                                        </div>
            </div>
            )}

            {/* SEÇÃO: Histórico de NF-e */}
            {activeSection === 'historico' && (
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border p-6 max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-dark-text">Histórico de NF-e</h2>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                Últimas notas fiscais emitidas pelo sistema.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={loadNotasFiscais}
                            disabled={loadingNotas}
                            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-card disabled:opacity-50 flex items-center gap-2"
                        >
                            {loadingNotas ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                    Atualizando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.636 18.364A9 9 0 005.582 9M18.364 5.636A9 9 0 0018.418 15" />
                                    </svg>
                                    Atualizar
                                </>
                            )}
                        </button>
                    </div>

                    {loadingNotas ? (
                        <div className="py-10 text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
                            <p className="text-gray-500 dark:text-dark-text-secondary text-sm">Carregando notas fiscais...</p>
                        </div>
                    ) : notasFiscais.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl">
                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">
                                Nenhuma NF-e registrada ainda.
                            </p>
                            <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-1">
                                As notas emitidas aparecerão aqui automaticamente.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-2 md:mx-0">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-dark-border">
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                            Número / Série
                                        </th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                            Chave
                                        </th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                            Tipo
                                        </th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                            Valor
                                        </th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                            Status
                                        </th>
                                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600 dark:text-dark-text-secondary">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notasFiscais.map((nota) => (
                                        <tr key={nota.id} className="border-b border-gray-100 dark:border-dark-border/60">
                                            <td className="px-2 py-2 align-top text-xs md:text-sm text-gray-800 dark:text-dark-text">
                                                <div className="font-semibold">
                                                    {nota.numero}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                    Série {nota.serie}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 align-top text-xs md:text-[11px] text-gray-600 dark:text-dark-text-secondary max-w-[200px] truncate">
                                                {nota.chaveAcesso || '-'}
                                            </td>
                                            <td className="px-2 py-2 align-top text-xs md:text-sm text-gray-700 dark:text-dark-text-secondary">
                                                {nota.tipo}
                                            </td>
                                            <td className="px-2 py-2 align-top text-xs md:text-sm text-gray-900 dark:text-dark-text font-semibold">
                                                R{' '}
                                                {Number(nota.valorTotal || 0).toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </td>
                                            <td className="px-2 py-2 align-top text-xs md:text-sm">
                                                <span
                                                    className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${
                                                        nota.status === 'Autorizada'
                                                            ? 'bg-green-100 text-green-700'
                                                            : nota.status === 'Cancelada'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                    }`}
                                                >
                                                    {nota.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 align-top text-right text-xs md:text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => handleVerDanfeNota(nota.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-card"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Ver DANFE
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal simples para exibir o XML de pré-visualização */}
            {isXmlPreviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col border border-gray-200 dark:border-dark-border">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-text">
                                    Pré-visualização do XML da NF-e
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                    XML gerado pelo backend antes da assinatura/envio para a SEFAZ.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsXmlPreviewOpen(false)}
                                className="p-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-dark-text-secondary dark:hover:text-dark-text dark:hover:bg-dark-bg"
                            >
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-auto text-xs">
                            <pre className="whitespace-pre text-gray-800 dark:text-dark-text">
                                {xmlPreview}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
                            </div>
                        </div>

                        {/* CARD: CARTA DE CORREÇÃO (CC-E) */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center gap-3">
                                <PencilSquareIcon className="w-8 h-8 text-white" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">Carta de Correção (CC-e)</h2>
                                    <p className="text-sm text-white/80">Corrigir informações de NF-e já autorizada</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Selecionar Empresa */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                        Empresa *
                                    </label>
                                    <select
                                        value={empresaCorrecaoId}
                                        onChange={(e) => setEmpresaCorrecaoId(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.razaoSocial} ({emp.cnpj})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Chave de Acesso */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                        Chave de Acesso da NF-e *
                                    </label>
                                    <input
                                        type="text"
                                        value={chaveAcessoCorrecao}
                                        onChange={(e) => setChaveAcessoCorrecao(e.target.value)}
                                        placeholder="44 dígitos"
                                        maxLength={44}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    />
                                </div>

                                {/* Texto da Correção */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">
                                        Texto da Correção *
                                    </label>
                                    <textarea
                                        value={textoCorrecao}
                                        onChange={(e) => setTextoCorrecao(e.target.value)}
                                        placeholder="Descreva a correção necessária (mínimo 15 caracteres)..."
                                        rows={5}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                        {textoCorrecao.length}/15 caracteres mínimos
                                    </p>
                                </div>

                                {/* Botão Corrigir */}
                                <button
                                    onClick={handleCorrigirNFe}
                                    disabled={corrigindo}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {corrigindo ? (
                                        <>
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Enviando CC-e...
                                        </>
                                    ) : (
                                        <>
                                            <PencilSquareIcon className="w-5 h-5 inline mr-2" />
                                            Enviar Carta de Correção
                                        </>
                                    )}
                                </button>

                                {/* Resultado */}
                                {resultadoCorrecao && (
                                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                        <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2">✅ CC-e Registrada</h4>
                                        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                            <p><strong>Protocolo:</strong> {resultadoCorrecao.protocolo}</p>
                                            <p><strong>Mensagem:</strong> {resultadoCorrecao.mensagem}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CARD: CONSULTA DE NF-E */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border-2 border-green-200 dark:border-green-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 flex items-center gap-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Consulta de NF-e</h2>
                                    <p className="text-sm text-white/80">Consultar status de NF-e na SEFAZ</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Empresa *</label>
                                    <select
                                        value={empresaConsultaId}
                                        onChange={(e) => setEmpresaConsultaId(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-green-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        {empresas.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.razaoSocial} ({emp.cnpj})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Ambiente *</label>
                                    <select
                                        value={ambienteConsulta}
                                        onChange={(e) => setAmbienteConsulta(e.target.value as '1' | '2')}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-green-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    >
                                        <option value="2">Homologação</option>
                                        <option value="1">Produção</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Chave de Acesso da NF-e *</label>
                                    <input
                                        type="text"
                                        value={chaveAcessoConsulta}
                                        onChange={(e) => setChaveAcessoConsulta(e.target.value)}
                                        placeholder="44 dígitos"
                                        maxLength={44}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-green-500 font-mono bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text"
                                    />
                                </div>
                                <button
                                    onClick={handleConsultarNFe}
                                    disabled={consultando}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {consultando ? (
                                        <> <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Consultando... </>
                                    ) : (
                                        <> <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Consultar NF-e </>)}
                                </button>
                                {resultadoConsulta && (
                                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                        <h4 className="font-bold text-green-800 dark:text-green-400 mb-2">✅ Resultado da Consulta</h4>
                                        <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                            <p><strong>Situação:</strong> {resultadoConsulta.situacao}</p>
                                            <p><strong>Código Status:</strong> {resultadoConsulta.codigoStatus}</p>
                                            <p><strong>Mensagem:</strong> {resultadoConsulta.mensagem}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Segunda linha: Inutilização e Manifestação */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                        {/* CARD: INUTILIZAÇÃO */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border-2 border-orange-200 dark:border-orange-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4 flex items-center gap-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Inutilização de Numeração</h2>
                                    <p className="text-sm text-white/80">Inutilizar faixa de números de NF-e</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Empresa *</label>
                                    <select value={empresaInutilizacaoId} onChange={(e) => setEmpresaInutilizacaoId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text">
                                        <option value="">Selecione a empresa...</option>
                                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razaoSocial} ({emp.cnpj})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Ano *</label>
                                        <input type="text" value={anoInutilizacao} onChange={(e) => setAnoInutilizacao(e.target.value)} placeholder="2025" maxLength={4} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Série *</label>
                                        <input type="text" value={serieInutilizacao} onChange={(e) => setSerieInutilizacao(e.target.value)} placeholder="1" className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Ambiente *</label>
                                        <select value={ambienteInutilizacao} onChange={(e) => setAmbienteInutilizacao(e.target.value as '1' | '2')} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text">
                                            <option value="2">Homologação</option>
                                            <option value="1">Produção</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Número Inicial *</label>
                                        <input type="text" value={numeroInicialInutilizacao} onChange={(e) => setNumeroInicialInutilizacao(e.target.value)} placeholder="100" className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Número Final *</label>
                                        <input type="text" value={numeroFinalInutilizacao} onChange={(e) => setNumeroFinalInutilizacao(e.target.value)} placeholder="150" className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Justificativa *</label>
                                    <textarea value={justificativaInutilizacao} onChange={(e) => setJustificativaInutilizacao(e.target.value)} placeholder="Mínimo de 15 caracteres..." rows={3} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{justificativaInutilizacao.length}/15 caracteres mínimos</p>
                                </div>
                                <button onClick={handleInutilizarNumeracao} disabled={inutilizando} className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    {inutilizando ? (<> <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Inutilizando... </>) : (<> <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> Inutilizar Numeração </>)}
                                </button>
                                {resultadoInutilizacao && (
                                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                                        <h4 className="font-bold text-orange-800 dark:text-orange-400 mb-2">✅ Numeração Inutilizada</h4>
                                        <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                                            <p><strong>Protocolo:</strong> {resultadoInutilizacao.protocolo}</p>
                                            <p><strong>Mensagem:</strong> {resultadoInutilizacao.mensagem}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CARD: MANIFESTAÇÃO */}
                        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4 flex items-center gap-3">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Manifestação do Destinatário</h2>
                                    <p className="text-sm text-white/80">Manifestar ciência/confirmação de NF-e</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Empresa *</label>
                                    <select value={empresaManifestacaoId} onChange={(e) => setEmpresaManifestacaoId(e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text">
                                        <option value="">Selecione a empresa...</option>
                                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razaoSocial} ({emp.cnpj})</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Ambiente *</label>
                                        <select value={ambienteManifestacao} onChange={(e) => setAmbienteManifestacao(e.target.value as '1' | '2')} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text">
                                            <option value="2">Homologação</option>
                                            <option value="1">Produção</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Tipo de Manifestação *</label>
                                        <select value={tipoEventoManifestacao} onChange={(e) => setTipoEventoManifestacao(e.target.value as '210200' | '210210' | '210220' | '210240')} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text">
                                            <option value="210200">Confirmar Operação</option>
                                            <option value="210210">Ciência da Operação</option>
                                            <option value="210220">Desconhecimento</option>
                                            <option value="210240">Operação não Realizada</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Chave de Acesso da NF-e *</label>
                                    <input type="text" value={chaveAcessoManifestacao} onChange={(e) => setChaveAcessoManifestacao(e.target.value)} placeholder="44 dígitos" maxLength={44} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 font-mono bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                </div>
                                {tipoEventoManifestacao === '210240' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-dark-text mb-2">Justificativa * (obrigatória para "Operação não Realizada")</label>
                                        <textarea value={justificativaManifestacao} onChange={(e) => setJustificativaManifestacao(e.target.value)} placeholder="Mínimo de 15 caracteres..." rows={3} className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text" />
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{justificativaManifestacao.length}/15 caracteres mínimos</p>
                                    </div>
                                )}
                                <button onClick={handleManifestarDestinatario} disabled={manifestando} className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    {manifestando ? (<> <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Manifestando... </>) : (<> <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Manifestar Destinatário </>)}
                                </button>
                                {resultadoManifestacao && (
                                    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                                        <h4 className="font-bold text-purple-800 dark:text-purple-400 mb-2">✅ Manifestação Registrada</h4>
                                        <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                                            <p><strong>Protocolo:</strong> {resultadoManifestacao.protocolo}</p>
                                            <p><strong>Mensagem:</strong> {resultadoManifestacao.mensagem}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SEÇÃO: Configurar Empresas */}
            {activeSection === 'configurar' && (
                <div>
                    {/* Header da Seção */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Configurações Fiscais</h2>
                                <p className="text-sm text-gray-600 mt-1">Gerencie os CNPJs e certificados digitais para emissão de NF-e</p>
                            </div>
                            <button
                                onClick={handleOpenModalEmpresa}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Adicionar Empresa
                            </button>
                        </div>
                    </div>

                    {/* Lista de Empresas Configuradas */}
                    {loadingEmpresas ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Carregando empresas cadastradas...</p>
                        </div>
                    ) : empresas.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhuma Empresa Configurada</h3>
                            <p className="text-gray-600 mb-6">Configure os dados fiscais da sua empresa para começar a emitir NF-e</p>
                            <button
                                onClick={handleOpenModalEmpresa}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Adicionar Primeira Empresa
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {empresas.map((empresa) => (
                                <div key={empresa.id} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden">
                                    {/* Header do Card */}
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                                        <h3 className="text-xl font-bold text-white">{empresa.razaoSocial}</h3>
                                        {empresa.nomeFantasia && (
                                            <p className="text-sm text-white/80">{empresa.nomeFantasia}</p>
                                        )}
                                    </div>

                                    {/* Conteúdo do Card */}
                                    <div className="p-6 space-y-4">
                                        {/* Grid de Informações */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 mb-1">CNPJ</p>
                                                <p className="text-sm font-bold text-gray-900">{empresa.cnpj}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 mb-1">Inscrição Estadual</p>
                                                <p className="text-sm font-bold text-gray-900">{empresa.inscricaoEstadual}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs font-medium text-gray-500 mb-1">Regime Tributário</p>
                                                <p className="text-sm font-semibold text-gray-900">{empresa.regimeTributario}</p>
                                            </div>
                                            <div className={`rounded-lg p-3 ${empresa.certificadoValidade ? 'bg-green-50' : 'bg-red-50'}`}>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Certificado Digital</p>
                                                <p className={`text-sm font-bold ${empresa.certificadoValidade ? 'text-green-700' : 'text-red-700'}`}>
                                                    {empresa.certificadoValidade ? `Válido até ${empresa.certificadoValidade}` : 'Não configurado'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Endereço */}
                                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                            <p className="text-xs font-medium text-gray-600 mb-1">📍 Endereço</p>
                                            <p className="text-sm text-gray-800">
                                                {empresa.endereco}, {empresa.numero} {empresa.complemento && `- ${empresa.complemento}`}
                                                <br />
                                                {empresa.bairro} - {empresa.cidade}/{empresa.estado}
                                                <br />
                                                CEP: {empresa.cep}
                                            </p>
                                        </div>

                                        {/* Botões de Ação */}
                                        <div className="pt-4 border-t border-gray-200 flex justify-between">
                                            <button
                                                onClick={() => handleEditarEmpresa(empresa)}
                                                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleOpenDeleteDialog(empresa.id)}
                                                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Modal de Adicionar/Editar Empresa */}
                    {isModalEmpresaOpen && (
                        <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-gray-200/50 dark:border-dark-border animate-in zoom-in-95 duration-300">
                                {/* Header */}
                                <div className="p-6 rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-700 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">
                                                {editandoEmpresaId ? 'Editar' : 'Nova'} Configuração Fiscal
                                            </h2>
                                            <p className="text-sm text-white/80">Dados da empresa para emissão de NF-e</p>
                                        </div>
                                    </div>
                                    <button onClick={handleCloseModalEmpresa} className="p-2 rounded-xl text-white/90 hover:bg-white/20 transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Conteúdo Scrollável */}
                                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                    {/* Dados da Empresa */}
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-5 border border-gray-200 dark:border-dark-border">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Dados da Empresa
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">CNPJ *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.cnpj}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, cnpj: e.target.value})}
                                                    placeholder="00.000.000/0000-00"
                                                    className="input-field disabled:bg-gray-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
                                                    required
                                                    disabled={!!editandoEmpresaId}
                                                />
                                                {editandoEmpresaId && (
                                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">⚠️ CNPJ não pode ser alterado</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Inscrição Estadual *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.inscricaoEstadual}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, inscricaoEstadual: e.target.value})}
                                                    placeholder="000.000.000"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Razão Social *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.razaoSocial}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, razaoSocial: e.target.value})}
                                                    placeholder="Nome completo da empresa"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Nome Fantasia</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.nomeFantasia}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, nomeFantasia: e.target.value})}
                                                    placeholder="Nome comercial (opcional)"
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Regime Tributário *</label>
                                                <select
                                                    value={empresaForm.regimeTributario}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, regimeTributario: e.target.value})}
                                                    className="select-field"
                                                >
                                                    <option value="SimplesNacional">Simples Nacional</option>
                                                    <option value="RegimeNormal">Regime Normal</option>
                                                    <option value="MEI">MEI</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-5 border border-purple-200 dark:border-purple-800">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Endereço Fiscal
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Logradouro *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.endereco}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, endereco: e.target.value})}
                                                    placeholder="Rua, Avenida, etc"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Número *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.numero}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, numero: e.target.value})}
                                                    placeholder="123"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Complemento</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.complemento}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, complemento: e.target.value})}
                                                    placeholder="Sala, Andar..."
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Bairro *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.bairro}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, bairro: e.target.value})}
                                                    placeholder="Centro"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Cidade *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.cidade}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, cidade: e.target.value})}
                                                    placeholder="Florianópolis"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Estado *</label>
                                                <select
                                                    value={empresaForm.estado}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, estado: e.target.value})}
                                                    className="input-field"
                                                    required
                                                >
                                                    <option value="">Selecione...</option>
                                                    <option value="SC">Santa Catarina</option>
                                                    <option value="PR">Paraná</option>
                                                    <option value="RS">Rio Grande do Sul</option>
                                                    <option value="SP">São Paulo</option>
                                                    {/* Adicionar outros estados conforme necessário */}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">CEP *</label>
                                                <input
                                                    type="text"
                                                    value={empresaForm.cep}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, cep: e.target.value})}
                                                    placeholder="00000-000"
                                                    className="input-field"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Telefone</label>
                                                <input
                                                    type="tel"
                                                    value={empresaForm.telefone}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, telefone: e.target.value})}
                                                    placeholder="(00) 0000-0000"
                                                    className="input-field"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">E-mail</label>
                                                <input
                                                    type="email"
                                                    value={empresaForm.email}
                                                    onChange={(e) => setEmpresaForm({...empresaForm, email: e.target.value})}
                                                    placeholder="contato@empresa.com"
                                                    className="input-field"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Certificado Digital */}
                                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            Certificado Digital A1
                                        </h3>
                                        <div className="space-y-4">
                                            {/* Opção: Usar Certificado Existente */}
                                            {empresas.filter(e => e.certificadoValidade && e.id !== editandoEmpresaId).length > 0 && (
                                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={usarCertificadoExistente}
                                                            onChange={(e) => {
                                                                setUsarCertificadoExistente(e.target.checked);
                                                                if (e.target.checked) {
                                                                    setCertificadoFile(null);
                                                                    setCertificadoSenha('');
                                                                } else {
                                                                    setEmpresaCertificadoId('');
                                                                }
                                                            }}
                                                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-gray-800 dark:text-dark-text">Usar Certificado Existente</p>
                                                            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">Compartilhar certificado de outra empresa</p>
                                                        </div>
                                                    </label>
                                                    
                                                    {usarCertificadoExistente && (
                                                        <div className="mt-4">
                                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Selecione a Empresa *</label>
                                                            <select
                                                                value={empresaCertificadoId}
                                                                onChange={(e) => setEmpresaCertificadoId(e.target.value)}
                                                                className="select-field"
                                                                required
                                                            >
                                                                <option value="">Selecione...</option>
                                                                {empresas
                                                                    .filter(e => e.certificadoValidade && e.id !== editandoEmpresaId)
                                                                    .map(emp => (
                                                                        <option key={emp.id} value={emp.id}>
                                                                            {emp.razaoSocial} ({emp.cnpj}) - Válido até {emp.certificadoValidade}
                                                                        </option>
                                                                    ))
                                                                }
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Upload de Novo Certificado */}
                                            {!usarCertificadoExistente && (
                                                <>
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                            Arquivo .pfx/.p12 {!editandoEmpresaId && '*'}
                                                        </label>
                                                        <input
                                                            type="file"
                                                            accept=".pfx,.p12"
                                                            onChange={handleCertificadoChange}
                                                            className="input-field"
                                                        />
                                                        {certificadoFile && (
                                                            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                Arquivo selecionado: {certificadoFile.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                            Senha do Certificado {!editandoEmpresaId && '*'}
                                                        </label>
                                                        <input
                                                            type="password"
                                                            value={certificadoSenha}
                                                            onChange={(e) => setCertificadoSenha(e.target.value)}
                                                            placeholder="Digite a senha do certificado"
                                                            className="input-field"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div className="bg-white dark:bg-slate-800 border-l-4 border-orange-400 dark:border-orange-600 p-4 rounded-r-lg">
                                                <div className="flex gap-3">
                                                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div className="text-sm text-gray-700 dark:text-dark-text">
                                                        <p className="font-semibold mb-1">Segurança do Certificado:</p>
                                                        <ul className="text-xs space-y-1 text-gray-600 dark:text-dark-text-secondary">
                                                            <li>• O certificado será armazenado de forma segura no servidor</li>
                                                            <li>• A senha será criptografada antes do armazenamento</li>
                                                            <li>• Apenas administradores podem gerenciar certificados</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3 rounded-b-2xl">
                                    <button
                                        onClick={handleCloseModalEmpresa}
                                        className="btn-secondary"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSalvarEmpresa}
                                        disabled={salvandoEmpresa}
                                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {salvandoEmpresa ? (
                                            <>
                                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Salvando...
                                            </>
                                        ) : (
                                            editandoEmpresaId ? 'Atualizar Configuração' : 'Salvar Configuração'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* AlertDialog para Exclusão de Empresa */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Configuração Fiscal</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja realmente excluir esta configuração fiscal?
                            <br />
                            <span className="text-sm font-semibold text-red-600 mt-2 block">
                                ⚠️ Esta ação não pode ser desfeita e removerá o certificado digital associado.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteEmpresa}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir Empresa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default EmissaoNFe;

