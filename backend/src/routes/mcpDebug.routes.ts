import { Router } from 'express';
import { autenticarChaveMcp, tratarRequisicaoMcp } from '../mcp/mcpDebug.http';

const router = Router();

router.use(autenticarChaveMcp, tratarRequisicaoMcp);

export default router;
