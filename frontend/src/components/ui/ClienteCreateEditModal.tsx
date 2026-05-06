import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { clientesService, type Cliente, type CreateClienteData } from '../../services/clientesService';

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);
const GlobeAltIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>
);
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
    />
  </svg>
);

type FormState = CreateClienteData & { numero?: string };

export interface ClienteCreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteToEdit?: Cliente | null;
  initialValues?: Partial<FormState>;
  onSuccess: (cliente: Cliente) => void;
}

const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');
const formatCPF = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};
const formatCNPJ = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
};
const formatCpfCnpj = (raw: string, tipo: 'PF' | 'PJ') => (tipo === 'PF' ? formatCPF(raw) : formatCNPJ(raw));

/** Converte valor da API (string ou objeto { id, descricao }) para string segura para React */
const toDisplayValue = (val: unknown): string => {
  if (val == null) return '—';
  if (typeof val === 'string') return val.trim() || '—';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null && 'descricao' in val) return String((val as { descricao?: string }).descricao ?? '—');
  if (typeof val === 'object' && val !== null && 'nome' in val) return String((val as { nome?: string }).nome ?? '—');
  if (typeof val === 'object' && val !== null && 'id' in val) {
    const o = val as { id?: string | number; descricao?: string };
    return [o.id, o.descricao].filter(Boolean).join(' - ') || '—';
  }
  return String(val);
};

const defaultForm: FormState = {
  nome: '',
  cpfCnpj: '',
  email: '',
  telefone: '',
  endereco: '',
  numero: '',
  bairro: '',
  inscricaoEstadual: '',
  indIEDest: undefined,
  cidade: '',
  estado: '',
  cep: '',
  tipo: 'PJ',
};

const ClienteCreateEditModal: React.FC<ClienteCreateEditModalProps> = ({
  isOpen,
  onClose,
  clienteToEdit = null,
  initialValues,
  onSuccess,
}) => {
  const [formState, setFormState] = useState<FormState>(defaultForm);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjFetchedData, setCnpjFetchedData] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const computedInitialForm = useMemo(() => {
    if (clienteToEdit) {
      return {
        ...defaultForm,
        nome: clienteToEdit.nome,
        cpfCnpj: clienteToEdit.cpfCnpj,
        email: clienteToEdit.email,
        telefone: clienteToEdit.telefone,
        endereco: clienteToEdit.endereco || '',
        numero: (clienteToEdit as any).numero || '',
        bairro: clienteToEdit.bairro || '',
        inscricaoEstadual: (clienteToEdit as any).inscricaoEstadual || '',
        indIEDest: (clienteToEdit as any).indIEDest ?? undefined,
        cidade: clienteToEdit.cidade,
        estado: clienteToEdit.estado,
        cep: clienteToEdit.cep,
        tipo: clienteToEdit.tipo,
      } satisfies FormState;
    }
    return {
      ...defaultForm,
      ...(initialValues ?? {}),
      ...(initialValues?.tipo ? { tipo: initialValues.tipo } : null),
    } satisfies FormState;
  }, [clienteToEdit, initialValues]);

  useEffect(() => {
    if (!isOpen) return;
    setCnpjFetchedData(null);
    setCnpjError(null);
    setCnpjLoading(false);
    setSaving(false);
    // Normalizar máscara de CPF/CNPJ se vier sem formatação
    const tipo = computedInitialForm.tipo;
    const cpfCnpjFormatted = computedInitialForm.cpfCnpj ? formatCpfCnpj(computedInitialForm.cpfCnpj, tipo) : '';
    setFormState({
      ...computedInitialForm,
      cpfCnpj: cpfCnpjFormatted,
    });
  }, [computedInitialForm, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      const emailFinal = (formState.email || '').trim() || 'contato@cliente.com';
      let response:
        | { success: true; data: Cliente }
        | { success: false; error?: string; data?: undefined };

      if (clienteToEdit) {
        response = (await clientesService.atualizar(clienteToEdit.id, {
          ...formState,
          cpfCnpj: onlyDigits(formState.cpfCnpj),
          email: emailFinal,
          dadosCnpjWs: cnpjFetchedData && typeof cnpjFetchedData === 'object' ? cnpjFetchedData : undefined,
        })) as any;
      } else {
        response = (await clientesService.criar({
          ...formState,
          cpfCnpj: onlyDigits(formState.cpfCnpj),
          email: emailFinal,
          dadosCnpjWs: cnpjFetchedData && typeof cnpjFetchedData === 'object' ? cnpjFetchedData : undefined,
        })) as any;
      }

      if (response.success && response.data) {
        onSuccess(response.data);
        onClose();
      } else {
        const errorMsg = (response as any)?.error || 'Erro ao salvar cliente';
        toast.error('Erro ao salvar cliente', { description: errorMsg });
      }
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      toast.error('Erro de conexão', { description: 'Não foi possível salvar o cliente' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="modal-content max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
        {/* Header */}
        <div className="modal-header relative bg-gradient-to-r from-blue-600 to-blue-700 border-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
              {clienteToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{clienteToEdit ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <p className="text-sm text-white/80 mt-1">
                {clienteToEdit ? 'Atualize as informações do cliente' : 'Preencha os dados para cadastrar um novo cliente'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!cnpjLoading && !saving) onClose();
            }}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Pessoa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Tipo de Pessoa *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormState({ ...formState, tipo: 'PF', cpfCnpj: formatCPF(formState.cpfCnpj) })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-semibold ${
                  formState.tipo === 'PF'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:border-gray-400 dark:hover:border-dark-border'
                }`}
              >
                <span className="text-xl">👤</span>
                Pessoa Física
              </button>
              <button
                type="button"
                onClick={() => setFormState({ ...formState, tipo: 'PJ', cpfCnpj: formatCNPJ(formState.cpfCnpj) })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-semibold ${
                  formState.tipo === 'PJ'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:border-gray-400 dark:hover:border-dark-border'
                }`}
              >
                <span className="text-xl">🏢</span>
                Pessoa Jurídica
              </button>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                {formState.tipo === 'PF' ? 'Nome Completo' : 'Razão Social'} *
              </label>
              <input
                type="text"
                value={formState.nome}
                onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                required
                className="input-field"
                placeholder={formState.tipo === 'PF' ? 'Ex: João Silva' : 'Ex: Empresa LTDA'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                {formState.tipo === 'PF' ? 'CPF' : 'CNPJ'} *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formState.cpfCnpj}
                  onChange={(e) => {
                    const v = e.target.value;
                    const formatted = formatCpfCnpj(v, formState.tipo);
                    setFormState((prev) => ({ ...prev, cpfCnpj: formatted }));
                    setCnpjFetchedData(null);
                  }}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                    const text = e.clipboardData.getData('text') || '';
                    e.preventDefault();
                    const formatted = formatCpfCnpj(text, formState.tipo);
                    setFormState((prev) => ({ ...prev, cpfCnpj: formatted }));
                    setCnpjFetchedData(null);
                  }}
                  required
                  className="input-field flex-1"
                  placeholder={formState.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                />
                {formState.tipo === 'PJ' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const raw = onlyDigits(formState.cpfCnpj || '');
                      if (raw.length !== 14) {
                        toast.error('Digite um CNPJ válido (14 dígitos).');
                        return;
                      }
                      setCnpjError(null);
                      setCnpjLoading(true);

                      try {
                        const result = await clientesService.consultarCnpj(raw);
                        if (!result.success || !result.data) {
                          const errMsg = result.error || 'CNPJ não encontrado';
                          toast.error(errMsg);
                          setCnpjError(errMsg);
                          return;
                        }

                        const d: any = result.data;
                        setFormState((prev) => ({
                          ...prev,
                          nome: d.razaoSocial || prev.nome,
                          cpfCnpj: formatCpfCnpj(d.cnpj, 'PJ'),
                          email: d.email || prev.email || '',
                          telefone: d.telefone || prev.telefone || '',
                          endereco: d.logradouro || prev.endereco || '',
                          numero: d.numero || prev.numero || '',
                          bairro: d.bairro || prev.bairro || '',
                          inscricaoEstadual: d.inscricaoEstadual || (d.indIEDest === 2 ? 'ISENTO' : '') || prev.inscricaoEstadual || '',
                          indIEDest: d.indIEDest,
                          cidade: d.cidade || prev.cidade || '',
                          estado: d.estado || prev.estado || '',
                          cep: d.cep || prev.cep || '',
                        }));
                        setCnpjFetchedData(d.raw ?? d);

                        toast.success('Dados carregados (CNPJ.ws). Ajuste IE/Contribuinte se necessário.');
                      } catch (err: any) {
                        console.error('Erro ao consultar CNPJ:', err);
                        setCnpjError(err?.message || 'Erro ao consultar CNPJ');
                        toast.error('Erro ao consultar CNPJ: ' + (err?.message || 'unknown'));
                      } finally {
                        setCnpjLoading(false);
                      }
                    }}
                    disabled={cnpjLoading}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                  >
                    {cnpjLoading ? 'Buscando...' : 'Buscar CNPJ'}
                  </button>
                )}
              </div>
              {cnpjError && <p className="text-xs text-red-600 mt-1">{cnpjError}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="input-field"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Telefone</label>
              <input
                type="text"
                value={formState.telefone}
                onChange={(e) => setFormState({ ...formState, telefone: e.target.value })}
                className="input-field"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Logradouro (Rua/Av.)</label>
              <input
                type="text"
                value={formState.endereco}
                onChange={(e) => setFormState({ ...formState, endereco: e.target.value })}
                className="input-field"
                placeholder="Rua, Avenida, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Número</label>
              <input
                type="text"
                value={formState.numero || ''}
                onChange={(e) => setFormState({ ...formState, numero: e.target.value })}
                className="input-field"
                placeholder="Nº"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Cidade</label>
              <input
                type="text"
                value={formState.cidade}
                onChange={(e) => setFormState({ ...formState, cidade: e.target.value })}
                className="input-field"
                placeholder="Nome da cidade"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Estado</label>
              <select value={formState.estado} onChange={(e) => setFormState({ ...formState, estado: e.target.value })} className="input-field">
                <option value="">Selecione</option>
                <option value="SC">Santa Catarina</option>
                <option value="PR">Paraná</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                Bairro <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formState.bairro}
                onChange={(e) => setFormState({ ...formState, bairro: e.target.value })}
                className="input-field"
                placeholder="Bairro (obrigatório para NF-e)"
              />
            </div>

            {formState.tipo === 'PJ' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Contribuinte ICMS / IE (NF-e)</label>
                <div className="flex flex-wrap gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="indIEDest"
                      checked={(formState.indIEDest ?? 9) === 1}
                      onChange={() => setFormState({ ...formState, indIEDest: 1, inscricaoEstadual: formState.inscricaoEstadual || '' })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Contribuinte ICMS (tag 1, exige IE)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="indIEDest"
                      checked={(formState.indIEDest ?? 9) === 9}
                      onChange={() => setFormState({ ...formState, indIEDest: 9, inscricaoEstadual: '' })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Não Contribuinte (tag 9)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="indIEDest"
                      checked={(formState.indIEDest ?? 9) === 2}
                      onChange={() => setFormState({ ...formState, indIEDest: 2, inscricaoEstadual: 'ISENTO' })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Isento (tag 2, IE &quot;ISENTO&quot;)</span>
                  </label>
                </div>
                {formState.indIEDest === 1 && (
                  <>
                    <input
                      type="text"
                      value={formState.inscricaoEstadual || ''}
                      onChange={(e) => setFormState({ ...formState, inscricaoEstadual: e.target.value })}
                      className="input-field"
                      placeholder="Inscrição Estadual"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Preenchido automaticamente pela CNPJ.ws quando houver IE no mesmo estado. Ajuste manual se necessário.
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">CEP</label>
              <input
                type="text"
                value={formState.cep}
                onChange={(e) => setFormState({ ...formState, cep: e.target.value })}
                className="input-field"
                placeholder="00000-000"
              />
            </div>

            {cnpjFetchedData && (
              <div className="md:col-span-2 border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Dados da CNPJ.ws (pré-visualização)</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <section className="bg-gray-50/50 dark:bg-dark-hover/30 rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-2 mb-2">
                      <DocumentTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dados da Empresa</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'Nome Fantasia', value: cnpjFetchedData.estabelecimento?.nome_fantasia ?? cnpjFetchedData.nome_fantasia },
                        { label: 'Porte', value: cnpjFetchedData.porte },
                        {
                          label: 'Capital Social',
                          value:
                            cnpjFetchedData.capital_social != null
                              ? `R$ ${Number(cnpjFetchedData.capital_social).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : null,
                        },
                        { label: 'Data Situação', value: cnpjFetchedData.estabelecimento?.data_situacao_cadastral ?? cnpjFetchedData.data_situacao_cadastral },
                        { label: 'Natureza Jurídica', value: cnpjFetchedData.natureza_juridica },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight">
                            {typeof value === 'number' ? String(value) : toDisplayValue(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="bg-gray-50/50 dark:bg-dark-hover/30 rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-2 mb-2">
                      <GlobeAltIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Localização</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'País', value: cnpjFetchedData.estabelecimento?.pais ?? 'Brasil' },
                        { label: 'Estado', value: cnpjFetchedData.estabelecimento?.estado },
                        { label: 'Cidade', value: cnpjFetchedData.estabelecimento?.cidade },
                        { label: 'CEP', value: cnpjFetchedData.estabelecimento?.cep },
                        { label: 'Bairro', value: cnpjFetchedData.estabelecimento?.bairro },
                        {
                          label: 'Logradouro',
                          value: [cnpjFetchedData.estabelecimento?.tipo_logradouro, cnpjFetchedData.estabelecimento?.logradouro, cnpjFetchedData.estabelecimento?.numero]
                            .filter(Boolean)
                            .join(', '),
                        },
                        { label: 'Complemento', value: cnpjFetchedData.estabelecimento?.complemento },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight">{toDisplayValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="bg-gray-50/50 dark:bg-dark-hover/30 rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                    <div className="flex items-center gap-2 mb-2">
                      <PhoneIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Contato</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">E-mail</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight break-all">
                          {toDisplayValue(cnpjFetchedData.estabelecimento?.email ?? formState.email)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefones</p>
                        <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight">
                          {[
                            cnpjFetchedData.estabelecimento?.ddd1 && cnpjFetchedData.estabelecimento?.telefone1
                              ? `${cnpjFetchedData.estabelecimento.ddd1} ${cnpjFetchedData.estabelecimento.telefone1}`
                              : null,
                            cnpjFetchedData.estabelecimento?.ddd2 && cnpjFetchedData.estabelecimento?.telefone2
                              ? `${cnpjFetchedData.estabelecimento.ddd2} ${cnpjFetchedData.estabelecimento.telefone2}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' / ') ||
                            formState.telefone ||
                            '—'}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
            <button
              type="button"
              onClick={() => {
                if (!cnpjLoading && !saving) onClose();
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clienteToEdit ? 'Atualizar' : 'Cadastrar'} Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClienteCreateEditModal;

