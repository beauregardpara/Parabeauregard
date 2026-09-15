import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const bucket = process.env.SUPABASE_BACKUP_BUCKET ?? "database-backups";
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "14");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function databaseConnection() {
  const raw = required("DIRECT_URL");
  const url = new URL(raw);
  if (!/^postgres(ql)?:$/i.test(url.protocol)) throw new Error("DIRECT_URL must be PostgreSQL.");
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    sslmode: url.searchParams.get("sslmode") ?? "require",
  };
}

function runPgDump(output) {
  const connection = databaseConnection();
  return new Promise((resolve, reject) => {
    const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", output], {
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        PGHOST: connection.host,
        PGPORT: connection.port,
        PGUSER: connection.user,
        PGPASSWORD: connection.password,
        PGDATABASE: connection.database,
        PGSSLMODE: connection.sslmode,
      },
    });
    let errorOutput = "";
    child.stderr.on("data", (chunk) => { errorOutput += String(chunk); });
    child.once("error", () => reject(new Error("pg_dump is not available or could not start.")));
    child.once("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`pg_dump failed with exit code ${code}: ${errorOutput.slice(0, 300)}`));
    });
  });
}

function storageHeaders(key) {
  return { Authorization: `Bearer ${key}`, apikey: key };
}

async function storageRequest(base, key, path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...storageHeaders(key), ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Supabase Storage request failed with status ${response.status}.`);
  return response;
}

async function assertPrivateBucket(base, key) {
  const response = await storageRequest(base, key, "/storage/v1/bucket");
  const buckets = await response.json();
  const target = buckets.find((item) => item.id === bucket);
  if (!target) throw new Error(`Backup bucket ${bucket} does not exist.`);
  if (target.public !== false) throw new Error(`Backup bucket ${bucket} must remain private.`);
}

async function pruneOldBackups(base, key) {
  const response = await storageRequest(base, key, `/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 100, offset: 0, sortBy: { column: "created_at", order: "asc" } }),
  });
  const files = await response.json();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const file of files) {
    const created = Date.parse(file.created_at ?? "");
    if (file.name && Number.isFinite(created) && created < cutoff) {
      await storageRequest(base, key, `/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(file.name)}`, { method: "DELETE" });
    }
  }
}

async function main() {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error("BACKUP_RETENTION_DAYS must be a positive integer.");
  const base = required("SUPABASE_URL").replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("A server-only Supabase storage key is required.");
  await assertPrivateBucket(base, key);

  const temp = await mkdtemp(join(tmpdir(), "para-beauregard-backup-"));
  const output = join(temp, "database.dump");
  try {
    await runPgDump(output);
    const bytes = await readFile(output);
    const size = (await stat(output)).size;
    if (!size || !bytes.length) throw new Error("pg_dump produced an empty file.");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `para-beauregard-prod-${stamp}.dump`;
    await storageRequest(base, key, `/storage/v1/object/${encodeURIComponent(bucket)}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream", "x-upsert": "false" },
      body: bytes,
    });
    await pruneOldBackups(base, key);
    console.log(JSON.stringify({ ok: true, bucket, file: name, size, sha256: createHash("sha256").update(bytes).digest("hex"), retentionDays }));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Backup failed.");
  process.exitCode = 1;
});
