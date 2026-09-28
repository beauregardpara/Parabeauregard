/** Detail des rayons : nom, icone, ordre, visibilite. Lecture seule. */
import { config as chargerEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

chargerEnv({ path: ".env.local", override: true });
chargerEnv({ path: ".env" });

const db = new PrismaClient();

async function main() {
  const cats = await db.category.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }] });
  for (const c of cats) {
    console.log(
      `${String(c.id).padStart(3)} ordre=${String(c.order).padStart(3)} ${c.visible ? "visible" : "MASQUE "} ${(c.icon ?? "—").padEnd(3)} ${c.slug}${c.parentId ? ` (parent ${c.parentId})` : ""}`
    );
  }
  await db.$disconnect();
}

main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
