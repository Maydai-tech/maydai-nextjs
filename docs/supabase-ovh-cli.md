# Supabase CLI against OVH self-hosted

The OVH Postgres container only exposes `127.0.0.1:5432` on the server, so local CLI commands must use an SSH tunnel.

## Start the tunnel

```bash
npm run supabase:ovh:tunnel -- start
```

This forwards local `127.0.0.1:15432` to `127.0.0.1:5432` on `ubuntu@57.130.47.254`.

Stop it with:

```bash
npm run supabase:ovh:tunnel -- stop
```

## Run CLI commands

The wrapper reads credentials from, in order:

1. your shell environment,
2. `deploy/.env`,
3. `.env.supabase`.

Examples:

```bash
npm run supabase:ovh -- query "select now();"
npm run supabase:ovh -- query -f scripts/sync-rls-to-ovh.sql
npm run supabase:ovh -- migration list
npm run supabase:ovh -- push --dry-run
```

## Current migration caveat

The OVH database already has timestamped migration history entries, while this repo mostly has numeric migration files such as `003_add_model_metadata_and_scores.sql`.

As of this setup, `supabase migration list` connects successfully but shows divergent local and remote histories. Do not run a real `push` until the migration history is reconciled.

## Codex MCP

The project root `.mcp.json` contains a `supabase-ovh` MCP server pointing to:

```text
http://localhost:8080/mcp
```

Start the MCP tunnel before opening or reloading Codex from this repo:

```bash
npm run supabase:ovh:mcp:tunnel -- start
```

Check it:

```bash
npm run supabase:ovh:mcp:tunnel -- status
```

Stop it only if it was started through the project script:

```bash
npm run supabase:ovh:mcp:tunnel -- stop
```

If you started the tunnel manually with `ssh -L 8080:localhost:8000 ubuntu@57.130.47.254`, Codex can use the same `.mcp.json` entry, but the project script cannot stop that manual SSH process.
