import { getDb } from "@/db";
import { authUsers, userProfiles, authSessions } from "@/db/schema";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email: string; password: string; displayName: string; requestedRole: string };
    const { email, password, displayName, requestedRole } = body;

    if (!email || !password || password.length < 8) {
      return Response.json({ error: "Некорректные данные" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    
    const adminEmails = (process.env.INITIAL_ADMIN_EMAIL || "").split(",").map(e => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(email.toLowerCase());
    const role = isAdmin ? "admin" : "author";

    await db.insert(authUsers).values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName || email,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(userProfiles).values({
      userId,
      displayName: displayName || email,
      email: email.toLowerCase(),
      requestedRole: requestedRole || "author",
      role,
      actingRole: role,
      createdAt: now,
      updatedAt: now,
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = btoa(String.fromCharCode(...hashArray)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    await db.insert(authSessions).values({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    return Response.json({ 
      success: true, 
      token,
      user: { id: userId, email, displayName, role }
    }, { status: 201 });

  } catch (error) {
    console.error("Register error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Не удалось зарегистрироваться" },
      { status: 500 }
    );
  }
}
