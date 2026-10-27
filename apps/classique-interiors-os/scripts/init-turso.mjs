import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before initializing the remote database.");
}

const client = createClient({ url, authToken });

try {
  const existing = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1",
  );
  if (existing.rows.length) {
    throw new Error("Refusing to initialize a non-empty database. Use a new empty database or apply a reviewed migration.");
  }

  const source = await readFile(new URL("../prisma/turso-init.sql", import.meta.url), "utf8");
  const statements = source
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) =>
      statement
        .replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ")
        .replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS "),
    );

  await client.batch(statements, "write");
  console.log(`Initialized the remote database with ${statements.length} schema statements.`);
} finally {
  client.close();
}
