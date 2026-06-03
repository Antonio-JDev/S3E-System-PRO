/**
 * Gera `dist/openapi.generated.json` após o build (Docker/produção).
 * Uso: OPENAPI_SKIP_ARTIFACT=1 node dist/swagger/writeOpenApiArtifact.js
 */
import fs from 'fs';
import path from 'path';
import { buildOpenApiSpec, clearOpenApiCache } from './buildOpenApiSpec';

process.env.OPENAPI_SKIP_ARTIFACT = '1';
clearOpenApiCache();

const spec = buildOpenApiSpec();
const outPath = path.join(__dirname, '../openapi.generated.json');
fs.writeFileSync(outPath, JSON.stringify(spec));

const pathCount = Object.keys(spec.paths || {}).length;
let opCount = 0;
for (const p of Object.values(spec.paths || {})) {
  opCount += Object.keys(p as object).length;
}
console.log(`✅ OpenAPI artifact: ${outPath} (${pathCount} paths, ${opCount} operations)`);
