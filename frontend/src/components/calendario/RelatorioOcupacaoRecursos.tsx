import React, { useMemo, useState } from 'react';
import type { RelatorioOcupacaoDTO } from '../../services/AlocacaoObraService';

function fmtData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function exportarCsv(relatorio: RelatorioOcupacaoDTO) {
  const linhas: string[] = [
    'Tipo,Recurso,Ocupado Hoje,OS Vinculadas,Previsao Liberacao,OS Titulo,OS Numero,Cliente,Inicio,Fim Previsto,Status',
  ];
  for (const r of relatorio.porRecurso) {
    if (r.alocacoes.length === 0) {
      linhas.push(
        [
          r.tipo,
          `"${r.nome}"`,
          r.ocupadoHoje ? 'Sim' : 'Nao',
          r.osVinculadas,
          r.previsaoLiberacao ? fmtData(r.previsaoLiberacao) : '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(',')
      );
      continue;
    }
    for (const a of r.alocacoes) {
      linhas.push(
        [
          r.tipo,
          `"${r.nome}"`,
          r.ocupadoHoje ? 'Sim' : 'Nao',
          r.osVinculadas,
          r.previsaoLiberacao ? fmtData(r.previsaoLiberacao) : '',
          `"${a.osTitulo}"`,
          a.osNumero ?? '',
          `"${a.clienteNome}"`,
          fmtData(a.dataInicio),
          fmtData(a.dataFimPrevisto),
          a.status,
        ].join(',')
      );
    }
  }
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-ocupacao-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface RelatorioOcupacaoRecursosProps {
  relatorio: RelatorioOcupacaoDTO | null;
  loading?: boolean;
}

const RelatorioOcupacaoRecursos: React.FC<RelatorioOcupacaoRecursosProps> = ({
  relatorio,
  loading,
}) => {
  const [aberto, setAberto] = useState(false);

  const { equipes, eletricistas } = useMemo(() => {
    const lista = relatorio?.porRecurso ?? [];
    return {
      equipes: lista.filter((r) => r.tipo === 'equipe'),
      eletricistas: lista.filter((r) => r.tipo === 'eletricista'),
    };
  }, [relatorio]);

  const renderGrupo = (titulo: string, itens: typeof equipes) => {
    if (itens.length === 0) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Nenhum {titulo.toLowerCase()} cadastrado.</p>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200 dark:border-dark-border">
              <th className="py-2 pr-3">Recurso</th>
              <th className="py-2 pr-3">Hoje</th>
              <th className="py-2 pr-3">OS</th>
              <th className="py-2 pr-3">Liberação prevista</th>
              <th className="py-2">Alocações (períodos)</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((r) => (
              <tr
                key={`${r.tipo}-${r.id}`}
                className="border-b border-gray-100 dark:border-dark-border align-top"
              >
                <td className="py-2 pr-3 font-medium text-gray-900 dark:text-dark-text">{r.nome}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      r.ocupadoHoje
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {r.ocupadoHoje ? 'Ocupado' : 'Livre'}
                  </span>
                </td>
                <td className="py-2 pr-3">{r.osVinculadas}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {r.previsaoLiberacao ? fmtData(r.previsaoLiberacao) : '—'}
                </td>
                <td className="py-2">
                  {r.alocacoes.length === 0 ? (
                    <span className="text-gray-400">Sem alocação ativa</span>
                  ) : (
                    <ul className="space-y-1">
                      {r.alocacoes.map((a) => (
                        <li key={a.id} className="text-xs text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">{a.osNumero ?? a.osTitulo}</span>
                          {' · '}
                          {fmtData(a.dataInicio)} → {fmtData(a.dataFimPrevisto)}
                          {' · '}
                          <span className="text-gray-500">{a.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="mx-4 mb-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-bg"
      >
        <span className="font-semibold text-gray-900 dark:text-dark-text">
          Detalhamento por equipe / eletricista
        </span>
        <span className="text-gray-500 text-sm">{aberto ? '▲' : '▼'}</span>
      </button>
      {aberto && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-dark-border space-y-4">
          {loading && (
            <p className="text-sm text-gray-500 py-2">Carregando relatório…</p>
          )}
          {!loading && relatorio && (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => exportarCsv(relatorio)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-700 text-white hover:bg-slate-800"
                >
                  Exportar CSV
                </button>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Equipes</h4>
                {renderGrupo('Equipes', equipes)}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Eletricistas</h4>
                {renderGrupo('Eletricistas', eletricistas)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RelatorioOcupacaoRecursos;
