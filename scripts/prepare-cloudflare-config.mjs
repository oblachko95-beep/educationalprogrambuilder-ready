import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const configPath = resolve("dist/server/wrangler.json");
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "educational_program_builder";
const remote = process.argv.includes("--remote");

if (remote && !databaseId) {
  throw new Error("Set CLOUDFLARE_D1_DATABASE_ID before remote migrations or deploy.");
}

const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw);
delete config.migrations_dir;
if (databaseId) {
  config.d1_databases = [
    {
      binding: "DB",
      database_name: databaseName,
      database_id: databaseId,
      migrations_dir: "../../drizzle",
    },
  ];
} else {
  config.d1_databases = (config.d1_databases ?? []).map((database) => ({
    ...database,
    migrations_dir: "../../drizzle",
  }));
}

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
