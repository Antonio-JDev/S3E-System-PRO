import React, { useState, useRef, useEffect } from 'react';

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
}

interface ClienteComboboxProps {
  clientes: Cliente[];
  value: string;
  onChange: (clienteId: string) => void;
  onCreateNew: () => void;
  className?: string;
  required?: boolean;
}

const ClienteCombobox: React.FC<ClienteComboboxProps> = ({
  clientes,
  value,
  onChange,
  onCreateNew,
  className = '',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cliente selecionado
  const selectedCliente = clientes.find(c => c.id === value);

  // Filtrar clientes por nome ou CPF/CNPJ
  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpfCnpj.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10); // Máximo 10 resultados visíveis

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fechar dropdown ao pressionar ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (clienteId: string) => {
    onChange(clienteId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const displayValue = selectedCliente 
    ? `${selectedCliente.nome} - ${selectedCliente.cpfCnpj}` 
    : '';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="Digite para buscar cliente..."
            className={`input-field w-full ${required && !value ? 'border-red-300' : ''}`}
            autoComplete="off"
          />
          
          {/* Dropdown de resultados */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredClientes.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Nenhum cliente encontrado
                </div>
              ) : (
                filteredClientes.map(cliente => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => handleSelect(cliente.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      value === cliente.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {cliente.nome}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {cliente.cpfCnpj}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Botão Criar Cliente Rápido */}
        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-2 shadow-md"
          title="Criar cliente rápido"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Cliente Rápido
        </button>
      </div>

      {required && !value && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Cliente é obrigatório
        </p>
      )}
    </div>
  );
};

export default ClienteCombobox;

