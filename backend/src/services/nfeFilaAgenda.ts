/**
 * Agenda da fila de contingência (NF-e e NFS-e) no mesmo processo da API.
 * Primeiro ciclo pouco depois do listen; depois a cada 60s.
 * Trava para não sobrepor ciclos. NFE_FILA_AUTO=false desliga.
 * NODE_ENV=test não arma timer (Jest).
 */

const INTERVALO_MS = 60_000;
const ATRASO_INICIAL_MS = 15_000;

let intervaloId: ReturnType<typeof setInterval> | null = null;
let atrasoInicialId: ReturnType<typeof setTimeout> | null = null;
let emExecucao = false;

export function filaContingenciaAutoLigada(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'test') return false;
  const valor = (env.NFE_FILA_AUTO ?? 'true').trim().toLowerCase();
  return valor !== 'false' && valor !== '0' && valor !== 'off' && valor !== 'nao' && valor !== 'não';
}

export function agendaFilaContingenciaArmada(): boolean {
  return intervaloId !== null || atrasoInicialId !== null;
}

async function processarFilasContingencia(): Promise<void> {
  try {
    const nfe = await import('../workers/nfe-fila.worker');
    await nfe.processarFilaNFe();
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    console.warn('⚠ Ciclo da fila de NF-e falhou:', msg);
  }

  try {
    const nfse = await import('../workers/nfse-fila.worker');
    await nfse.processarFilaNfse();
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    console.warn('⚠ Ciclo da fila de NFS-e falhou:', msg);
  }
}

export type OpcoesAgendaFila = {
  /** Processo separado (`npm run nfe:fila`): ignora NFE_FILA_AUTO. Em teste continua sem timer. */
  forcar?: boolean;
  intervaloMs?: number;
  atrasoInicialMs?: number;
  processar?: () => Promise<void>;
};

export function iniciarAgendaFilaNFe(opcoes: OpcoesAgendaFila = {}): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  if (!opcoes.forcar && !filaContingenciaAutoLigada()) return false;
  if (intervaloId || atrasoInicialId) return true;

  const intervaloMs = opcoes.intervaloMs ?? INTERVALO_MS;
  const atrasoInicialMs = opcoes.atrasoInicialMs ?? ATRASO_INICIAL_MS;
  const processar = opcoes.processar ?? processarFilasContingencia;

  const disparar = () => {
    if (emExecucao) return;
    emExecucao = true;
    void Promise.resolve()
      .then(() => processar())
      .catch((erro) => {
        const msg = erro instanceof Error ? erro.message : String(erro);
        console.warn('⚠ Ciclo da fila de contingência fiscal falhou:', msg);
      })
      .finally(() => {
        emExecucao = false;
      });
  };

  atrasoInicialId = setTimeout(() => {
    atrasoInicialId = null;
    disparar();
  }, atrasoInicialMs);

  intervaloId = setInterval(disparar, intervaloMs);
  return true;
}

/** Limpa o timer. O processo da API não trata SIGTERM; o script separado vive até o processo sair. */
export function pararAgendaFilaNFe(): void {
  if (atrasoInicialId) {
    clearTimeout(atrasoInicialId);
    atrasoInicialId = null;
  }
  if (intervaloId) {
    clearInterval(intervaloId);
    intervaloId = null;
  }
  emExecucao = false;
}
