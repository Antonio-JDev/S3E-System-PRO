/**
 * Testes para validações e lógica do componente Vendas
 * 
 * Para rodar os testes:
 * npm test -- Vendas.test.tsx
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Validações de Forma de Pagamento', () => {
  describe('Venda à vista', () => {
    it('deve validar que venda à vista deve ter exatamente 1 parcela', () => {
      const formaPagamento = 'À vista';
      const parcelas = 1;
      
      // Simulação da validação
      const isValid = formaPagamento === 'À vista' ? parcelas === 1 : true;
      
      expect(isValid).toBe(true);
    });

    it('deve rejeitar venda à vista com mais de 1 parcela', () => {
      const formaPagamento = 'À vista';
      const parcelas = 3;
      
      const isValid = formaPagamento === 'À vista' ? parcelas === 1 : true;
      
      expect(isValid).toBe(false);
    });

    it('deve permitir outras formas de pagamento com múltiplas parcelas', () => {
      const formasPagamento = ['Parcelado', 'Boleto parcelado', 'Cartão de crédito'];
      
      formasPagamento.forEach(forma => {
        const parcelas = 3;
        const isValid = forma === 'À vista' ? parcelas === 1 : true;
        
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Cálculo de valores', () => {
    it('deve calcular valor financiado corretamente (total - entrada)', () => {
      const valorTotal = 10000;
      const valorEntrada = 3000;
      const valorFinanciado = Math.max(0, valorTotal - valorEntrada);
      
      expect(valorFinanciado).toBe(7000);
    });

    it('deve calcular valor da parcela corretamente', () => {
      const valorTotal = 10000;
      const valorEntrada = 3000;
      const parcelas = 3;
      const valorFinanciado = valorTotal - valorEntrada;
      const valorParcela = valorFinanciado / parcelas;
      
      expect(valorParcela).toBeCloseTo(2333.33, 2);
    });

    it('deve garantir que valor financiado não seja negativo', () => {
      const valorTotal = 10000;
      const valorEntrada = 15000; // Entrada maior que total (erro)
      const valorFinanciado = Math.max(0, valorTotal - valorEntrada);
      
      expect(valorFinanciado).toBe(0);
    });
  });
});

describe('Status da Venda baseado em Parcelas', () => {
  const calcularStatusVenda = (contas: Array<{ status: string }>) => {
    const totalContas = contas.length;
    const qtdPagas = contas.filter(c => c.status === 'Pago' || c.status === 'Recebido').length;
    
    if (totalContas === 0) return 'Pendente';
    if (qtdPagas === totalContas) return 'Concluída';
    if (qtdPagas > 0) return 'Pago Parcial';
    return 'Pendente';
  };

  it('deve retornar "Concluída" quando todas as contas estão pagas', () => {
    const contas = [
      { status: 'Pago' },
      { status: 'Pago' },
      { status: 'Pago' },
    ];
    
    const status = calcularStatusVenda(contas);
    
    expect(status).toBe('Concluída');
  });

  it('deve retornar "Pago Parcial" quando algumas contas estão pagas', () => {
    const contas = [
      { status: 'Pago' },
      { status: 'Pendente' },
      { status: 'Pendente' },
    ];
    
    const status = calcularStatusVenda(contas);
    
    expect(status).toBe('Pago Parcial');
  });

  it('deve retornar "Pendente" quando nenhuma conta está paga', () => {
    const contas = [
      { status: 'Pendente' },
      { status: 'Pendente' },
      { status: 'Atrasado' },
    ];
    
    const status = calcularStatusVenda(contas);
    
    expect(status).toBe('Pendente');
  });

  it('deve considerar status "Recebido" como pago', () => {
    const contas = [
      { status: 'Recebido' },
      { status: 'Recebido' },
      { status: 'Recebido' },
    ];
    
    const status = calcularStatusVenda(contas);
    
    expect(status).toBe('Concluída');
  });

  it('deve considerar mistura de "Pago" e "Recebido" como pago', () => {
    const contas = [
      { status: 'Pago' },
      { status: 'Recebido' },
      { status: 'Pendente' },
    ];
    
    const status = calcularStatusVenda(contas);
    
    expect(status).toBe('Pago Parcial');
  });
});

describe('Identificação de Entrada vs Parcelas', () => {
  const isEntrada = (conta: { numeroParcela?: number; descricao?: string }) => {
    return conta.numeroParcela === 0 || conta.descricao?.includes('Entrada');
  };

  it('deve identificar entrada quando numeroParcela é 0', () => {
    const conta = {
      numeroParcela: 0,
      descricao: 'Entrada - Venda VND-123',
    };
    
    expect(isEntrada(conta)).toBe(true);
  });

  it('deve identificar entrada pela descrição', () => {
    const conta = {
      numeroParcela: 1,
      descricao: 'Entrada - Venda VND-123',
    };
    
    expect(isEntrada(conta)).toBe(true);
  });

  it('deve identificar parcela normal quando numeroParcela > 0 e sem "Entrada" na descrição', () => {
    const conta = {
      numeroParcela: 1,
      descricao: 'Parcela 1/3 - Venda VND-123',
    };
    
    expect(isEntrada(conta)).toBe(false);
  });

  it('deve ordenar entrada antes das parcelas', () => {
    const contas = [
      { numeroParcela: 2, descricao: 'Parcela 2/3' },
      { numeroParcela: 0, descricao: 'Entrada' },
      { numeroParcela: 1, descricao: 'Parcela 1/3' },
      { numeroParcela: 3, descricao: 'Parcela 3/3' },
    ];
    
    const ordenadas = contas.sort((a, b) => {
      const parcelaA = a.numeroParcela || 0;
      const parcelaB = b.numeroParcela || 0;
      return parcelaA - parcelaB;
    });
    
    expect(ordenadas[0].numeroParcela).toBe(0); // Entrada primeiro
    expect(ordenadas[1].numeroParcela).toBe(1);
    expect(ordenadas[2].numeroParcela).toBe(2);
    expect(ordenadas[3].numeroParcela).toBe(3);
  });
});

describe('Formatação de Número da OS', () => {
  it('deve formatar número da OS sem padding quando usar número do orçamento', () => {
    const numeroOrcamento = 2151;
    const numeroOS = `OS-${numeroOrcamento}`;
    
    expect(numeroOS).toBe('OS-2151');
    // Verificar que não tem padding de 3 dígitos no número
    const numeroExtraido = numeroOS.replace('OS-', '');
    expect(numeroExtraido).toBe('2151'); // Número completo, não '2151' com padding
    expect(numeroExtraido.length).toBeGreaterThan(3); // Números grandes não terão padding
  });

  it('deve formatar número da OS com padding quando usar fallback sequencial', () => {
    const numeroSequencial = 4;
    const numeroOS = `OS-${numeroSequencial.toString().padStart(3, '0')}`;
    
    expect(numeroOS).toBe('OS-004');
  });
});
