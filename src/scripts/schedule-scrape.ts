/**
 * Planificateur : npm run scrape:schedule
 * Relance le scraping selon la fréquence configurée dans les paramètres admin
 * (clé scrape_frequency_hours, défaut 6h). Ctrl+C pour arrêter.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runScrape, findActiveRun } from "../lib/scraper/engine";
import { connectorKeys } from "../lib/scraper/connectors";

const db = new PrismaClient();

async function getFrequencyHours(): Promise<number> {
  const row = await db.setting.findUnique({ where: { key: "scrape_frequency_hours" } });
  const n = parseFloat(row?.value ?? "6");
  return Number.isFinite(n) && n >= 1 ? n : 6;
}

async function tick() {
  const hours = await getFrequencyHours();
  console.log(`⏰ Prochain scraping dans ${hours}h. Sources : ${connectorKeys().join(", ")}`);
  for (const source of connectorKeys()) {
    try {
      // Garde anti-double-exécution partagée avec l'API d'administration :
      // une exécution abandonnée est clôturée au lieu de bloquer la source.
      const running = await findActiveRun(source);
      if (running) {
        console.log(`⏭ Source ${source} déjà en cours (run #${running.id}), on saute ce tour.`);
        continue;
      }
      await runScrape(source);
    } catch (err) {
      console.error(`Source ${source} en échec : ${(err as Error).message}`);
    }
  }
}

async function loop() {
  await tick();
  const hours = await getFrequencyHours();
  setInterval(tick, hours * 3600_000);
}

loop().catch((e) => {
  console.error(e);
  process.exit(1);
});
