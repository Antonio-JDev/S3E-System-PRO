/**
 * Testes para o componente ProjetosModerno
 * Especificamente para a função gerarNumeroOS
 * 
 * Para rodar os testes:
 * npm test -- ProjetosModerno.test.tsx
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Projeto } from '../../services/projetosService';
import type { Orcamento } from '../../services/orcamentosService';

// Função isolada para testar (extraída da lógica do componente)
function gerarNumeroOS(
  projeto: Projeto,
  orcamentos: Orcamento[] = [],
  projetos: Projeto[] = []
): string {
  // Prioridade: usar numeroSequencial do orçamento vinculado
  if (projeto.orcamento?.numeroSequencial) {
    return `OS-${projeto.orcamento.numeroSequencial}`;
  }
  
  // Fallback: se não tiver orçamento vinculado, tentar buscar no array de orçamentos
  if (projeto.orcamentoId && orcamentos.length > 0) {
    const orcamentoVinculado = orcamentos.find(o => o.id === projeto.orcamentoId);
    if (orcamentoVinculado?.numeroSequencial) {
      return `OS-${orcamentoVinculado.numeroSequencial}`;
    }
  }
  
  // Último fallback: usar índice (para projetos antigos sem orçamento)
  const projetosOrdenados = [...projetos].sort((a, b) => {
    const dataA = new Date(a.createdAt || a.dataInicio || 0).getTime();
    const dataB = new Date(b.createdAt || b.dataInicio || 0).getTime();
    return dataA - dataB;
  });
  
  const index = projetosOrdenados.findIndex(p => p.id === projeto.id);
  const numero = index >= 0 ? index + 1 : projetosOrdenados.length + 1;
  const numeroValido = isNaN(numero) ? 1 : numero;
  
  return `OS-${numeroValido.toString().padStart(3, '0')}`;
}

describe('gerarNumeroOS', () => {
  let projetoComOrcamento: Projeto;
  let projetoSemOrcamento: Projeto;
  let orcamentos: Orcamento[];

  beforeEach(() => {
    orcamentos = [
      {
        id: 'orc-1',
        numeroSequencial: 2151,
        clienteId: 'cliente-1',
        titulo: 'Orçamento Teste',
        validade: new Date(),
        status: 'Aprovado',
        bdi: 0,
        custoTotal: 0,
        precoVenda: 10000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'orc-2',
        numeroSequencial: 2150,
        clienteId: 'cliente-2',
        titulo: 'Orçamento Teste 2',
        validade: new Date(),
        status: 'Aprovado',
        bdi: 0,
        custoTotal: 0,
        precoVenda: 5000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    projetoComOrcamento = {
      id: 'proj-1',
      titulo: 'Projeto Teste',
      descricao: 'Descrição',
      status: 'APROVADO',
      tipo: 'Instalacao',
      clienteId: 'cliente-1',
      responsavelId: 'user-1',
      dataInicio: new Date().toISOString(),
      dataPrevisao: new Date().toISOString(),
      orcamentoId: 'orc-1',
      valorTotal: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orcamento: {
        id: 'orc-1',
        titulo: 'Orçamento Teste',
        precoVenda: 10000,
        numeroSequencial: 2151,
      },
    };

    projetoSemOrcamento = {
      id: 'proj-2',
      titulo: 'Projeto Sem Orçamento',
      descricao: 'Descrição',
      status: 'APROVADO',
      tipo: 'Instalacao',
      clienteId: 'cliente-2',
      responsavelId: 'user-1',
      dataInicio: new Date().toISOString(),
      dataPrevisao: new Date().toISOString(),
      valorTotal: 5000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  describe('Quando projeto tem orçamento vinculado com numeroSequencial', () => {
    it('deve retornar OS-{numeroOrcamento}', () => {
      const numeroOS = gerarNumeroOS(projetoComOrcamento, orcamentos);
      
      expect(numeroOS).toBe('OS-2151');
    });

    it('deve funcionar com diferentes números de orçamento', () => {
      const projetoComOrcamento2150 = {
        ...projetoComOrcamento,
        orcamento: {
          ...projetoComOrcamento.orcamento!,
          numeroSequencial: 2150,
        },
      };
      
      const numeroOS = gerarNumeroOS(projetoComOrcamento2150, orcamentos);
      
      expect(numeroOS).toBe('OS-2150');
    });

    it('deve funcionar com números grandes de orçamento', () => {
      const projetoComOrcamento9999 = {
        ...projetoComOrcamento,
        orcamento: {
          ...projetoComOrcamento.orcamento!,
          numeroSequencial: 9999,
        },
      };
      
      const numeroOS = gerarNumeroOS(projetoComOrcamento9999, orcamentos);
      
      expect(numeroOS).toBe('OS-9999');
    });
  });

  describe('Quando projeto tem orcamentoId mas não tem objeto orcamento', () => {
    it('deve buscar no array de orçamentos e usar numeroSequencial', () => {
      const projetoComOrcamentoId = {
        ...projetoSemOrcamento,
        orcamentoId: 'orc-1',
      };
      
      const numeroOS = gerarNumeroOS(projetoComOrcamentoId, orcamentos);
      
      expect(numeroOS).toBe('OS-2151');
    });

    it('deve funcionar com orcamentoId diferente', () => {
      const projetoComOrcamentoId = {
        ...projetoSemOrcamento,
        orcamentoId: 'orc-2',
      };
      
      const numeroOS = gerarNumeroOS(projetoComOrcamentoId, orcamentos);
      
      expect(numeroOS).toBe('OS-2150');
    });
  });

  describe('Quando projeto não tem orçamento vinculado (fallback)', () => {
    it('deve usar índice sequencial com padding de 3 dígitos', () => {
      const projetos = [
        { ...projetoSemOrcamento, id: 'proj-1', createdAt: '2025-01-01T00:00:00Z' },
        { ...projetoSemOrcamento, id: 'proj-2', createdAt: '2025-01-02T00:00:00Z' },
        { ...projetoSemOrcamento, id: 'proj-3', createdAt: '2025-01-03T00:00:00Z' },
      ];
      
      const numeroOS1 = gerarNumeroOS(projetos[0], [], projetos);
      const numeroOS2 = gerarNumeroOS(projetos[1], [], projetos);
      const numeroOS3 = gerarNumeroOS(projetos[2], [], projetos);
      
      expect(numeroOS1).toBe('OS-001');
      expect(numeroOS2).toBe('OS-002');
      expect(numeroOS3).toBe('OS-003');
    });

    it('deve ordenar projetos por data de criação antes de calcular índice', () => {
      const projetos = [
        { ...projetoSemOrcamento, id: 'proj-3', createdAt: '2025-01-03T00:00:00Z' },
        { ...projetoSemOrcamento, id: 'proj-1', createdAt: '2025-01-01T00:00:00Z' },
        { ...projetoSemOrcamento, id: 'proj-2', createdAt: '2025-01-02T00:00:00Z' },
      ];
      
      const numeroOS1 = gerarNumeroOS(projetos[1], [], projetos); // Mais antigo
      const numeroOS2 = gerarNumeroOS(projetos[2], [], projetos);
      const numeroOS3 = gerarNumeroOS(projetos[0], [], projetos); // Mais recente
      
      expect(numeroOS1).toBe('OS-001');
      expect(numeroOS2).toBe('OS-002');
      expect(numeroOS3).toBe('OS-003');
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com projeto sem orcamentoId e sem array de orçamentos', () => {
      const projetos = [projetoSemOrcamento];
      const numeroOS = gerarNumeroOS(projetoSemOrcamento, [], projetos);
      
      expect(numeroOS).toMatch(/^OS-\d{3}$/); // Formato OS-XXX
    });

    it('deve lidar com orcamentoId que não existe no array', () => {
      const projetoComOrcamentoIdInexistente = {
        ...projetoSemOrcamento,
        orcamentoId: 'orc-inexistente',
      };
      
      const projetos = [projetoComOrcamentoIdInexistente];
      const numeroOS = gerarNumeroOS(projetoComOrcamentoIdInexistente, orcamentos, projetos);
      
      // Deve usar fallback
      expect(numeroOS).toMatch(/^OS-\d{3}$/);
    });

    it('deve priorizar orcamento do objeto sobre orcamentoId', () => {
      const projetoComAmbos = {
        ...projetoComOrcamento,
        orcamentoId: 'orc-2', // ID diferente, mas objeto tem numeroSequencial 2151
      };
      
      const numeroOS = gerarNumeroOS(projetoComAmbos, orcamentos);
      
      // Deve usar numeroSequencial do objeto orcamento (2151), não do orc-2 (2150)
      expect(numeroOS).toBe('OS-2151');
    });
  });
});
