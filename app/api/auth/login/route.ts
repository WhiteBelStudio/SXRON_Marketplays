import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!EMAIL_RE.test(email) || password.length < 1 || password.length > 128) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }

    const result = await db.query(
      "SELECT id,email,username,display_name,avatar_url,role,is_blocked FROM users WHERE lower(email)=lower($1) LIMIT 1",
      [email],
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }

    const passwordResult = await db.query(
      "SELECT password_hash FROM users WHERE id=$1 LIMIT 1",
      [user.id],
    );
    const valid = await bcrypt.compare(password, passwordResult.rows[0]?.password_hash ?? "");

    if (!valid || user.is_blocked) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ user: { ...user, displayName: user.display_name } });
  } catch {
    return NextResponse.json({ error: "Ошибка входа." }, { status: 500 });
  }
}
