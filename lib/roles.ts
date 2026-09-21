export type UserRole = "author" | "reviewer" | "admin";

export const roleLabels: Record<UserRole, string> = {
  author: "Автор",
  reviewer: "Проверяющий",
  admin: "Администратор",
};

export function effectiveUserRole(profile: { role: UserRole; actingRole?: UserRole | null }): UserRole {
  return profile.role === "admin" ? (profile.actingRole ?? "admin") : profile.role;
}
