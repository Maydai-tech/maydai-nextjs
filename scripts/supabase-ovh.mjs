#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const env = { ...process.env };

for (const file of ["deploy/.env", ".env.supabase"]) {
  if (!existsSync(file)) continue;

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (env[key] !== undefined) continue;

    env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
}

env.PGSSLMODE ??= env.SUPABASE_DB_SSLMODE || "disable";

function dbUrl() {
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;

  const user = env.POSTGRES_USER;
  const password = env.POSTGRES_PASSWORD;
  const database = env.POSTGRES_DB;

  if (!user || !password || !database) {
    throw new Error(
      "Missing SUPABASE_DB_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB in the environment, deploy/.env, or .env.supabase.",
    );
  }

  const url = new URL("postgresql://127.0.0.1/postgres");
  url.hostname = env.SUPABASE_DB_HOST || "127.0.0.1";
  url.port = env.SUPABASE_DB_PORT || "15432";
  url.username = user;
  url.password = password;
  url.pathname = `/${database}`;
  url.searchParams.set("sslmode", env.SUPABASE_DB_SSLMODE || "disable");

  return url.toString();
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  console.log(`Usage:
  npm run supabase:ovh -- query "select now();"
  npm run supabase:ovh -- query -f path/to/file.sql
  npm run supabase:ovh -- push --dry-run
  npm run supabase:ovh -- diff --schema public
  npm run supabase:ovh -- pull snapshot_name --schema public
  npm run supabase:ovh -- migration list

Before using it, start the SSH tunnel:
  npm run supabase:ovh:tunnel -- start

The wrapper calls "supabase db <args>" by default.
Pass "migration ..." to call "supabase migration ...".
`);
  process.exit(0);
}

const rootCommands = new Set(["db", "migration"]);
let finalArgs = rootCommands.has(args[0]) ? args : ["db", ...args];
if (!finalArgs.includes("--db-url")) {
  finalArgs = [...finalArgs, "--db-url", dbUrl()];
}

const child = spawn("supabase", finalArgs, {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
