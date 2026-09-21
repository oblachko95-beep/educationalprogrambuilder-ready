import ProgramWorkspace from "./program-workspace";
import { authenticatedSignOutPath, requireAuthenticatedUser } from "@/lib/server-auth";
import { ensureUserProfile } from "@/lib/user-profile";
import { effectiveUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAuthenticatedUser("/");
  const profile = await ensureUserProfile(user);
  return <ProgramWorkspace displayName={user.displayName} email={user.email} assignedRole={profile.role} initialRole={effectiveUserRole(profile)} signOutPath={authenticatedSignOutPath("/")} />;
}
