"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load env here too: this module is imported (via controllers) before
// app.ts gets a chance to call dotenv.config().
dotenv_1.default.config();
const client_1 = require("@prisma/client");
const adapter_neon_1 = require("@prisma/adapter-neon");
const serverless_1 = require("@neondatabase/serverless");
const ws_1 = __importDefault(require("ws"));
// The Neon serverless driver talks to Postgres over WebSocket (port 443),
// which shared hosts never block. Node < 22 has no global WebSocket.
if (typeof WebSocket === 'undefined') {
    serverless_1.neonConfig.webSocketConstructor = ws_1.default;
}
// Neon suspends idle computes; the first query after an idle period can fail
// with a transient connection error while the compute wakes up. Retry those
// globally instead of surfacing a 500 to the client.
// Safe to retry: these codes mean the query never reached / never ran on the DB.
const TRANSIENT_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const MAX_ATTEMPTS = 3;
const adapter = new adapter_neon_1.PrismaNeon({ connectionString: process.env.DATABASE_URL });
const basePrisma = new client_1.PrismaClient({ adapter });
const prisma = basePrisma.$extends({
    query: {
        async $allOperations({ operation, model, args, query }) {
            for (let attempt = 1;; attempt++) {
                try {
                    return await query(args);
                }
                catch (error) {
                    const code = error?.code;
                    if (!TRANSIENT_ERROR_CODES.has(code) || attempt >= MAX_ATTEMPTS) {
                        throw error;
                    }
                    console.warn(`[prisma] Transient ${code} on ${model ?? 'client'}.${operation} — retrying (attempt ${attempt}/${MAX_ATTEMPTS - 1}) in ${attempt}s`);
                    await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
                }
            }
        },
    },
});
exports.default = prisma;
