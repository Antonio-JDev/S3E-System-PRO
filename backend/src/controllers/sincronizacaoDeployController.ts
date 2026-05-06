import { Request, Response } from 'express';
import { execSync } from 'child_process';
import path from 'path';

/**
 * POST /api/sistema/sincronizar
 * Executa sincronização pós-deploy (ex.: migrações do Prisma).
 * Acesso: apenas role desenvolvedor.
 */
export async function sincronizar(req: Request, res: Response) {
    try {
        // Raiz do backend: onde estão package.json e prisma/ (__dirname = .../dist/controllers)
        const rootDir = path.resolve(__dirname, '../..');
        const output: string[] = [];

        try {
            output.push('Executando: npx prisma migrate deploy');
            const result = execSync('npx prisma migrate deploy', {
                cwd: rootDir,
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024
            });
            output.push(result || '(sem saída)');
        } catch (err: any) {
            const msg = err?.stderr?.toString?.() || err?.stdout?.toString?.() || err?.message || String(err);
            output.push('Saída/erro: ' + msg);
            return res.status(500).json({
                success: false,
                message: 'Falha ao executar sincronização (migrações).',
                detalhes: output
            });
        }

        return res.json({
            success: true,
            message: 'Sincronização concluída (migrações aplicadas).',
            detalhes: output
        });
    } catch (error) {
        console.error('Erro em sincronizar:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno ao sincronizar.',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
}
