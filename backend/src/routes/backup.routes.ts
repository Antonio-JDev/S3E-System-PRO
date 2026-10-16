import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth';
import { BackupError, executarBackupBanco } from '../services/backup.service';

const router = Router();

router.post('/executar', authenticate, authorize('admin', 'desenvolvedor'), async (req: AuthRequest, res: Response) => {
  try {
    const resultado = await executarBackupBanco();
    console.log(`✅ Backup enviado ao Drive por ${req.user?.userId || 'desconhecido'}: ${resultado.name} (${resultado.fileId})`);
    res.json({ success: true, fileId: resultado.fileId, name: resultado.name });
  } catch (error) {
    const mensagem = error instanceof BackupError ? error.message : 'Falha ao gerar o backup';
    const status = mensagem.includes('em andamento') ? 409 : 500;
    if (!(error instanceof BackupError)) {
      console.error('Backup do banco falhou:', error instanceof Error ? error.message : error);
    }
    res.status(status).json({ success: false, error: mensagem });
  }
});

export default router;
