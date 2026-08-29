import { PrismaClient } from "@prisma/client";

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Prisma validates DATABASE_URL at construction time, so we only build the
// client when it's actually configured. Routes that need persistence call
// getPrisma() and handle `null` by degrading gracefully (see routes/auth.ts)
// rather than crashing the whole server when no database is attached.
let cachedClient: PrismaClient | null = null;

export function getPrisma(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  if (!cachedClient) cachedClient = new PrismaClient();
  return cachedClient;
}
