import type { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './buildOpenApiSpec';

export function registerApiDocumentation(app: Express): void {
  const spec = buildOpenApiSpec();

  app.get('/api/docs/openapi.json', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(buildOpenApiSpec());
  });

  app.use(
    '/api/docs/swagger',
    (_req, res, next) => {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'S3E System — Swagger UI',
      customCss: `
        .swagger-ui .topbar { background-color: #0a1a2f; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  app.get('/api/docs', (_req: Request, res: Response) => {
    res.redirect(302, '/api/docs/swagger');
  });
}
