import React, { useState, useRef, useEffect } from 'react';

// Lista de municípios permitidos
const MUNICIPIOS = [
  'Araquari',
  'Balneario Camboriu',
  'Balneario Piçarras',
  'Barra velha',
  'Biguaçu',
  'Blumenau',
  'Bombinhas',
  'Camboriu',
  'Gaspar',
  'Gov. Celso Ramos',
  'Ilhota',
  'Indaial',
  'Itajai',
  'Itapema',
  'Itapoa',
  'Joinville',
  'Navegantes',
  'Palhoça',
  'Penha',
  'Porto Belo',
  'Tijucas',
  'São José',
  'São João do Itaperiu'
];

interface CidadeAutocompleteProps {
  value: string;
  onChange: (cidade: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

const CidadeAutocomplete: React.FC<CidadeAutocompleteProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Digite para buscar cidade...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar cidades pelo termo de busca
  const filteredCidades = MUNICIPIOS.filter(cidade =>
    cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Se não há valor selecionado, limpar o termo de busca
        if (!value) {
          setSearchTerm('');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, value]);

  // Fechar dropdown ao pressionar ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        if (!value) {
          setSearchTerm('');
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, value]);

  const handleSelect = (cidade: string) => {
    onChange(cidade);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    
    if (!isOpen && newValue.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    // Quando foca, usar o valor atual como termo de busca
    setSearchTerm(value);
    if (value.length > 0 || searchTerm.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Pequeno delay para permitir clique no dropdown
    setTimeout(() => {
      setIsOpen(false);
      // Se o valor não corresponde a uma cidade válida, manter o que foi digitado
      // mas limpar o searchTerm para próxima busca
      if (value && !MUNICIPIOS.includes(value)) {
        setSearchTerm('');
      }
    }, 200);
  };

  // Valor exibido no input
  const displayValue = isOpen ? searchTerm : value;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={`input-field w-full ${required && !value ? 'border-red-300' : ''}`}
        autoComplete="off"
      />
      
      {/* Dropdown de resultados */}
      {isOpen && filteredCidades.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredCidades.map((cidade, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(cidade)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                value === cidade ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-dark-text">
                {cidade}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm.length > 0 && filteredCidades.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg shadow-xl">
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
            Nenhuma cidade encontrada
          </div>
        </div>
      )}

      {required && !value && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          Cidade é obrigatória
        </p>
      )}
    </div>
  );
};

export default CidadeAutocomplete;
