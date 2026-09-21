import { createPasswordReset, isAuthError } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { email?: string };
    const url = new URL(request.url);
    const result = await createPasswordReset(payload.email ?? "", url.origin);
    return Response.json({
      ok: true,
      resetUrl: result.resetUrl,
      message: "Если пользователь найден, ссылка восстановления создана.",
    });
  } catch (error) {
    return Response.json(
      { error: isAuthError(error) ? error.message : "Не удалось создать ссылку восстановления" },
      { status: 400 },
    );
  }
}
