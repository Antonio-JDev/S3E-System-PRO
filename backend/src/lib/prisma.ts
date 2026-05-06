/**
 * Singleton do PrismaClient para evitar "FATAL: sorry, too many clients already".
 * Sempre importe prisma deste arquivo; nunca instancie new PrismaClient() em controllers, services ou routes.
 *
 * connection_limit: defina na DATABASE_URL, ex.:
 *   postgresql://user:pass@host:5432/db?connection_limit=10
 * Para múltiplas instâncias do app, use connection_limit = (limite_total / num_instancias).
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
