import { useEffect } from 'react';

/**
 * Hook customizado para fechar modais ao pressionar S
 * @param isOpen - Estado que indica se o modal está aberto
 * @param onClose - Função para fechar o modal
 * @param enabled - Se o hook está habilitado (padrão: true)
 */
export function useSKey(
  isOpen: boolean,
  onClose: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !isOpen) return;

    const handleSKey = (event: KeyboardEvent) => {
      // Verificar se a tecla pressionada é 'S' ou 's' e se não está em um input/textarea
      if ((event.key === 'S' || event.key === 's') && 
          !(event.target instanceof HTMLInputElement) && 
          !(event.target instanceof HTMLTextAreaElement) &&
          !(event.target instanceof HTMLSelectElement)) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    // Adicionar listener quando o modal está aberto
    window.addEventListener('keydown', handleSKey);

    // Remover listener quando o modal fecha ou o componente desmonta
    return () => {
      window.removeEventListener('keydown', handleSKey);
    };
  }, [isOpen, onClose, enabled]);
}

