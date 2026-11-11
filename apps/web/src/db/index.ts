import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * The database connection, for server code only (route handlers, server actions, scripts). The browser and the mobile
 * app never connect to the database; they call the website.
 *
 * DATABASE_URL looks like mysql://USER:PASSWORD@HOST:3306/DATABASE and lives in .env.local (development) or in the
 * Hostinger Node.js app's environment settings (live). It is never committed.
 */
function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to apps/web/.env.local (see .env.example).");
  return mysql.createPool({
    uri: url,
    // Full Unicode, so Sinhala, Tamil and Korean text are stored correctly.
    charset: "utf8mb4_unicode_ci",
    // Shared hosting allows only a few connections per database user; a small pool is plenty for this site.
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 5),
    // Store and read every date in UTC; the website shows them in Korea time.
    timezone: "Z",
    // MariaDB on Hostinger closes a connection after 20 seconds without a query (wait_timeout = 20). The pool closes
    // its own idle connections sooner, so it never hands out one the server has already dropped.
    enableKeepAlive: true,
    idleTimeout: 10_000,
    maxIdle: 2,
  });
}

// One pool per server process, also across Next.js hot reloads in development.
const globalForDb = globalThis as unknown as { slEventsPool?: mysql.Pool };
export const pool = globalForDb.slEventsPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.slEventsPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });

/** `db`, or a transaction from `db.transaction`: helpers that may run inside a transaction take either. */
export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
export { schema };
