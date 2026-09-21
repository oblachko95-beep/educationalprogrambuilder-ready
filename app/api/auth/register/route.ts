import { isAuthError, registerWithPassword, sessionCookie } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      email?: string;
      password?: string;
      displayName?: string;
      requestedRole?: "author" | "reviewer" | "admin";
    };
    const session = await registerWithPassword({
      email: payload.email ?? "",
      password: payload.password ?? "",
      displayName: payload.displayName ?? "",
      requestedRole: payload.requestedRole ?? "author",
    });
    return Response.json(
      { ok: true },
      { status: 201, headers: { "Set-Cookie": sessionCookie(session.token, session.expiresAt) } },
    );
  } catch (error) {
    return Response.json(
      { error: isAuthError(error) ? error.message : "Не удалось зарегистрироваться" },
      { status: 400 },
    );
  }
}
