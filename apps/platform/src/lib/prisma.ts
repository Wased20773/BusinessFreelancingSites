import { PrismaClient } from '@business-freelancer/database';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Add it to .env.local at the project root.');
}

// Reuse the client stored on the global object during development. This avoids
// opening a new connection pool whenever Next.js reloads the module.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

// Production modules are not hot-reloaded, so global caching is unnecessary.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}