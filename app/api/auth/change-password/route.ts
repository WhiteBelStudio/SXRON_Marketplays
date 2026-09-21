import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { destroyAllUserSessions, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userResult = await db.query(
      "SELECT id,password_hash,is_blocked FROM users WHERE id=(SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at > now() LIMIT 1) LIMIT 1",
      [],
    );

    // The active user is resolved through the shared auth helper below.
    const { getCurrentUser, hashToken } = await import("@/lib/auth");
    const user = await getCurrentUser();
    if (!user || user.is_blocked) {
      return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
    }

    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: "Новый пароль должен содержать от 8 до 128 символов." }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "Новый пароль должен отличаться от текущего." }, { status: 400 });
    }

    const passwordResult = await db.query("SELECT password_hash FROM users WHERE id=$1 LIMIT 1", [user.id]);
    const valid = await bcrypt.compare(currentPassword, passwordResult.rows[0]?.password_hash ?? "");
    if (!valid) {
      return NextResponse.json({ error: "Текущий пароль указан неверно." }, { status: 401 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2", [hash, user.id]);

    await destroyAllUserSessions(user.id);
    await createSession(user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось изменить пароль." }, { status: 500 });
  }
}
