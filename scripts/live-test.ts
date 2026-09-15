import { getConnector, connectorKeys } from "../src/lib/scraper/connectors";
import { politeFetch } from "../src/lib/scraper/http";
import { isAllowedByRobots } from "../src/lib/scraper/http";

async function main() {
  for (const key of connectorKeys()) {
    const c = getConnector(key)!;
    const robots = await isAllowedByRobots(c.baseUrl);
    console.log(`\n=== ${key} (${c.name}) ===`);
    console.log(`robots: ${robots.note}`);
    const listUrl = c.listUrls[0].url;
    try {
      const $ = await politeFetch(listUrl, [300, 600]);
      console.log(`list page OK, html size: ${$.html().length}`);
      let links = 0;
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (c.productUrlPattern.test(href)) links++;
      });
      console.log(`product links matched on page 1: ${links}`);
    } catch (err) {
      console.log(`list page FAILED: ${(err as Error).message}`);
    }
  }
}

main();