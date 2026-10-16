import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import { google } from 'googleapis';
import { conexaoPgDump, nomeArquivoBackup } from '../utils/backupPg.util';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export type BackupResult = {
  fileId: string;
  name: string;
};

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

let backupEmAndamento: Promise<BackupResult> | null = null;

function caminhoChaveDrive(): string {
  const configurado = process.env.GOOGLE_DRIVE_KEY_PATH?.trim();
  if (!configurado) {
    throw new BackupError('Defina GOOGLE_DRIVE_KEY_PATH com o JSON da Service Account');
  }
  if (!fs.existsSync(configurado)) {
    throw new BackupError('Arquivo da chave do Google Drive não encontrado');
  }
  return configurado;
}

function pastaDrive(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!id) {
    throw new BackupError('Defina GOOGLE_DRIVE_FOLDER_ID com o ID da pasta no Drive');
  }
  return id;
}

function gerarDump(destino: string, databaseUrl: string): Promise<void> {
  let pg: ReturnType<typeof conexaoPgDump>;
  try {
    pg = conexaoPgDump(databaseUrl);
  } catch (error) {
    throw new BackupError(error instanceof Error ? error.message : 'DATABASE_URL inválida');
  }
  return new Promise((resolve, reject) => {
    const dump = spawn(
      'pg_dump',
      ['--no-owner', '--no-acl', '-h', pg.host, '-p', pg.port, '-U', pg.user, '-d', pg.database],
      {
        env: { ...process.env, PGPASSWORD: pg.password },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    const gzip = zlib.createGzip();
    const out = fs.createWriteStream(destino);
    let stderr = '';
    let codigo: number | null = null;
    let terminouArquivo = false;
    let encerrado = false;
    const falhar = (erro: Error) => {
      if (encerrado) return;
      encerrado = true;
      dump.kill();
      reject(erro);
    };
    const concluir = () => {
      if (encerrado || codigo === null || !terminouArquivo) return;
      encerrado = true;
      if (codigo !== 0) {
        const texto = (stderr || `pg_dump encerrou com código ${codigo}`).replace(/password=\S+/gi, 'password=***').trim();
        reject(new BackupError(texto));
        return;
      }
      resolve();
    };
    dump.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    dump.stdout.pipe(gzip).pipe(out);
    dump.on('error', (erro) => {
      falhar(new BackupError(erro.message.includes('ENOENT') ? 'pg_dump não está instalado no servidor' : erro.message));
    });
    gzip.on('error', falhar);
    out.on('error', falhar);
    out.on('finish', () => {
      terminouArquivo = true;
      concluir();
    });
    dump.on('close', (code) => {
      codigo = code ?? 1;
      if (codigo !== 0) {
        const texto = (stderr || `pg_dump encerrou com código ${codigo}`).replace(/password=\S+/gi, 'password=***').trim();
        falhar(new BackupError(texto));
        return;
      }
      concluir();
    });
  });
}

async function enviarParaDrive(arquivo: string, nome: string): Promise<BackupResult> {
  const auth = new google.auth.GoogleAuth({
    keyFile: caminhoChaveDrive(),
    scopes: [DRIVE_SCOPE],
  });
  const drive = google.drive({ version: 'v3', auth });
  const criado = await drive.files.create({
    requestBody: {
      name: nome,
      parents: [pastaDrive()],
    },
    media: {
      mimeType: 'application/gzip',
      body: fs.createReadStream(arquivo),
    },
    fields: 'id, name',
    supportsAllDrives: true,
  });
  const fileId = criado.data.id;
  if (!fileId) {
    throw new BackupError('O Google Drive não devolveu o ID do arquivo');
  }
  return { fileId, name: criado.data.name || nome };
}

async function executarBackupInterno(): Promise<BackupResult> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new BackupError('DATABASE_URL não configurada');
  }
  caminhoChaveDrive();
  pastaDrive();

  const nome = nomeArquivoBackup();
  const destino = path.join(os.tmpdir(), nome);
  try {
    await gerarDump(destino, databaseUrl);
    return await enviarParaDrive(destino, nome);
  } finally {
    await fs.promises.unlink(destino).catch(() => undefined);
  }
}

export async function executarBackupBanco(): Promise<BackupResult> {
  if (backupEmAndamento) {
    throw new BackupError('Já existe um backup em andamento');
  }
  backupEmAndamento = executarBackupInterno().finally(() => {
    backupEmAndamento = null;
  });
  return backupEmAndamento;
}

export function backupHabilitadoNaAgenda(): boolean {
  return process.env.BACKUP_ENABLED?.trim().toLowerCase() === 'true';
}

export function horaAgendaBackup(): number {
  const bruto = Number(process.env.BACKUP_HOUR ?? '3');
  if (!Number.isInteger(bruto) || bruto < 0 || bruto > 23) return 3;
  return bruto;
}

export function relogioSaoPaulo(agora = new Date()): { dia: string; hora: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(agora);
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value || '';
  return {
    dia: `${pegar('year')}-${pegar('month')}-${pegar('day')}`,
    hora: Number(pegar('hour')),
  };
}
