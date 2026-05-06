import React, { useEffect, useState } from 'react';

type DashboardRHFolhaItem = {
  funcionarioId: string;
  nome: string;
  diasTrabalhados: number;
  totalHoras: number;
  beneficios: number;
  totalAPagar: number;
};

interface DashboardRHProps {
  toggleSidebar: () => void;
  onNavigate: (view: string) => void;
}

const DashboardRH: React.FC<DashboardRHProps> = ({ toggleSidebar }) => {
  const [itens, setItens] = useState<DashboardRHFolhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: integrar com endpoint de RH quando disponível
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            aria-label="Abrir menu lateral"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
              Dashboard de Recursos Humanos
            </h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">
              Visão consolidada de horas, benefícios e total a pagar por colaborador.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-red-800 font-medium">Erro ao carregar dados de RH: {error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-soft">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Resumo de Folha por Funcionário</h2>
            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
              Estrutura inicial da tabela para futura integração com o backend de RH.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Dias Trabalhados
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Total Horas
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Benefícios (R$)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Total a Pagar (R$)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-800">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Carregando dados de RH...
                  </td>
                </tr>
              )}

              {!loading && itens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhum dado de folha disponível ainda. Integre este dashboard com o backend de RH para visualizar
                    os colaboradores.
                  </td>
                </tr>
              )}

              {!loading &&
                itens.map((item) => (
                  <tr key={item.funcionarioId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-dark-text">{item.nome}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-dark-text-secondary">
                      {item.diasTrabalhados}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-dark-text-secondary">
                      {item.totalHoras.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-dark-text-secondary">
                      {item.beneficios.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-dark-text">
                      {item.totalAPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/70 transition-colors"
                      >
                        Detalhar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardRH;

