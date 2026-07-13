import { PrismaClient } from '@prisma/client';

// Neon (serverless Postgres) suspends idle computes; the first query after an
// idle period can fail with a transient connection error while the compute
// wakes up. Retry those globally instead of surfacing a 500 to the client.
// Safe to retry: these codes mean the query never reached / never ran on the DB.
const TRANSIENT_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const MAX_ATTEMPTS = 3;

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      for (let attempt = 1; ; attempt++) {
        try {
          return await query(args);
        } catch (error: any) {
          const code = error?.code;
          if (!TRANSIENT_ERROR_CODES.has(code) || attempt >= MAX_ATTEMPTS) {
            throw error;
          }
          console.warn(
            `[prisma] Transient ${code} on ${model ?? 'client'}.${operation} — retrying (attempt ${attempt}/${MAX_ATTEMPTS - 1}) in ${attempt}s`
          );
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    },
  },
});

export default prisma;
