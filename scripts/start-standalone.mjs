import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

// Next standalone n’importe pas automatiquement les fichiers .env locaux.
// Les variables injectées par l’hébergeur restent prioritaires, sauf lorsqu’un
// ancien DATABASE_URL SQLite du shell masquerait explicitement PostgreSQL de
// .env.local. Cela évite de tester silencieusement le mauvais moteur.
const fileEnv = new Map();
for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), ".env.local")]) {
  if (!existsSync(envPath)) continue;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const rawValue = match[2].trim();
    fileEnv.set(match[1], rawValue.startsWith('"') && rawValue.endsWith('"')
      ? rawValue.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"')
      : rawValue);
  }
}

for (const [name, value] of fileEnv) {
  const staleSqlite = name === "DATABASE_URL" && /^file:/i.test(process.env[name] ?? "") && /^postgres(ql)?:\/\//i.test(value);
  if (!process.env[name] || staleSqlite) process.env[name] = value;
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === "file:./dev.db") {
  const localDatabase = resolve(process.cwd(), "prisma", "dev.db");
  if (existsSync(localDatabase)) process.env.DATABASE_URL = `file:${localDatabase}`;
}

const standaloneRoot = resolve(process.cwd(), ".next", "standalone");
const staticSource = resolve(process.cwd(), ".next", "static");
const staticTarget = resolve(standaloneRoot, ".next", "static");
if (existsSync(staticSource)) {
  rmSync(staticTarget, { recursive: true, force: true });
  mkdirSync(resolve(standaloneRoot, ".next"), { recursive: true });
  cpSync(staticSource, staticTarget, { recursive: true });
}
const publicSource = resolve(process.cwd(), "public");
const publicTarget = resolve(standaloneRoot, "public");
if (existsSync(publicSource)) {
  rmSync(publicTarget, { recursive: true, force: true });
  cpSync(publicSource, publicTarget, { recursive: true });
}

const server = spawn(process.execPath, [resolve(standaloneRoot, "server.js")], {
  stdio: "inherit",
  env: process.env,
});

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
