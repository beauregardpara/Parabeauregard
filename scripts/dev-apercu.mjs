/**
 * Serveur d'aperçu local.
 *
 * `next dev` charge `.env.local` en priorité sur `.env` : sur ce poste, ce
 * fichier contient les identifiants de production. Un aperçu visuel ne doit
 * jamais toucher la base réelle, donc on impose ici la base SQLite de
 * développement — les variables du processus l'emportent sur les fichiers .env.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = process.argv[2] ?? "3100";

// On appelle le binaire Next directement avec Node : sous Windows, passer par
// `npx.cmd` fait échouer `spawn` (EINVAL) sans `shell: true`.
const binNext = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

const enfant = spawn(
  process.execPath,
  [binNext, "dev", "-p", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "file:./dev.db",
      DIRECT_URL: "file:./dev.db",
      // Le stockage image n'est pas sollicité par la navigation ; on évite
      // simplement que la configuration de production soit lue par erreur.
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_SECRET_KEY: "apercu-local",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
      // Dossier de build dedie : un build autonome deja lance verrouille
      // `.next/standalone`, et `next dev` ne demarre alors jamais.
      NEXT_DIST_DIR: `.next-apercu-${port}`,
    },
  }
);

enfant.on("exit", (code) => process.exit(code ?? 0));
