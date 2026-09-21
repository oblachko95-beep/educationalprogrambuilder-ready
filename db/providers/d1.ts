import { drizzle } from "drizzle-orm/d1";
import * as schema from "../schema";

/** Текущий серверный адаптер БД для размещения в Sites. */
export function createD1Database() {
  // Используем глобальный объект env, доступный в Cloudflare Workers
  const db = (globalThis as any).DB;
  if (!db) {
    throw new Error(
      "Серверная база данных временно недоступна. Повторите попытку позднее.",
    );
  }

  return drizzle(db, { schema });
}
