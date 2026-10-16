import {
  agendaFilaContingenciaArmada,
  iniciarAgendaFilaNFe,
  pararAgendaFilaNFe,
} from './nfeFilaAgenda';

describe('agenda da fila de contingência', () => {
  const envOriginal = {
    NODE_ENV: process.env.NODE_ENV,
    NFE_FILA_AUTO: process.env.NFE_FILA_AUTO,
  };

  afterEach(() => {
    pararAgendaFilaNFe();
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (envOriginal.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = envOriginal.NODE_ENV;
    if (envOriginal.NFE_FILA_AUTO === undefined) delete process.env.NFE_FILA_AUTO;
    else process.env.NFE_FILA_AUTO = envOriginal.NFE_FILA_AUTO;
  });

  it('não sobrepõe execução', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NFE_FILA_AUTO = 'true';
    jest.useFakeTimers();

    let liberar: () => void = () => {};
    const processar = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          liberar = resolve;
        })
    );

    expect(
      iniciarAgendaFilaNFe({ processar, atrasoInicialMs: 1_000, intervaloMs: 1_000 })
    ).toBe(true);

    await jest.advanceTimersByTimeAsync(1_000);
    expect(processar).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1_000);
    expect(processar).toHaveBeenCalledTimes(1);

    liberar();
    await Promise.resolve();
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(1_000);
    expect(processar).toHaveBeenCalledTimes(2);
  });

  it('não arma timer quando NFE_FILA_AUTO=false', () => {
    process.env.NODE_ENV = 'development';
    process.env.NFE_FILA_AUTO = 'false';
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    expect(iniciarAgendaFilaNFe({ processar: async () => {} })).toBe(false);
    expect(agendaFilaContingenciaArmada()).toBe(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('não arma timer em ambiente de teste', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.NFE_FILA_AUTO;
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    expect(iniciarAgendaFilaNFe({ forcar: true, processar: async () => {} })).toBe(false);
    expect(agendaFilaContingenciaArmada()).toBe(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });
});
