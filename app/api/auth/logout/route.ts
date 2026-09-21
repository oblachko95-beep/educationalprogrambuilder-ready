import { cookies } from "next/headers";
import { deleteCurrentSession, expiredSessionCookie, SESSION_COOKIE_NAME } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  await deleteCurrentSession(token);
  const returnTo = safeRelativeReturnPath(new URL(request.url).searchParams.get("return_to") ?? "/login");
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(returnTo, request.url).toString(),
      "Set-Cookie": expiredSessionCookie(),
    },
  });
}

function safeRelativeReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/login";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/login";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/login";
  }
}
