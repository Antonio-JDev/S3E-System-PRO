import React, { useState, useRef, useEffect } from 'react';

interface Fornecedor {
  id: string;
  nome: string;
}

interface SupplierComboboxProps {
  value: string;
  onChange: (value: string, supplierId: string) => void;
  fornecedores: Fornecedor[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

const SupplierCombobox: React.FC<SupplierComboboxProps> = ({
  value,
  onChange,
  fornecedores,
  loading = false,
  placeholder = 'Selecione ou digite o nome do fornecedor',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar fornecedores baseado no termo de busca
  const filteredFornecedores = fornecedores.filter(fornecedor =>
    fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Verificar se o valor atual corresponde a um fornecedor existente
  const fornecedorSelecionado = fornecedores.find(
    f => f.nome.toLowerCase() === value.toLowerCase()
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sincronizar searchTerm com value quando value muda externamente
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Verificar se corresponde a um fornecedor existente
    const fornecedorEncontrado = fornecedores.find(
      f => f.nome.toLowerCase() === newValue.toLowerCase()
    );

    onChange(newValue, fornecedorEncontrado?.id || '');
  };

  const handleSelectFornecedor = (fornecedor: Fornecedor) => {
    setSearchTerm(fornecedor.nome);
    onChange(fornecedor.nome, fornecedor.id);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredFornecedores.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectFornecedor(filteredFornecedores[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleInputBlur = () => {
    // Delay para permitir clique no item do dropdown
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input-field pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 dark:border-teal-400"></div>
          ) : (
            <svg
              className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && searchTerm && filteredFornecedores.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredFornecedores.map((fornecedor, index) => (
            <button
              key={fornecedor.id}
              type="button"
              onClick={() => handleSelectFornecedor(fornecedor)}
              className={`w-full text-left px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors ${
                index === highlightedIndex ? 'bg-teal-50 dark:bg-teal-900/30' : ''
              } ${
                fornecedorSelecionado?.id === fornecedor.id
                  ? 'bg-teal-100 dark:bg-teal-900/50 font-semibold'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-dark-text">{fornecedor.nome}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Indicador de status */}
      {value && (
        <div className="mt-1.5">
          {fornecedorSelecionado ? (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Fornecedor existente será vinculado
            </p>
          ) : (
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Novo fornecedor (será apenas nome, sem vínculo)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SupplierCombobox;

