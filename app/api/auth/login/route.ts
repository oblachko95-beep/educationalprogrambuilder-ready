import { isAuthError, sessionCookie, signInWithPassword } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string; password?: string };
    const session = await signInWithPassword(payload.email ?? "", payload.password ?? "");
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": sessionCookie(session.token, session.expiresAt) } },
    );
  } catch (error) {
    return Response.json(
      { error: isAuthError(error) ? error.message : "Не удалось войти" },
      { status: 400 },
    );
  }
}
