import type { Cliente } from '../services/clientesService';

/** Filtro local imediato na lista de clientes do painel de ações (complementa busca no servidor). */
export function filterClientesByTerm(list: Cliente[], term: string): Cliente[] {
  const q = term.trim().toLowerCase();
  if (!q) return list;
  const digits = q.replace(/\D/g, '');
  return list.filter((c) => {
    const nome = (c.nome || '').toLowerCase();
    const doc = (c.cpfCnpj || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const tel = (c.telefone || '').toLowerCase();
    const telDigits = (c.telefone || '').replace(/\D/g, '');
    if (nome.includes(q) || doc.includes(q) || email.includes(q) || tel.includes(q)) return true;
    if (digits.length >= 3 && telDigits.includes(digits)) return true;
    return false;
  });
}
