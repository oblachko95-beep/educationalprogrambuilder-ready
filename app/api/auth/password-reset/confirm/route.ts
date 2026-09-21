import { isAuthError, resetPassword, sessionCookie } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { token?: string; password?: string };
    const session = await resetPassword(payload.token ?? "", payload.password ?? "");
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": sessionCookie(session.token, session.expiresAt) } },
    );
  } catch (error) {
    return Response.json(
      { error: isAuthError(error) ? error.message : "Не удалось изменить пароль" },
      { status: 400 },
    );
  }
}
