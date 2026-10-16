export function nomeArquivoBackup(agora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value || '00';
  return `s3e-backup-${pegar('year')}-${pegar('month')}-${pegar('day')}_${pegar('hour')}-${pegar('minute')}.sql.gz`;
}

export function conexaoPgDump(databaseUrl: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
} {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL inválida');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, '').split('/')[0] || '');
  if (!url.hostname || !url.username || !database) {
    throw new Error('DATABASE_URL sem host, usuário ou banco');
  }
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}
