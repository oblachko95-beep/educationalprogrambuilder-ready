import { createD1Database } from "./providers/d1";

export const STORAGE_MODE = "server" as const;
export const DATABASE_PROVIDER = "d1" as const;

export function getDb() {
  return createD1Database();
}
