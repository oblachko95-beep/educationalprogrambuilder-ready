import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const authUsers = sqliteTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_auth_users_email").on(table.email)],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_auth_sessions_token_hash").on(table.tokenHash),
    index("idx_auth_sessions_user_expires").on(table.userId, table.expiresAt),
  ],
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_password_reset_tokens_token_hash").on(table.tokenHash),
    index("idx_password_reset_tokens_user").on(table.userId),
  ],
);

export const programs = sqliteTable(
  "programs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type", { enum: ["DOOP", "PK", "PP"] }).notNull(),
    title: text("title").notNull(),
    status: text("status", { enum: ["draft", "review", "approved", "revision", "ready"] }).notNull().default("draft"),
    progress: integer("progress").notNull().default(0),
    data: text("data").notNull().default("{}"),
    reviewComment: text("review_comment").notNull().default(""),
    fieldComments: text("field_comments").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_programs_user_updated").on(table.userId, table.updatedAt)],
);

export const disciplines = sqliteTable(
  "disciplines",
  {
    id: text("id").primaryKey(),
    programId: text("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    hours: integer("hours").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    data: text("data").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_disciplines_user_updated").on(table.userId, table.updatedAt),
    index("idx_disciplines_program_order").on(table.programId, table.sortOrder),
  ],
);

export const userProfiles = sqliteTable(
  "user_profiles",
  {
    userId: text("user_id").primaryKey(),
    displayName: text("display_name").notNull().default(""),
    email: text("email").notNull().default(""),
    requestedRole: text("requested_role", { enum: ["author", "reviewer", "admin"] }).notNull().default("author"),
    role: text("role", { enum: ["author", "reviewer", "admin"] }).notNull().default("author"),
    actingRole: text("acting_role", { enum: ["author", "reviewer", "admin"] }).notNull().default("admin"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_user_profiles_role").on(table.role)],
);
