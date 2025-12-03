import React from 'react';
import { formatarUnidade } from '../utils/unitConverter';

interface UnitDisplayProps {
    quantidade: number;
    unidadeVenda?: string;
    unidadeMedida?: string;
    className?: string;
}

/**
 * Componente para exibir quantidade com unidade formatada
 * Prioriza unidadeVenda se disponível, senão usa unidadeMedida
 */
const UnitDisplay: React.FC<UnitDisplayProps> = ({
    quantidade,
    unidadeVenda,
    unidadeMedida,
    className = ''
}) => {
    // Usar unidade de venda se disponível, senão usar unidade de medida padrão
    const unidadeFinal = unidadeVenda || unidadeMedida || 'un';
    const unidadeFormatada = formatarUnidade(unidadeFinal);
    
    return (
        <span className={className}>
            {quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {unidadeFormatada}
        </span>
    );
};

export default UnitDisplay;

