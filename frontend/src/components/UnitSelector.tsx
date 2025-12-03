import React from 'react';
import { identificarTipoMaterial, getUnidadesVendaDisponiveis, TipoMaterial, suportaSelecaoUnidade } from '../utils/unitConverter';

interface UnitSelectorProps {
    materialNome: string;
    unidadeSelecionada: string;
    onUnidadeChange: (unidade: string) => void;
    className?: string;
}

/**
 * Componente para seleção de unidade de venda
 * Exibe apenas para materiais que suportam conversão (barramentos, trilhos, cabos)
 */
const UnitSelector: React.FC<UnitSelectorProps> = ({
    materialNome,
    unidadeSelecionada,
    onUnidadeChange,
    className = ''
}) => {
    // Identificar tipo de material
    const tipoMaterial = identificarTipoMaterial(materialNome);
    
    // Verificar se suporta seleção de unidade
    if (!suportaSelecaoUnidade(tipoMaterial)) {
        return null; // Não exibir para materiais padrão
    }
    
    // Obter unidades disponíveis
    const unidadesDisponiveis = getUnidadesVendaDisponiveis(tipoMaterial);
    
    // Se só tem uma opção, não precisa exibir seletor
    if (unidadesDisponiveis.length <= 1) {
        return null;
    }
    
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-xs font-medium text-gray-700">
                Unidade de Venda
            </label>
            <select
                value={unidadeSelecionada}
                onChange={(e) => onUnidadeChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
                {unidadesDisponiveis.map((unidade) => (
                    <option key={unidade.value} value={unidade.value}>
                        {unidade.label}
                    </option>
                ))}
            </select>
            <p className="text-xs text-gray-500">
                {tipoMaterial === TipoMaterial.BARRAMENTO_COBRE && (
                    <span>💡 Barramentos podem ser vendidos em metros ou centímetros</span>
                )}
                {tipoMaterial === TipoMaterial.TRILHO_DIN && (
                    <span>💡 Trilhos DIN podem ser vendidos em metros ou centímetros</span>
                )}
                {tipoMaterial === TipoMaterial.CABO && (
                    <span>💡 Cabos são sempre vendidos em metros</span>
                )}
            </p>
        </div>
    );
};

export default UnitSelector;

