import { Router, type Request, type Response } from 'express';
import { buildOpenApiSpec } from '../swagger/buildOpenApiSpec';

const router = Router();

/** Metadados resumidos para a UI React de documentação. */
router.get('/meta', (_req: Request, res: Response) => {
  const spec = buildOpenApiSpec();
  const paths = spec.paths || {};
  const byTag: Record<string, number> = {};

  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const op of Object.values(pathItem)) {
      if (!op || typeof op !== 'object' || !('tags' in op)) continue;
      const tags = (op as { tags?: string[] }).tags;
      const tag = tags?.[0] || 'Outros';
      byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  res.json({
    success: true,
    data: {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      totalPaths: Object.keys(paths).length,
      totalOperations: Object.values(paths).reduce<number>((acc, item) => {
        if (!item || typeof item !== 'object') return acc;
        const row = item as Record<string, unknown>;
        const n = ['get', 'post', 'put', 'patch', 'delete'].filter((m) => row[m]).length;
        return acc + n;
      }, 0),
      tags: spec.tags || [],
      operationsByTag: byTag,
    },
  });
});

export default router;
