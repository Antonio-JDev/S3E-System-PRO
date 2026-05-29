import { describe, expect, it } from 'vitest';
import { filterClientesByTerm } from './whatsappActionsDrawer.util';
import type { Cliente } from '../services/clientesService';

const base: Cliente[] = [
  {
    id: '1',
    nome: 'Jorge Almeida',
    cpfCnpj: '23145245642',
    email: 'jorge@exemplo.com',
    telefone: '+55 63 9949-4139',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: 'PF',
    ativo: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: '2',
    nome: 'Maria Souza',
    cpfCnpj: '99988877766',
    email: '',
    telefone: '11988887777',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: 'PF',
    ativo: true,
    createdAt: '',
    updatedAt: '',
  },
];

describe('filterClientesByTerm — busca do painel Ações WhatsApp', () => {
  it('filtra por nome', () => {
    expect(filterClientesByTerm(base, 'jorge')).toHaveLength(1);
    expect(filterClientesByTerm(base, 'jorge')[0].nome).toContain('Jorge');
  });

  it('filtra por CPF/CNPJ', () => {
    expect(filterClientesByTerm(base, '231452')).toHaveLength(1);
  });

  it('filtra por dígitos do telefone', () => {
    expect(filterClientesByTerm(base, '6399494139')).toHaveLength(1);
  });

  it('retorna lista inteira sem termo', () => {
    expect(filterClientesByTerm(base, '')).toHaveLength(2);
  });

  it('retorna vazio quando nada corresponde', () => {
    expect(filterClientesByTerm(base, 'zzzz-inexistente')).toHaveLength(0);
  });
});
