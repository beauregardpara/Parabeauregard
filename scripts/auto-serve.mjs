/**
 * auto-serve.mjs — surveillance du code + rebuild/relance automatique en production.
 *
 * À chaque modification des sources (src/, prisma/, scripts/, next.config.ts,
 * package.json, .env), ce script :
 *   1. arrête le serveur next start en cours (s'il existe)
 *   2. relance `npm run build`
 *   3. redémarre `npm run start`
 *
 * Le watcher est basé sur un sondage (mtime + taille) plutôt que sur fs.watch :
 * plus fiable sous Windows et sans événements parasites après un build.
 *
 * Lancement : npm run serve:auto   (depuis la racine du projet)
 */
import { spawn, spawnSync, execSync } from "node:child_process";
import { statSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IS_WIN = process.platform === "win32";
const NPM = IS_WIN ? "npm.cmd" : "npm";
const DEBOUNCE_MS = 4000;
const POLL_MS = 2000;
const MAX_RETRIES = 3;

const WATCH_PATHS = ["src", "prisma", "scripts", "next.config.ts", "package.json", ".env"];

let currentServer = null;
let startGen = 0;
let retryCount = 0;
let rebuilding = false;
let pendingRebuild = false;
let timer = null;
let scheduledKey = null;
let baseline = new Map();

function log(msg) {
  console.log(`[auto-serve] ${new Date().toLocaleTimeString()} ${msg}`);
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function freePort(port) {
  if (!IS_WIN) return;
  try {
    const out = execSync(`netstat -ano -p tcp | findstr :${port}`, { cwd: ROOT }).toString();
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/\sLISTENING\s+(\d+)\s*$/);
      if (m) pids.add(parseInt(m[1], 10));
    }
    for (const pid of pids) {
      if (pid === process.pid) continue;
      try {
        execSync(`taskkill /F /PID ${pid}`, { cwd: ROOT });
        log(`Port ${port} libéré (PID ${pid})`);
      } catch {
        /* déjà libéré */
      }
    }
  } catch {
    /* rien à l'écoute sur ce port */
  }
  await wait(700);
}

async function startServer() {
  const gen = ++startGen;
  await freePort(3000);
  if (gen !== startGen) return; // remplacé par un cycle plus récent
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  log("Démarrage de next start...");
  const child = spawn(process.execPath, [nextBin, "start"], { cwd: ROOT, stdio: "inherit" });
  currentServer = child;

  child.on("exit", (code) => {
    if (gen !== startGen) return; // cycle obsolète, ne rien faire
    currentServer = null;
    if (!rebuilding && code !== 0 && code !== null) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        log(`next start arrêté (code ${code}). Essai ${retryCount}/${MAX_RETRIES} dans 3s...`);
        setTimeout(() => startServer(), 3000);
      } else {
        log("Échec répété de next start. Nouvelle tentative au prochain changement du code.");
      }
    }
  });

  child.on("error", (err) => {
    if (gen !== startGen) return;
    log(`Erreur next start : ${err.message}`);
    currentServer = null;
  });
}

function stopServer() {
  startGen++; // invalide tout retry ou démarrage en cours
  if (currentServer) {
    log("Arrêt de next start...");
    try {
      currentServer.kill();
    } catch {
      /* ignore */
    }
    currentServer = null;
  }
}

function takeSnapshot() {
  const sig = new Map();
  const addFile = (full) => {
    try {
      const st = statSync(full);
      sig.set(full, `${st.mtimeMs}:${st.size}`);
    } catch {
      /* fichier supprimé entre deux passes */
    }
  };
  const walkDir = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next") continue;
        walkDir(fp);
      } else {
        if (ent.name.endsWith(".log") || ent.name.endsWith("~")) continue;
        addFile(fp);
      }
    }
  };
  for (const p of WATCH_PATHS) {
    const full = path.resolve(ROOT, p);
    try {
      if (statSync(full).isDirectory()) walkDir(full);
      else addFile(full);
    } catch {
      /* chemin absent */
    }
  }
  return sig;
}

async function rebuild() {
  if (rebuilding) {
    pendingRebuild = true;
    return;
  }
  rebuilding = true;
  stopServer();
  log("Build en cours (npm run build)...");
  const started = Date.now();
  try {
    const res = IS_WIN
      ? spawnSync("cmd.exe", ["/c", "npm run build"], { cwd: ROOT, stdio: "inherit", shell: false })
      : spawnSync(NPM, ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: false });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`build code ${res.status}`);
    log(`Build réussi en ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (e) {
    log(`Build échec (${e.message}). Démarrage de l'ancien build...`);
  } finally {
    baseline = takeSnapshot(); // réinitialise l'état de référence
    timer = null;
    scheduledKey = null;
    rebuilding = false;
    await startServer();
    if (pendingRebuild) {
      pendingRebuild = false;
      rebuild();
    }
  }
}

function scheduleRebuild(reason) {
  if (rebuilding) {
    pendingRebuild = true;
    return;
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    rebuild();
  }, DEBOUNCE_MS);
  log(`Changement détecté (${reason}). Rebuild dans ${DEBOUNCE_MS / 1000}s si plus aucune modification.`);
}

function poll() {
  if (rebuilding) return;
  const cur = takeSnapshot();
  let changed = null;
  if (cur.size !== baseline.size) {
    for (const k of cur.keys()) if (!baseline.has(k)) { changed = k; break; }
    if (!changed) for (const k of baseline.keys()) if (!cur.has(k)) { changed = k; break; }
  }
  if (!changed) {
    for (const [k, v] of cur) {
      if (baseline.get(k) !== v) { changed = k; break; }
    }
  }
  if (changed) {
    if (timer && scheduledKey === changed) return; // même fichier déjà planifié
    scheduleRebuild(path.basename(changed));
    scheduledKey = changed;
  } else {
    scheduledKey = null;
  }
}

baseline = takeSnapshot();
log("Serveur auto prêt. Éditez le code : rebuild + redémarrage automatiques.");
const buildIdPath = path.join(ROOT, ".next", "BUILD_ID");
let hasBuild = false;
try {
  hasBuild = statSync(buildIdPath).isFile();
} catch {
  /* .next absent ou incomplet */
}
if (hasBuild) {
  startServer();
} else {
  log("Aucun build valide (.next/BUILD_ID absent ou incomplet). Premier build...");
  rebuild();
}
setInterval(poll, POLL_MS);

process.on("SIGINT", () => {
  stopServer();
  process.exit(0);
});