import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const base = required("SUPABASE_URL").replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BACKUP_BUCKET ?? "product-images";
const outputDir = resolve(process.env.STORAGE_BACKUP_OUTPUT ?? "artifacts/storage-backup");

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
  if (!response.ok) throw new Error(`Supabase Storage request failed with status ${response.status}.`);
  return response;
}

function safeTarget(name) {
  const target = resolve(outputDir, name);
  if (target !== outputDir && !target.startsWith(`${outputDir}${sep}`)) {
    throw new Error("Storage object path escapes the backup directory.");
  }
  return target;
}

async function listObjects() {
  const objects = [];
  let offset = 0;
  for (;;) {
    const response = await request(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 1000, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const page = await response.json();
    objects.push(...page);
    if (page.length < 1000) return objects.filter((item) => item.name);
    offset += page.length;
  }
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const objects = await listObjects();
  let bytes = 0;
  for (const object of objects) {
    const response = await request(`/storage/v1/object/${encodeURIComponent(bucket)}/${object.name}`);
    const body = Buffer.from(await response.arrayBuffer());
    const target = safeTarget(object.name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body, { flag: "wx" });
    bytes += body.length;
  }
  console.log(JSON.stringify({ ok: true, bucket, objects: objects.length, bytes, output: outputDir }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage backup failed.");
  process.exitCode = 1;
});
