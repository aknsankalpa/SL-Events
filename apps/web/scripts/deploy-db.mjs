// Prepares the database for a new version of the website. Runs before every build on Hostinger (see "build" in
// package.json), with the hosting's environment variables:
//
//   1. Applies any migrations in ./drizzle that the database doesn't have yet (the same ones `npm run db:migrate`
//      applies; both record them in the __drizzle_migrations table, so they never run twice).
//   2. If ADMIN_EMAIL is set, makes sure that account exists and is an admin. A new account has no password: open
//      "Forgot password" on the website with that email to set one.
//
// Without DATABASE_URL (a build on your own computer, where it lives in .env.local) it does nothing, so local builds
// never change a database by accident. Use `npm run db:migrate` for the dev database.

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[deploy-db] DATABASE_URL is not set here: skipping migrations (local build).");
  process.exit(0);
}

const connection = await mysql.createConnection({ uri: url, charset: "utf8mb4_unicode_ci", timezone: "Z", multipleStatements: false });
try {
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  const [[{ n }]] = await connection.query("SELECT COUNT(*) AS n FROM __drizzle_migrations");
  console.log(`[deploy-db] Database is up to date (${n} migrations applied).`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`ADMIN_EMAIL "${email}" is not an email address.`);
    let [[user]] = await connection.query("SELECT id FROM users WHERE email = ?", [email]);
    if (!user) {
      // Marked verified: setting the password needs a code sent to this address, which proves it.
      await connection.query("INSERT INTO users (email, name, email_verified_at) VALUES (?, ?, UTC_TIMESTAMP())", [email, "Admin"]);
      [[user]] = await connection.query("SELECT id FROM users WHERE email = ?", [email]);
      console.log(`[deploy-db] Created the admin account ${email}. Use "Forgot password" on the website to set its password.`);
    }
    for (const role of ["admin", "customer"]) await connection.query("INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, ?)", [user.id, role]);
    console.log(`[deploy-db] ${email} is an admin.`);
  }
} catch (e) {
  console.error("[deploy-db] Failed:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await connection.end();
}
