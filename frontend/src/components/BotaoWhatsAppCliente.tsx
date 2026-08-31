import React from 'react';
import { abrirChatWhatsappCliente } from '../utils/abrirChatWhatsappCliente';

interface BotaoWhatsAppClienteProps {
  telefone?: string | null;
  nome?: string | null;
  onNavigate?: (view: string, ...args: unknown[]) => void;
  className?: string;
}

const BotaoWhatsAppCliente: React.FC<BotaoWhatsAppClienteProps> = ({
  telefone,
  nome,
  onNavigate,
  className,
}) => (
  <button
    type="button"
    onClick={() => void abrirChatWhatsappCliente({ telefone, nome, onNavigate })}
    className={
      className ||
      'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold'
    }
  >
    Chamar no WhatsApp
  </button>
);

export default BotaoWhatsAppCliente;
