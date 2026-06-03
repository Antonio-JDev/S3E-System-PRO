import { prisma } from '../lib/prisma';

export type AuditLogRow = {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
  hash: string | null;
  previousHash: string | null;
  chainId: string | null;
  sequence: number | null;
};

type ColumnMap = Map<string, string>;

let cachedColumns: ColumnMap | null = null;

function pickColumn(cols: ColumnMap, ...names: string[]): string | null {
  for (const n of names) {
    const actual = cols.get(n.toLowerCase());
    if (actual) return actual;
  }
  return null;
}

function quoteIdent(name: string): string {
  if (/^[a-z_][a-z0-9_]*$/.test(name)) return name;
  return `"${name}"`;
}

export async function getAuditLogColumns(force = false): Promise<ColumnMap> {
  if (cachedColumns && !force) return cachedColumns;

  const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  `);

  cachedColumns = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const name = String(r.column_name ?? '').trim();
    if (name) cachedColumns.set(name.toLowerCase(), name);
  }
  return cachedColumns;
}

export async function isAuditLogsReadable(): Promise<boolean> {
  const cols = await getAuditLogColumns();
  if (cols.size === 0) return false;
  const hasAction = cols.has('action');
  const hasDescription = cols.has('description');
  const hasCreated = cols.has('created_at') || cols.has('createdat');
  return hasAction && hasDescription && hasCreated;
}

export async function listAuditLogsRaw(opts: {
  limit: number;
  offset: number;
  action?: string;
  entity?: string;
  userId?: string;
}): Promise<AuditLogRow[]> {
  const cols = await getAuditLogColumns(true);
  if (!(await isAuditLogsReadable())) return [];

  const idCol = pickColumn(cols, 'id') ?? 'id';
  const userIdCol = pickColumn(cols, 'user_id', 'userid');
  const userNameCol = pickColumn(cols, 'user_name', 'username');
  const userRoleCol = pickColumn(cols, 'user_role', 'userrole');
  const entityCol = pickColumn(cols, 'entity');
  const entityIdCol = pickColumn(cols, 'entity_id', 'entityid');
  const ipCol = pickColumn(cols, 'ipaddress', 'ip_address');
  const uaCol = pickColumn(cols, 'useragent', 'user_agent');
  const createdCol = pickColumn(cols, 'created_at', 'createdat') ?? 'created_at';
  const metaCol = pickColumn(cols, 'metadata');
  const hashCol = pickColumn(cols, 'hash');
  const prevCol = pickColumn(cols, 'previoushash', 'previous_hash');
  const chainCol = pickColumn(cols, 'chain_id', 'chainid');
  const seqCol = pickColumn(cols, 'sequence');

  const selects: string[] = [
    `${quoteIdent(idCol)} AS id`,
    'action',
    'description',
    `${quoteIdent(createdCol)} AS "createdAt"`,
    userIdCol ? `${quoteIdent(userIdCol)} AS "userId"` : 'NULL::text AS "userId"',
    userNameCol ? `${quoteIdent(userNameCol)} AS "userName"` : 'NULL::text AS "userName"',
    userRoleCol ? `${quoteIdent(userRoleCol)} AS "userRole"` : 'NULL::text AS "userRole"',
    entityCol ? `${quoteIdent(entityCol)} AS entity` : 'NULL::text AS entity',
    entityIdCol ? `${quoteIdent(entityIdCol)} AS "entityId"` : 'NULL::text AS "entityId"',
    ipCol ? `${quoteIdent(ipCol)} AS "ipAddress"` : 'NULL::text AS "ipAddress"',
    uaCol ? `${quoteIdent(uaCol)} AS "userAgent"` : 'NULL::text AS "userAgent"',
    metaCol ? `${quoteIdent(metaCol)} AS metadata` : 'NULL::jsonb AS metadata',
    hashCol ? `${quoteIdent(hashCol)} AS hash` : 'NULL::text AS hash',
    prevCol ? `${quoteIdent(prevCol)} AS "previousHash"` : 'NULL::text AS "previousHash"',
    chainCol ? `${quoteIdent(chainCol)} AS "chainId"` : 'NULL::text AS "chainId"',
    seqCol ? `${quoteIdent(seqCol)} AS sequence` : 'NULL::int AS sequence',
  ];

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.action) {
    conditions.push(`action = $${idx++}`);
    params.push(opts.action);
  }
  if (opts.entity && entityCol) {
    conditions.push(`${quoteIdent(entityCol)} = $${idx++}`);
    params.push(opts.entity);
  }
  if (opts.userId && userIdCol) {
    conditions.push(`${quoteIdent(userIdCol)}::text = $${idx++}`);
    params.push(opts.userId);
  }

  params.push(opts.limit, opts.offset);

  const sql = `
    SELECT ${selects.join(', ')}
    FROM audit_logs
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${quoteIdent(createdCol)} DESC
    LIMIT $${idx++} OFFSET $${idx}
  `;

  const rows = await prisma.$queryRawUnsafe<AuditLogRow[]>(sql, ...params);
  return Array.isArray(rows) ? rows : [];
}

export async function countAuditLogsRaw(where?: {
  action?: string;
  entity?: string;
  userId?: string;
}): Promise<number> {
  const cols = await getAuditLogColumns();
  if (!(await isAuditLogsReadable())) return 0;

  const entityCol = pickColumn(cols, 'entity');
  const userIdCol = pickColumn(cols, 'user_id', 'userid');

  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;

  if (where?.action) {
    conditions.push(`action = $${idx++}`);
    params.push(where.action);
  }
  if (where?.entity && entityCol) {
    conditions.push(`${quoteIdent(entityCol)} = $${idx++}`);
    params.push(where.entity);
  }
  if (where?.userId && userIdCol) {
    conditions.push(`${quoteIdent(userIdCol)}::text = $${idx++}`);
    params.push(where.userId);
  }

  const sql = `SELECT COUNT(*)::int AS c FROM audit_logs WHERE ${conditions.join(' AND ')}`;
  const rows = await prisma.$queryRawUnsafe<{ c: number }[]>(sql, ...params);
  const first = rows?.[0];
  return Number((first as any)?.c ?? 0);
}

export function invalidateAuditLogColumnsCache(): void {
  cachedColumns = null;
}

/** Tenta listar via Prisma; se falhar (schema), usa SQL dinâmico. */
export async function listAuditLogsResilient(opts: {
  limit: number;
  offset: number;
  action?: string;
  entity?: string;
  userId?: string;
}): Promise<AuditLogRow[]> {
  if (!(await isAuditLogsReadable())) return [];

  try {
    const where: Record<string, unknown> = {};
    if (opts.action) where.action = opts.action;
    if (opts.entity) where.entity = opts.entity;
    if (opts.userId) where.userId = opts.userId;

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
      skip: opts.offset,
    });
    return rows as AuditLogRow[];
  } catch (err) {
    console.warn(
      'audit_logs: Prisma findMany falhou, usando leitura SQL:',
      err instanceof Error ? err.message : err
    );
    invalidateAuditLogColumnsCache();
    return listAuditLogsRaw(opts);
  }
}

export async function countAuditLogsResilient(where?: {
  action?: string;
  entity?: string;
  userId?: string;
}): Promise<number> {
  if (!(await isAuditLogsReadable())) return 0;
  try {
    return await prisma.auditLog.count({ where: where ?? {} });
  } catch {
    invalidateAuditLogColumnsCache();
    return countAuditLogsRaw(where);
  }
}
