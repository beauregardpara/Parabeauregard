import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const canonicalSchema = join(root, "prisma", "schema.prisma");
// Keep the generated schema beside schema.prisma so file:./dev.db keeps the
// same SQLite location (Prisma resolves relative URLs from the schema file).
const generatedDir = join(root, "prisma");

// Prisma CLI loads local env files automatically. This small equivalent keeps
// the wrapper deterministic while preserving explicitly injected variables.
function loadLocalEnv() {
  // `.env.local` overrides `.env`; injected process variables override both.
  // Load the lower-priority file first because existing process values win.
  for (const envPath of [join(root, ".env.local"), join(root, ".env")]) {
    if (!existsSync(envPath)) continue;
    for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match || process.env[match[1]]) continue;
      const rawValue = match[2].trim();
      process.env[match[1]] =
        rawValue.startsWith('"') && rawValue.endsWith('"')
          ? rawValue.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"')
          : rawValue;
    }
  }
}

loadLocalEnv();

function providerFor(url) {
  if (/^file:/i.test(url)) return "sqlite";
  if (/^postgres(ql)?:/i.test(url)) return "postgresql";
  throw new Error("DATABASE_URL must use file: for SQLite or postgres:// / postgresql:// for PostgreSQL.");
}

function findBlockEnd(source, openBrace) {
  let depth = 0;
  let quote = false;
  let escaped = false;
  for (let i = openBrace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') quote = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return i;
  }
  return -1;
}

function generatedSchema(provider) {
  const source = readFileSync(canonicalSchema, "utf8");
  const datasourceStart = source.indexOf("datasource db");
  if (datasourceStart < 0) throw new Error("Canonical Prisma schema has no datasource db block.");
  const openBrace = source.indexOf("{", datasourceStart);
  const closeBrace = findBlockEnd(source, openBrace);
  if (openBrace < 0 || closeBrace < 0) throw new Error("Could not parse datasource db block safely.");
  const block = source.slice(datasourceStart, closeBrace + 1);
  if (!/\bprovider\s*=/.test(block) || !/\burl\s*=/.test(block)) {
    throw new Error("Datasource db must contain provider and url entries.");
  }
  const directUrl = provider === "postgresql" && process.env.DIRECT_URL
    ? `\n  directUrl = env("DIRECT_URL")`
    : "";
  const replacement = `datasource db {\n  provider = "${provider}"\n  url      = env("DATABASE_URL")${directUrl}\n}`;
  return `${source.slice(0, datasourceStart)}${replacement}${source.slice(closeBrace + 1)}`;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for Prisma commands.");
const provider = providerFor(databaseUrl);
mkdirSync(generatedDir, { recursive: true });
const schemaPath = join(generatedDir, `schema.${provider}.generated.prisma`);
writeFileSync(schemaPath, generatedSchema(provider), "utf8");

const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2), "--schema", schemaPath], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
