import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const base = required("SUPABASE_URL").replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BACKUP_BUCKET ?? "product-images";
const outputDir = resolve(process.env.STORAGE_BACKUP_OUTPUT ?? "artifacts/storage-backup");
const manifestPath = process.env.STORAGE_BACKUP_MANIFEST ? resolve(process.env.STORAGE_BACKUP_MANIFEST) : null;
const PAGE_SIZE = 1000;
const MAX_DEPTH = 10;

if (!key) throw new Error("A server-only Supabase storage key is required.");

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function headers() {
  return { Authorization: `Bearer ${key}`, apikey: key };
}

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
  // Never echo URLs, headers or response bodies: only the status code.
  if (!response.ok) throw new Error(`Supabase Storage request failed with status ${response.status}.`);
  return response;
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeTarget(name) {
  if (name.split("/").some((part) => part === ".." || part === "")) {
    throw new Error("Storage object path is not safe to write.");
  }
  const target = resolve(outputDir, name);
  if (target === outputDir || !target.startsWith(`${outputDir}${sep}`)) {
    throw new Error("Storage object path escapes the backup directory.");
  }
  return target;
}

// Supabase list() is not recursive: entries with id === null are folders.
async function listFolder(prefix, depth, files) {
  if (depth > MAX_DEPTH) throw new Error("Storage folder nesting exceeds the supported depth.");
  let offset = 0;
  for (;;) {
    const response = await request(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error("Unexpected Storage list response.");
    for (const item of page) {
      if (!item?.name || item.name === ".emptyFolderPlaceholder") continue;
      const fullName = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || item.id === undefined) await listFolder(fullName, depth + 1, files);
      else files.push({ name: fullName, size: Number(item.metadata?.size ?? 0) });
    }
    if (page.length < PAGE_SIZE) return files;
    offset += page.length;
  }
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const objects = await listFolder("", 0, []);
  let bytes = 0;
  for (const object of objects) {
    const response = await request(`/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(object.name)}`);
    const body = Buffer.from(await response.arrayBuffer());
    const target = safeTarget(object.name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body, { flag: "wx" });
    bytes += body.length;
  }
  const summary = { ok: true, bucket, objects: objects.length, bytes };
  if (manifestPath) {
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify({ ...summary, createdAt: new Date().toISOString(), files: objects.map((o) => o.name) }, null, 2)}\n`);
  }
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `objects=${objects.length}\nbytes=${bytes}\n`, { flag: "a" });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage backup failed.");
  process.exitCode = 1;
});
