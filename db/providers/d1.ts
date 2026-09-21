import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../schema";

/** Текущий серверный адаптер БД для размещения в Sites. */
export function createD1Database() {
  if (!env.DB) {
    throw new Error(
      "Серверная база данных временно недоступна. Повторите попытку позднее.",
    );
  }

  return drizzle(env.DB, { schema });
}

