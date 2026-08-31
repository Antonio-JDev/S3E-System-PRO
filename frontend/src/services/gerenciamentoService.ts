import { axiosApiService } from './axiosApi';

// ========== FUNCIONÁRIOS ==========
export const funcionariosService = {
    async listar() {
        return await axiosApiService.get('/api/funcionarios');
    },
    
    async buscar(id: string) {
        return await axiosApiService.get(`/api/funcionarios/${id}`);
    },
    
    async criar(data: {
        nome: string;
        cargo: string;
        salario: number;
        dataAdmissao: string;
        cpf: string;
        telefone?: string;
        email?: string;
        status?: string;
        diaPagamento?: number;
        uniformeCamisa?: string;
        uniformeCalca?: string;
        uniformeBermuda?: string;
        uniformeSapato?: string;
        tipoContrato?: 'REGISTRADO' | 'AUTONOMO' | 'AUTONOMO_BANCO_HORAS';
        salarioBase?: number;
        valorHora?: number;
        valorDiaria?: number;
        cargaHorariaMensal?: number;
        saldoBancoHoras?: number;
        codigoRelogio?: number;
    }) {
        return await axiosApiService.post('/api/funcionarios', data);
    },
    
    async atualizar(id: string, data: Partial<{
        nome: string;
        cargo: string;
        salario: number;
        dataAdmissao: string;
        cpf: string;
        telefone?: string;
        email?: string;
        status?: string;
        diaPagamento?: number;
        uniformeCamisa?: string;
        uniformeCalca?: string;
        uniformeBermuda?: string;
        uniformeSapato?: string;
        tipoContrato?: 'REGISTRADO' | 'AUTONOMO' | 'AUTONOMO_BANCO_HORAS';
        salarioBase?: number;
        valorHora?: number;
        valorDiaria?: number;
        cargaHorariaMensal?: number;
        saldoBancoHoras?: number;
        codigoRelogio?: number;
    }>) {
        return await axiosApiService.put(`/api/funcionarios/${id}`, data);
    },
    
    async deletar(id: string) {
        return await axiosApiService.delete(`/api/funcionarios/${id}`);
    },
    
    async obterMetricas(mesRef?: string) {
        const url = mesRef
            ? `/api/funcionarios/metricas?mes=${encodeURIComponent(mesRef)}`
            : '/api/funcionarios/metricas';
        return await axiosApiService.get(url);
    },

    async historicoPagamentos(funcionarioId: string) {
        return await axiosApiService.get(`/api/funcionarios/${funcionarioId}/historico-pagamentos`);
    }
};

/** Folha, configuração de ponto (hora FDS), lançamentos e importação XLS do relógio */
export const rhService = {
    async buscarConfigPonto(funcionarioId: string) {
        return await axiosApiService.get(`/api/rh/config-ponto/${funcionarioId}`);
    },

    async salvarConfigPonto(
        funcionarioId: string,
        data: {
            trabalhaFimDeSemana: boolean;
            valorHoraFimDeSemana: number | null;
            workShiftId?: string | null;
            toleranciaMinutos?: number;
            inicioNoturno?: string | null;
        },
    ) {
        return await axiosApiService.put(`/api/rh/config-ponto/${funcionarioId}`, data);
    },

    async listarWorkShifts() {
        return await axiosApiService.get('/api/rh/work-shifts');
    },

    async criarWorkShiftPersonalizada(data: {
        entrada1: string;
        saida1: string;
        entrada2: string;
        saida2: string;
        nome?: string | null;
    }) {
        return await axiosApiService.post('/api/rh/work-shifts', data);
    },

    async listarLancamentos(funcionarioId: string, ano: number, mes: number) {
        return await axiosApiService.get('/api/rh/lancamentos', {
            funcionarioId,
            ano,
            mes,
        });
    },

    async criarLancamento(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        categoria: 'ADIANTAMENTO' | 'FALTA' | 'FALTA_JUSTIFICADA' | 'DESCONTO_OUTRO' | 'ACRESCIMO';
        valor: number;
        descricao?: string | null;
    }) {
        return await axiosApiService.post('/api/rh/lancamentos', data);
    },

    async excluirLancamento(id: string) {
        return await axiosApiService.delete(`/api/rh/lancamentos/${id}`);
    },

    /** Atualiza valor da conta a pagar RH Pendente com o total da folha (mesmo cálculo do modal). */
    async sincronizarParcelaFolha(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
    }) {
        return await axiosApiService.post('/api/rh/sincronizar-parcela', data);
    },

    async atualizarRegistroPonto(registroId: string, batidas: string[]) {
        return await axiosApiService.put(`/api/rh/registro-ponto/${registroId}`, { batidas });
    },

    async criarRegistroPontoManual(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        dia: number;
        batidas: string[];
    }) {
        return await axiosApiService.post('/api/rh/registro-ponto/manual', data);
    },

    async salvarIntervaloAlmoco(registroId: string, data: { inicio: string; fim: string }) {
        return await axiosApiService.put(`/api/rh/registro-ponto/${registroId}/intervalo-almoco`, data);
    },

    async converterBancoParaFolga(data: {
        funcionarioId: string;
        horas: number;
        origem?: 'automatico' | 'normais' | 'extras100';
    }) {
        return await axiosApiService.post('/api/rh/banco-horas/converter-folga', data);
    },

    async incluirBancoHorasNaFolha(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        modo: 'total' | 'parcial';
        horasParcial?: number;
        alocacao?:
            | { tipo: 'automatico' | 'so_normais' | 'so_extras100' }
            | { tipo: 'misto'; horasNormais: number; horasExtras100: number };
    }) {
        return await axiosApiService.post('/api/rh/banco-horas/incluir-folha', data);
    },

    /** Abate horas positivas × negativas e persiste o líquido no cadastro. */
    async faturarBancoHoras(data: { funcionarioId: string }) {
        return await axiosApiService.post('/api/rh/banco-horas/faturar', data);
    },

    /** Zera completamente positivas e negativas do banco de horas. */
    async zerarBancoHoras(data: { funcionarioId: string }) {
        return await axiosApiService.post('/api/rh/banco-horas/zerar', data);
    },

    /** Recalcula métricas de ponto (atraso/extra) só do mês — sem apagar batidas. */
    async recalcularPontoMes(funcionarioId: string, mes: string) {
        return await axiosApiService.post(`/api/rh/folha/${funcionarioId}/${mes}/recalcular-ponto`);
    },

    /** Simula CLT vs Autônomo+banco nas mesmas batidas do mês. */
    async compararContratosFolha(funcionarioId: string, mes: string) {
        return await axiosApiService.get(`/api/rh/folha/${funcionarioId}/${mes}/comparar-contratos`);
    },

    /** Importação no servidor: SheetJS (`parsePresencaXlsBuffer`) + gravação em `RegistroPonto`. */
    async importarPresencaXls(file: File, ano?: number, mes?: number) {
        const fd = new FormData();
        fd.append('file', file);
        if (ano != null && ano > 0) fd.append('ano', String(ano));
        if (mes != null && mes >= 1 && mes <= 12) fd.append('mes', String(mes));
        return await axiosApiService.upload('/api/ponto/importar-presenca', fd);
    },

    async registrarFaltaJustificada(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        dia: number;
        descricao: string;
        documento?: File | null;
    }) {
        if (data.documento) {
            const fd = new FormData();
            fd.append('funcionarioId', data.funcionarioId);
            fd.append('referenciaAno', String(data.referenciaAno));
            fd.append('referenciaMes', String(data.referenciaMes));
            fd.append('dia', String(data.dia));
            fd.append('descricao', data.descricao);
            fd.append('documento', data.documento);
            return await axiosApiService.upload('/api/rh/falta-justificada', fd);
        }
        return await axiosApiService.post('/api/rh/falta-justificada', data);
    },

    async atualizarFaltaJustificada(
        ocorrenciaId: string,
        data: {
            descricao: string;
            documento?: File | null;
            removerAnexo?: boolean;
        },
    ) {
        const precisaMultipart = !!data.documento || data.removerAnexo === true;
        if (precisaMultipart) {
            const fd = new FormData();
            fd.append('descricao', data.descricao);
            if (data.removerAnexo) fd.append('removerAnexo', 'true');
            if (data.documento) fd.append('documento', data.documento);
            return await axiosApiService.uploadPut(`/api/rh/falta-justificada/${ocorrenciaId}`, fd);
        }
        return await axiosApiService.put(`/api/rh/falta-justificada/${ocorrenciaId}`, {
            descricao: data.descricao,
        });
    },

    async deletarAnexoFaltaJustificada(ocorrenciaId: string) {
        return await axiosApiService.delete(`/api/rh/falta-justificada/${ocorrenciaId}/anexo`);
    },

    async excluirFaltaJustificada(ocorrenciaId: string) {
        return await axiosApiService.delete(`/api/rh/falta-justificada/${ocorrenciaId}`);
    },

    async registrarJustificativaParcial(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        dia: number;
        descricao: string;
        justificativaTipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA';
        horaInicio: string;
        horaFim: string;
        classificacaoJustificativa?: 'ABONAR' | 'DESCONTAR_BANCO' | 'DESCONTAR_HORAS_DEVIDAS';
        documento?: File | null;
    }) {
        if (data.documento) {
            const fd = new FormData();
            fd.append('funcionarioId', data.funcionarioId);
            fd.append('referenciaAno', String(data.referenciaAno));
            fd.append('referenciaMes', String(data.referenciaMes));
            fd.append('dia', String(data.dia));
            fd.append('descricao', data.descricao);
            fd.append('justificativaTipo', data.justificativaTipo);
            fd.append('horaInicio', data.horaInicio);
            fd.append('horaFim', data.horaFim);
            if (data.classificacaoJustificativa) {
                fd.append('classificacaoJustificativa', data.classificacaoJustificativa);
            }
            fd.append('documento', data.documento);
            return await axiosApiService.upload('/api/rh/justificativa-parcial', fd);
        }
        return await axiosApiService.post('/api/rh/justificativa-parcial', data);
    },

    async atualizarJustificativaParcial(
        ocorrenciaId: string,
        data: {
            descricao: string;
            justificativaTipo: 'ENTRADA_ATRASADA' | 'SAIDA_ANTECIPADA';
            horaInicio: string;
            horaFim: string;
            classificacaoJustificativa?: 'ABONAR' | 'DESCONTAR_BANCO' | 'DESCONTAR_HORAS_DEVIDAS';
            documento?: File | null;
            removerAnexo?: boolean;
        },
    ) {
        const precisaMultipart = !!data.documento || data.removerAnexo === true;
        if (precisaMultipart) {
            const fd = new FormData();
            fd.append('descricao', data.descricao);
            fd.append('justificativaTipo', data.justificativaTipo);
            fd.append('horaInicio', data.horaInicio);
            fd.append('horaFim', data.horaFim);
            if (data.classificacaoJustificativa) {
                fd.append('classificacaoJustificativa', data.classificacaoJustificativa);
            }
            if (data.removerAnexo) fd.append('removerAnexo', 'true');
            if (data.documento) fd.append('documento', data.documento);
            return await axiosApiService.uploadPut(`/api/rh/justificativa-parcial/${ocorrenciaId}`, fd);
        }
        return await axiosApiService.put(`/api/rh/justificativa-parcial/${ocorrenciaId}`, data);
    },

    async excluirJustificativaParcial(ocorrenciaId: string) {
        return await axiosApiService.delete(`/api/rh/justificativa-parcial/${ocorrenciaId}`);
    },

    async salvarComentarioConferenciaPonto(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        dia: number;
        comentario: string | null;
        decisaoRh?: 'PENDENTE' | 'APROVADO_RH' | 'REPROVADO' | null;
        justificativaOcorrenciaId?: string | null;
        faltaJustificadaOcorrenciaId?: string | null;
    }) {
        return await axiosApiService.put('/api/rh/conferencia-ponto/comentario', data);
    },

    async salvarAvaliacaoDia(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        dia: number;
        botao: 'A' | 'B' | 'P' | 'D';
        temDebito?: boolean;
        temCredito?: boolean;
    }) {
        return await axiosApiService.put('/api/rh/conferencia-ponto/avaliacao', data);
    },

    async salvarFeriadoOverride(data: {
        referenciaAno: number;
        referenciaMes: number;
        dia: number;
        ehFeriado?: boolean;
        nome?: string | null;
        limpar?: boolean;
    }) {
        return await axiosApiService.put('/api/rh/feriado-override', data);
    },

    async proporDividaHoras(data: {
        funcionarioId: string;
        referenciaAno: number;
        referenciaMes: number;
        horasDivida: number;
        modoQuitacao: 'DESCONTAR_SALARIO' | 'COMPENSAR_BANCO';
        periodoCompensacao: 'DIAS_SEMANA' | 'FINAL_DE_SEMANA';
    }) {
        return await axiosApiService.post('/api/rh/divida-horas/propor', data);
    },

    async listarDividaHoras(funcionarioId: string, mesRef: string) {
        return await axiosApiService.get(`/api/rh/divida-horas/${funcionarioId}/${mesRef}`);
    },

    async aprovarDiaDivida(diaId: string) {
        return await axiosApiService.post(`/api/rh/divida-horas/dia/${diaId}/aprovar`, {});
    },

    async obterConfigExportacaoContabilidade() {
        return await axiosApiService.get<{
            config: {
                codigoEmpresaContabil: string | null;
                empresaFiscalIdFolha: string | null;
                percentualHeFolhaContabil: number;
                rubricasFolhaContabil: Record<string, number>;
                empresaFiscal: { id: string; razaoSocial: string; cnpj: string } | null;
            };
            empresasFiscais: Array<{ id: string; razaoSocial: string; cnpj: string; nomeFantasia?: string | null }>;
        }>('/api/rh/exportacao-contabilidade/config');
    },

    async salvarConfigExportacaoContabilidade(data: {
        codigoEmpresaContabil?: string | null;
        empresaFiscalIdFolha?: string | null;
        percentualHeFolhaContabil?: number;
        rubricasFolhaContabil?: Record<string, number>;
    }) {
        return await axiosApiService.put('/api/rh/exportacao-contabilidade/config', data);
    },

    async previewExportacaoFolhaContabilidade(mes: string) {
        return await axiosApiService.get<{
            totalColaboradores: number;
            colaboradoresComDados: number;
            avisos: string[];
        }>(`/api/rh/folha/${mes}/exportar-contabilidade`, { preview: '1' });
    },

    /** Download XLS layout LANÇAMENTOS FOLHA para contabilidade */
    async exportarFolhaContabilidade(mes: string) {
        return await axiosApiService.getBlob(`/api/rh/folha/${mes}/exportar-contabilidade`);
    },
};

// ========== BENEFÍCIOS ==========
export const beneficiosService = {
    async listar() {
        return await axiosApiService.get('/api/beneficios');
    },

    async criar(data: { nome: string; valorPadrao: number; ativo?: boolean }) {
        return await axiosApiService.post('/api/beneficios', data);
    },

    async atualizar(id: string, data: Partial<{ nome: string; valorPadrao: number; ativo: boolean }>) {
        return await axiosApiService.put(`/api/beneficios/${id}`, data);
    },

    async deletar(id: string) {
        return await axiosApiService.delete(`/api/beneficios/${id}`);
    },
};

// ========== VALES ==========
export const valesService = {
    async listar(funcionarioId?: string) {
        const url = funcionarioId ? `/api/vales?funcionarioId=${funcionarioId}` : '/api/vales';
        return await axiosApiService.get(url);
    },
    
    async buscar(id: string) {
        return await axiosApiService.get(`/api/vales/${id}`);
    },
    
    async criar(data: {
        funcionarioId: string;
        tipo: string;
        valor: number;
        data: string;
        descricao?: string;
    }) {
        return await axiosApiService.post('/api/vales', data);
    },
    
    async atualizar(id: string, data: Partial<{
        tipo: string;
        valor: number;
        data: string;
        descricao?: string;
    }>) {
        return await axiosApiService.put(`/api/vales/${id}`, data);
    },
    
    async deletar(id: string) {
        return await axiosApiService.delete(`/api/vales/${id}`);
    }
};

// ========== VEÍCULOS ==========
export const veiculosService = {
    async listar() {
        return await axiosApiService.get('/api/veiculos');
    },
    
    async buscar(id: string) {
        return await axiosApiService.get(`/api/veiculos/${id}`);
    },
    
    async criar(data: {
        modelo: string;
        placa: string;
        tipo: string;
        ano: number;
        status?: string;
        kmAtual?: number;
        dataVencimentoIpva?: string;
        dataVencimentoLicenciamento?: string;
    }) {
        return await axiosApiService.post('/api/veiculos', data);
    },
    
    async atualizar(id: string, data: Partial<{
        modelo: string;
        placa: string;
        tipo: string;
        ano: number;
        status?: string;
        kmAtual?: number;
        dataVencimentoIpva?: string | null;
        dataVencimentoLicenciamento?: string | null;
    }>) {
        return await axiosApiService.put(`/api/veiculos/${id}`, data);
    },
    
    async deletar(id: string) {
        return await axiosApiService.delete(`/api/veiculos/${id}`);
    },
    
    async obterMetricas() {
        return await axiosApiService.get('/api/veiculos/metricas');
    },

    async obterConsumo(id: string) {
        return await axiosApiService.get(`/api/veiculos/${id}/consumo`);
    },

    async obterAlertasIpva(mes?: number, ano?: number) {
        const params = new URLSearchParams();
        if (mes != null) params.set('mes', String(mes));
        if (ano != null) params.set('ano', String(ano));
        const q = params.toString();
        return await axiosApiService.get(`/api/veiculos/alertas-ipva${q ? `?${q}` : ''}`);
    }
};

// ========== GASTOS DE VEÍCULOS ==========
export const gastosVeiculoService = {
    async listar(veiculoId?: string) {
        const url = veiculoId ? `/api/gastos-veiculo?veiculoId=${veiculoId}` : '/api/gastos-veiculo';
        return await axiosApiService.get(url);
    },
    
    async buscar(id: string) {
        return await axiosApiService.get(`/api/gastos-veiculo/${id}`);
    },
    
    async criar(data: {
        veiculoId: string;
        tipo: string;
        descricao?: string;
        valor: number;
        data: string;
        km?: number;
        litros?: number;
        obraId?: string;
        responsavel?: string;
    }) {
        return await axiosApiService.post('/api/gastos-veiculo', data);
    },
    
    async atualizar(id: string, data: Partial<{
        tipo: string;
        descricao?: string;
        valor: number;
        data: string;
        km?: number;
        litros?: number;
        obraId?: string;
        responsavel?: string;
    }>) {
        return await axiosApiService.put(`/api/gastos-veiculo/${id}`, data);
    },
    
    async deletar(id: string) {
        return await axiosApiService.delete(`/api/gastos-veiculo/${id}`);
    }
};

// ========== PLANOS ESTRATÉGICOS ==========
export const planosService = {
    async listar(status?: string) {
        const url = status ? `/api/planos?status=${status}` : '/api/planos';
        return await axiosApiService.get(url);
    },
    
    async buscar(id: string) {
        return await axiosApiService.get(`/api/planos/${id}`);
    },
    
    async criar(data: {
        titulo: string;
        descricao: string;
        prazo: string;
        responsavel: string;
        prioridade?: string;
        status?: string;
        categoria?: string;
    }) {
        return await axiosApiService.post('/api/planos', data);
    },
    
    async atualizar(id: string, data: Partial<{
        titulo: string;
        descricao: string;
        prazo: string;
        responsavel: string;
        prioridade?: string;
        status?: string;
        categoria?: string;
    }>) {
        // Usamos PATCH para atualizações parciais
        return await axiosApiService.patch(`/api/planos/${id}`, data);
    },
    
    async toggleStatus(id: string) {
        return await axiosApiService.patch(`/api/planos/${id}/toggle`);
    },
    
    async deletar(id: string) {
        return await axiosApiService.delete(`/api/planos/${id}`);
    },
    
    async obterMetricas() {
        return await axiosApiService.get('/api/planos/metricas');
    }
};

// ========== DESPESAS FIXAS ==========
export const despesasFixasService = {
    async listar(ativa?: boolean) {
        const url = ativa !== undefined ? `/api/despesas-fixas?ativa=${ativa}` : '/api/despesas-fixas';
        return await axiosApiService.get(url);
    },
    
    async buscar(id: string) {
        return await axiosApiService.get(`/api/despesas-fixas/${id}`);
    },
    
    async criar(data: {
        descricao: string;
        categoria: string;
        valor: number;
        diaVencimento: number;
        fornecedor?: string;
        observacoes?: string;
    }) {
        return await axiosApiService.post('/api/despesas-fixas', data);
    },
    
    async atualizar(id: string, data: Partial<{
        descricao: string;
        categoria: string;
        valor: number;
        diaVencimento: number;
        ativa: boolean;
        fornecedor?: string;
        observacoes?: string;
    }>) {
        return await axiosApiService.put(`/api/despesas-fixas/${id}`, data);
    },
    
    async deletar(id: string) {
        return await axiosApiService.delete(`/api/despesas-fixas/${id}`);
    },
    
    async registrarPagamento(id: string, data: {
        mesReferencia: string;
        valorPago: number;
        dataPagamento: string;
        observacoes?: string;
    }) {
        return await axiosApiService.post(`/api/despesas-fixas/${id}/pagamento`, data);
    },
    
    async obterMetricas() {
        return await axiosApiService.get('/api/despesas-fixas/metricas');
    }
};

