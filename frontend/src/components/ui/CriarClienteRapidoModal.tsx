import React, { useState } from 'react';

interface CriarClienteRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nome: string, tipo: 'PF' | 'PJ') => void;
  loading?: boolean;
}

const CriarClienteRapidoModal: React.FC<CriarClienteRapidoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'PF' | 'PJ'>('PF');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length >= 3) {
      onSubmit(nome.trim(), tipo);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNome('');
      setTipo('PF');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-md w-full animate-slide-in-up">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                Criar Cliente Rápido
              </h2>
              <p className="text-sm text-white/80 mt-1">
                Adicione um cliente apenas com nome e tipo
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome do Cliente */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Silva ou Empresa XYZ"
              className="input-field w-full"
              required
              minLength={3}
              autoFocus
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Mínimo de 3 caracteres
            </p>
          </div>

          {/* Tipo de Cliente */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
              Tipo de Cliente *
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                tipo === 'PF' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="PF"
                  checked={tipo === 'PF'}
                  onChange={(e) => setTipo(e.target.value as 'PF')}
                  className="w-4 h-4 text-green-600"
                  disabled={loading}
                />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Pessoa Física
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    PF
                  </div>
                </div>
              </label>

              <label className={`flex-1 flex items-center justify-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                tipo === 'PJ' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="PJ"
                  checked={tipo === 'PJ'}
                  onChange={(e) => setTipo(e.target.value as 'PJ')}
                  className="w-4 h-4 text-green-600"
                  disabled={loading}
                />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Pessoa Jurídica
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    PJ
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Cliente Rápido</p>
                <p>O cliente será criado apenas com nome e tipo. Você poderá completar os dados (CPF/CNPJ, telefone, endereço) depois na página de Clientes.</p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || nome.trim().length < 3}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Criar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CriarClienteRapidoModal;

