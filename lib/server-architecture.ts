export const serverArchitecture = {
  storageMode: "server",
  localStorageIsAuthoritative: false,
  database: {
    activeProvider: "Cloudflare D1",
    migrationTarget: "PostgreSQL / Postgres Pro",
  },
  authentication: {
    activeProvider: "email + пароль",
    migrationTarget: "корпоративный SSO по OIDC при необходимости",
  },
} as const;

export type StorageMode = typeof serverArchitecture.storageMode;
