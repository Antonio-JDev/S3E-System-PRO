import { backupHabilitadoNaAgenda, executarBackupBanco, horaAgendaBackup, relogioSaoPaulo } from './backup.service';

let ultimoDiaExecutado = '';

/** Roda no máximo uma vez por dia, na hora BACKUP_HOUR (America/Sao_Paulo), se BACKUP_ENABLED=true. */
export async function verificarAgendaBackup(agora = new Date()): Promise<void> {
  if (!backupHabilitadoNaAgenda()) return;
  const relogio = relogioSaoPaulo(agora);
  if (relogio.hora !== horaAgendaBackup()) return;
  if (ultimoDiaExecutado === relogio.dia) return;
  ultimoDiaExecutado = relogio.dia;
  try {
    const resultado = await executarBackupBanco();
    console.log(`✅ Backup diário enviado ao Drive: ${resultado.name} (${resultado.fileId})`);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    if (!mensagem.includes('em andamento')) ultimoDiaExecutado = '';
    console.warn('⚠ Backup diário falhou:', mensagem);
  }
}
