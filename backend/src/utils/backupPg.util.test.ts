import { conexaoPgDump, nomeArquivoBackup } from './backupPg.util';

describe('backup do banco', () => {
  it('monta o nome com data de Brasília', () => {
    const nome = nomeArquivoBackup(new Date('2026-10-13T06:07:00.000Z'));
    expect(nome).toBe('s3e-backup-2026-10-13_03-07.sql.gz');
  });

  it('lê host, usuário e banco da DATABASE_URL', () => {
    const pg = conexaoPgDump('postgresql://s3e_dev:segredo%40x@postgres:5432/s3e_dev?schema=public');
    expect(pg).toEqual({
      host: 'postgres',
      port: '5432',
      user: 's3e_dev',
      password: 'segredo@x',
      database: 's3e_dev',
    });
  });

  it('recusa uma URL inválida', () => {
    expect(() => conexaoPgDump('nao-e-url')).toThrow('DATABASE_URL inválida');
  });
});
