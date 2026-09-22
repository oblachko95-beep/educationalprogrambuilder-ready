import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  // В Cloudflare Workers env доступен через глобальный объект
  const db = (globalThis as any).DB;
  if (!db) {
    throw new Error("Серверная база данных временно недоступна.");
  }
  return drizzle(db, { schema });
}
