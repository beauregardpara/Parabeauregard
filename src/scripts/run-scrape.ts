/**
 * CLI : npm run scrape -- --source=mapara.ma [--auto]
 * Sans --source, toutes les sources actives sont traitées.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runScrape } from "../lib/scraper/engine";
import { connectorKeys } from "../lib/scraper/connectors";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a) => a.startsWith("--source="))?.split("=")[1];
  const auto = args.includes("--auto");

  const sources = sourceArg ? [sourceArg] : connectorKeys();
  let failed = 0;

  for (const source of sources) {
    console.log(`\n▶ Scraping de ${source}…`);
    try {
      // --auto force la publication directe (sinon le réglage admin auto_publish est lu)
      const result = await runScrape(source, { autoPublish: auto });
      console.log(
        `✔ ${source} — ${result.status} | +${result.addedCount} ajoutés, ~${result.updatedCount} modifiés, ${result.errorCount} erreurs`
      );
    } catch (err) {
      failed++;
      console.error(`✖ ${source} a échoué : ${(err as Error).message}`);
    }
  }

  await db.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
