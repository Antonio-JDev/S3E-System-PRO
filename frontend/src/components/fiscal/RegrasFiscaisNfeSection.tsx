import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  regraFiscalNfeService,
  type RegraFiscalNfe,
  type SalvarRegraFiscalNfe,
} from '../../services/regraFiscalNfeService';

type Regime = 'SimplesNacional' | 'RegimeNormal';

interface EmpresaOpcao {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

interface FormularioRegra {
  empresaFiscalId: string;
  regime: Regime;
  cfop: string;
  ncm: string;
  origem: string;
  cstIcms: string;
  aliquotaIcms: string;
  cstPis: string;
  aliquotaPis: string;
  cstCofins: string;
  aliquotaCofins: string;
  cstIpi: string;
  aliquotaIpi: string;
  informarTotTrib: boolean;
}

const FORM_SIMPLES: FormularioRegra = {
  empresaFiscalId: '',
  regime: 'SimplesNacional',
  cfop: '',
  ncm: '',
  origem: '0',
  cstIcms: '102',
  aliquotaIcms: '0',
  cstPis: '49',
  aliquotaPis: '0',
  cstCofins: '49',
  aliquotaCofins: '0',
  cstIpi: '99',
  aliquotaIpi: '0',
  informarTotTrib: false,
};

const FORM_NORMAL: FormularioRegra = {
  ...FORM_SIMPLES,
  regime: 'RegimeNormal',
  cstIcms: '00',
  aliquotaIcms: '12',
  cstPis: '01',
  aliquotaPis: '1.65',
  cstCofins: '01',
  aliquotaCofins: '7.60',
};

function rotuloRegime(regime: string): string {
  return regime === 'SimplesNacional' ? 'Simples Nacional' : 'Regime Normal';
}

function numeroCampo(valor: string): number {
  return Number(valor.replace(',', '.'));
}

function paraPayload(form: FormularioRegra): SalvarRegraFiscalNfe {
  return {
    empresaFiscalId: form.empresaFiscalId || null,
    regime: form.regime,
    cfop: form.cfop.trim() || null,
    ncm: form.ncm.trim() || null,
    origem: form.origem.trim() || '0',
    cstIcms: form.cstIcms.trim(),
    aliquotaIcms: numeroCampo(form.aliquotaIcms),
    cstPis: form.cstPis.trim(),
    aliquotaPis: numeroCampo(form.aliquotaPis),
    cstCofins: form.cstCofins.trim(),
    aliquotaCofins: numeroCampo(form.aliquotaCofins),
    cstIpi: form.cstIpi.trim() || '99',
    aliquotaIpi: numeroCampo(form.aliquotaIpi || '0'),
    informarTotTrib: form.regime === 'SimplesNacional' ? form.informarTotTrib : false,
  };
}

const RegrasFiscaisNfeSection: React.FC<{ empresas: EmpresaOpcao[] }> = ({ empresas }) => {
  const [regras, setRegras] = useState<RegraFiscalNfe[]>([]);
  const [form, setForm] = useState<FormularioRegra>(FORM_SIMPLES);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resposta = await regraFiscalNfeService.listar();
    if (resposta.success && Array.isArray(resposta.data)) {
      setRegras(resposta.data);
      setErro('');
    } else {
      setErro(resposta.error || 'Não foi possível carregar as regras fiscais.');
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const atualizar = (parcial: Partial<FormularioRegra>) => {
    setForm((atual) => ({ ...atual, ...parcial }));
  };

  const trocarRegime = (regime: Regime) => {
    setForm((atual) => ({
      ...(regime === 'SimplesNacional' ? FORM_SIMPLES : FORM_NORMAL),
      empresaFiscalId: atual.empresaFiscalId,
      cfop: atual.cfop,
      ncm: atual.ncm,
      regime,
    }));
  };

  const editar = (regra: RegraFiscalNfe) => {
    setEditandoId(regra.id);
    setErro('');
    setForm({
      empresaFiscalId: regra.empresaFiscalId || '',
      regime: regra.regime,
      cfop: regra.cfop || '',
      ncm: regra.ncm || '',
      origem: regra.origem,
      cstIcms: regra.cstIcms,
      aliquotaIcms: String(regra.aliquotaIcms),
      cstPis: regra.cstPis,
      aliquotaPis: String(regra.aliquotaPis),
      cstCofins: regra.cstCofins,
      aliquotaCofins: String(regra.aliquotaCofins),
      cstIpi: regra.cstIpi,
      aliquotaIpi: String(regra.aliquotaIpi),
      informarTotTrib: regra.informarTotTrib,
    });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setForm(FORM_SIMPLES);
    setErro('');
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    const payload = paraPayload(form);
    const resposta = editandoId
      ? await regraFiscalNfeService.atualizar(editandoId, payload)
      : await regraFiscalNfeService.criar(payload);

    setSalvando(false);
    if (!resposta.success) {
      setErro(resposta.error || 'Não foi possível salvar a regra fiscal.');
      return;
    }

    toast.success(editandoId ? 'Regra fiscal atualizada.' : 'Regra fiscal cadastrada.');
    cancelarEdicao();
    await carregar();
  };

  const desativar = async (id: string) => {
    const resposta = await regraFiscalNfeService.desativar(id);
    if (!resposta.success) {
      toast.error(resposta.error || 'Não foi possível desativar a regra.');
      return;
    }
    if (editandoId === id) cancelarEdicao();
    toast.success('Regra fiscal desativada.');
    await carregar();
  };

  const nomeEmpresa = (id: string | null) => {
    if (!id) return 'Todas as empresas';
    const empresa = empresas.find((item) => item.id === id);
    return empresa ? empresa.razaoSocial : 'Empresa específica';
  };

  return (
    <section className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 mt-6">
      <div className="mb-5">
        <h3 className="text-xl font-bold text-gray-800 dark:text-dark-text">Regras fiscais da NF-e</h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
          O contador define CFOP, CST/CSOSN e alíquotas. Na emissão, a regra de NCM mais longa tem prioridade, depois a de CFOP e, por último, a do regime. Empresa em branco vale para todos os CNPJs.
        </p>
      </div>

      <form onSubmit={(event) => void salvar(event)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Empresa</span>
            <select
              className="select-field mt-1"
              value={form.empresaFiscalId}
              onChange={(event) => atualizar({ empresaFiscalId: event.target.value })}
            >
              <option value="">Todas as empresas</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.razaoSocial}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Regime</span>
            <select
              className="select-field mt-1"
              value={form.regime}
              onChange={(event) => trocarRegime(event.target.value as Regime)}
            >
              <option value="SimplesNacional">Simples Nacional</option>
              <option value="RegimeNormal">Regime Normal</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">CFOP</span>
            <input
              className="input-field mt-1"
              value={form.cfop}
              onChange={(event) => atualizar({ cfop: event.target.value })}
              placeholder="Vazio = qualquer"
              inputMode="numeric"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">NCM</span>
            <input
              className="input-field mt-1"
              value={form.ncm}
              onChange={(event) => atualizar({ ncm: event.target.value })}
              placeholder="Vazio = qualquer"
              inputMode="numeric"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Origem</span>
            <input className="input-field mt-1" value={form.origem} onChange={(event) => atualizar({ origem: event.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">CST/CSOSN do ICMS</span>
            <input className="input-field mt-1" value={form.cstIcms} onChange={(event) => atualizar({ cstIcms: event.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Alíquota ICMS (%)</span>
            <input className="input-field mt-1" value={form.aliquotaIcms} onChange={(event) => atualizar({ aliquotaIcms: event.target.value })} inputMode="decimal" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">CST PIS</span>
            <input className="input-field mt-1" value={form.cstPis} onChange={(event) => atualizar({ cstPis: event.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Alíquota PIS (%)</span>
            <input className="input-field mt-1" value={form.aliquotaPis} onChange={(event) => atualizar({ aliquotaPis: event.target.value })} inputMode="decimal" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">CST COFINS</span>
            <input className="input-field mt-1" value={form.cstCofins} onChange={(event) => atualizar({ cstCofins: event.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Alíquota COFINS (%)</span>
            <input className="input-field mt-1" value={form.aliquotaCofins} onChange={(event) => atualizar({ aliquotaCofins: event.target.value })} inputMode="decimal" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">CST IPI</span>
            <input className="input-field mt-1" value={form.cstIpi} onChange={(event) => atualizar({ cstIpi: event.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700 dark:text-dark-text">Alíquota IPI (%)</span>
            <input className="input-field mt-1" value={form.aliquotaIpi} onChange={(event) => atualizar({ aliquotaIpi: event.target.value })} inputMode="decimal" />
          </label>
        </div>

        {form.regime === 'SimplesNacional' && (
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-dark-text">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.informarTotTrib}
              onChange={(event) => atualizar({ informarTotTrib: event.target.checked })}
            />
            <span>
              Informar o valor aproximado dos tributos (vTotTrib). No Simples Nacional esse total permanece zerado até esta opção ser marcada na regra.
            </span>
          </label>
        )}

        {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={salvando}
            className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Salvar regra'}
          </button>
          {editandoId && (
            <button type="button" onClick={cancelarEdicao} className="px-5 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg font-medium text-gray-700 dark:text-dark-text">
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 overflow-x-auto">
        {carregando ? (
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Carregando regras...</p>
        ) : regras.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            Nenhuma regra cadastrada. Sem regra, a emissão usa o padrão do regime.
          </p>
        ) : (
          <table className="min-w-full text-sm text-gray-900 dark:text-dark-text">
            <thead>
              <tr className="text-left text-gray-500 dark:text-dark-text-secondary border-b border-gray-200 dark:border-dark-border">
                <th className="py-2 pr-3 font-medium">Regime</th>
                <th className="py-2 pr-3 font-medium">Empresa</th>
                <th className="py-2 pr-3 font-medium">CFOP</th>
                <th className="py-2 pr-3 font-medium">NCM</th>
                <th className="py-2 pr-3 font-medium">ICMS</th>
                <th className="py-2 pr-3 font-medium">PIS</th>
                <th className="py-2 pr-3 font-medium">COFINS</th>
                <th className="py-2 pr-3 font-medium">IPI</th>
                <th className="py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((regra) => (
                <tr key={regra.id} className="border-b border-gray-100 dark:border-dark-border">
                  <td className="py-2 pr-3">{rotuloRegime(regra.regime)}</td>
                  <td className="py-2 pr-3">{nomeEmpresa(regra.empresaFiscalId)}</td>
                  <td className="py-2 pr-3">{regra.cfop || 'Qualquer'}</td>
                  <td className="py-2 pr-3">{regra.ncm || 'Qualquer'}</td>
                  <td className="py-2 pr-3">{regra.cstIcms} · {regra.aliquotaIcms}%</td>
                  <td className="py-2 pr-3">{regra.cstPis} · {regra.aliquotaPis}%</td>
                  <td className="py-2 pr-3">{regra.cstCofins} · {regra.aliquotaCofins}%</td>
                  <td className="py-2 pr-3">{regra.cstIpi} · {regra.aliquotaIpi}%</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editar(regra)} className="text-blue-600 dark:text-blue-400 font-medium">
                        Editar
                      </button>
                      <button type="button" onClick={() => void desativar(regra.id)} className="text-red-600 dark:text-red-400 font-medium">
                        Desativar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default RegrasFiscaisNfeSection;
