import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so it reads .env.local itself.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local: DATABASE_URL may come from the environment instead */
}

/**
 * Database changes are made as migration files in ./drizzle (committed to git), generated from src/db/schema.ts:
 *   npm run db:generate   write a migration for whatever changed in the schema
 *   npm run db:migrate    apply the migrations to the database in DATABASE_URL
 */
export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "mysql://user:password@localhost:3306/slevents" },
  strict: true,
  verbose: true,
});
