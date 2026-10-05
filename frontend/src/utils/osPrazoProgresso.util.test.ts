import { describe, expect, it } from 'vitest';
import {
  PRAZO_LIMITE_AMARELO,
  calcularLeituraOrcadoRealizado,
  calcularPrazoProgresso,
  contarColaboradoresDistintos,
  montarResumoProdutividadeOs,
} from './osPrazoProgresso.util';

describe('osPrazoProgresso.util', () => {
  const inicio = new Date('2026-01-01T12:00:00');

  it('retorna sem estimativa quando não há diárias nem dataPrevisao', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      agora: new Date('2026-01-05T12:00:00'),
    });
    expect(r.temEstimativa).toBe(false);
    expect(r.nivel).toBe('sem_estimativa');
    expect(r.badge).toBe('Sem estimativa');
    expect(r.percentual).toBe(0);
    expect(r.cor).toBe('neutral');
  });

  it('ignora diárias orçadas e fica sem estimativa sem data final', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      diariasOrcadas: 10,
      diariasRealizadas: 12,
      status: 'EXECUCAO',
      agora: new Date('2026-01-15T12:00:00'),
    });
    expect(r.temEstimativa).toBe(false);
    expect(r.eixo).toBe('nenhum');
    expect(r.estourou).toBe(false);
  });

  it('fica amarelo abaixo de 80% da janela do cronograma', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      dataPrevisao: new Date('2026-01-11T12:00:00'),
      diariasOrcadas: 2,
      diariasRealizadas: 2,
      agora: new Date('2026-01-05T12:00:00'),
    });
    expect(r.eixo).toBe('dias_calendario');
    expect(r.percentualRaw).toBe(40);
    expect(r.nivel).toBe('no_prazo');
    expect(r.cor).toBe('yellow');
    expect(r.percentualRaw).toBeLessThan(PRAZO_LIMITE_AMARELO);
    expect(r.estourou).toBe(false);
  });

  it('fica laranja entre 80% e 100% da janela', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      dataPrevisao: new Date('2026-01-11T12:00:00'),
      agora: new Date('2026-01-09T12:00:00'),
    });
    expect(r.percentualRaw).toBe(80);
    expect(r.nivel).toBe('em_risco');
    expect(r.cor).toBe('orange');
    expect(r.badge).toBe('Em risco');
  });

  it('usa janela dataInicio→dataPrevisao quando não há diárias orçadas', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      dataPrevisao: new Date('2026-01-11T12:00:00'), // 10 dias
      agora: new Date('2026-01-06T12:00:00'), // 5 dias corridos
    });
    expect(r.eixo).toBe('dias_calendario');
    expect(r.labelNumeros).toBe('5 / 10 dias');
    expect(r.percentualRaw).toBe(50);
    expect(r.cor).toBe('yellow');
  });

  it('marca estouro por calendário quando dias corridos passam da previsão', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      dataPrevisao: new Date('2026-01-06T12:00:00'), // 5 dias
      agora: new Date('2026-01-10T12:00:00'), // 9 dias
    });
    expect(r.estourou).toBe(true);
    expect(r.motivoEstouro).toBe('calendario');
    expect(r.cor).toBe('red');
  });

  it('usa dataConclusao como referência final quando concluída', () => {
    const r = calcularPrazoProgresso({
      dataInicio: inicio,
      dataPrevisao: new Date('2026-01-11T12:00:00'),
      dataConclusao: new Date('2026-01-04T12:00:00'),
      status: 'CONCLUIDO',
      agora: new Date('2026-02-01T12:00:00'), // ignorado
    });
    expect(r.consumido).toBe(3);
    expect(r.percentualRaw).toBe(30);
    expect(r.cor).toBe('yellow');
  });

  it('conta colaboradores distintos do calendário', () => {
    expect(contarColaboradoresDistintos(null)).toBeNull();
    expect(
      contarColaboradoresDistintos({
        calendarioLinhas: [
          {
            eventoId: '1',
            data: '2026-01-01',
            funcionarioId: 'a',
            funcionarioNome: 'Ana',
            cargo: 'Tec',
            horasJornada: 8,
            horasExtras: 0,
            totalHoras: 8,
            modoCusto: 'DIARIA',
            valorUnitario: 100,
            custoDia: 100,
            status: 'CONFIRMADO',
          },
          {
            eventoId: '2',
            data: '2026-01-02',
            funcionarioId: 'a',
            funcionarioNome: 'Ana',
            cargo: 'Tec',
            horasJornada: 8,
            horasExtras: 0,
            totalHoras: 8,
            modoCusto: 'DIARIA',
            valorUnitario: 100,
            custoDia: 100,
            status: 'CONFIRMADO',
          },
          {
            eventoId: '3',
            data: '2026-01-02',
            funcionarioId: 'b',
            funcionarioNome: 'Bruno',
            cargo: 'Tec',
            horasJornada: 8,
            horasExtras: 0,
            totalHoras: 8,
            modoCusto: 'DIARIA',
            valorUnitario: 100,
            custoDia: 100,
            status: 'CONFIRMADO',
          },
        ],
      })
    ).toBe(2);
  });

  it('no bloco de prazo compara apontado com orçado e ignora dia corrido', () => {
    const r = calcularLeituraOrcadoRealizado({
      horasOrcadas: 2,
      horasRealizadas: 0,
      diariasOrcadas: 2,
      diariasRealizadas: 1,
    });
    expect(r.estourou).toBe(false);
    expect(r.horas.percentualRaw).toBe(0);
    expect(r.diarias.percentualRaw).toBe(50);
    expect(r.diarias.realizado).toBe(1);
    expect(r.diarias.orcado).toBe(2);
    expect(r.nivel).toBe('no_prazo');
    expect(r.badge).toBe('No prazo');
  });

  it('estoura o prazo estimado quando o apontado passa do orçado', () => {
    const r = calcularLeituraOrcadoRealizado({
      horasOrcadas: 2,
      horasRealizadas: 3,
      diariasOrcadas: 2,
      diariasRealizadas: 1,
    });
    expect(r.horas.estourou).toBe(true);
    expect(r.diarias.estourou).toBe(false);
    expect(r.estourou).toBe(true);
    expect(r.cor).toBe('red');
    expect(r.badge).toBe('Estouro');
  });

  it('monta resumo de produtividade com rendimento custo/homem-hora', () => {
    const prod = montarResumoProdutividadeOs({
      dataInicio: inicio,
      dataConclusao: new Date('2026-01-06T12:00:00'),
      status: 'CONCLUIDO',
      resumo: {
        horasEngenhariaOrcadas: 20,
        diariasEquipeOrcadas: 5,
        horasEngenhariaRealizadas: 10,
        diariasEquipeRealizadas: 4,
        homemHoraOrcado: 60,
        homemHoraRealizado: 42, // 10 + 4*8
        custoOrcado: 5000,
        custoRealizado: 4200,
        valorFechado: 10000,
        resultado: 5800,
        estouroHorasEngenharia: false,
        estouroDiariasEquipe: false,
      },
    });
    expect(prod.duracaoDias).toBe(5);
    expect(prod.horasRealizadas).toBe(10);
    expect(prod.diariasRealizadas).toBe(4);
    expect(prod.custoRealizado).toBe(4200);
    expect(prod.rendimentoLabel).toBe('Custo / homem-hora');
    expect(prod.rendimentoValor).toBe(100); // 4200/42
  });
});
