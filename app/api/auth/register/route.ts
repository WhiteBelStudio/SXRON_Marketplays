import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const username = String(body.username ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? username).trim();
    const password = String(body.password ?? "");

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
    }
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "Username: 3–32 символа, только латинские буквы, цифры и _." },
        { status: 400 },
      );
    }
    if (displayName.length < 2 || displayName.length > 80) {
      return NextResponse.json({ error: "Имя должно содержать от 2 до 80 символов." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Пароль должен содержать от 8 до 128 символов." }, { status: 400 });
    }

    const exists = await db.query(
      "SELECT 1 FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($2) LIMIT 1",
      [email, username],
    );
    if (exists.rowCount) {
      return NextResponse.json({ error: "Email или username уже занят." }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const created = await db.query(
      `INSERT INTO users (email,password_hash,username,display_name)
       VALUES ($1,$2,$3,$4)
       RETURNING id,email,username,display_name,avatar_url,role,is_blocked,created_at`,
      [email, hash, username, displayName],
    );

    await createSession(created.rows[0].id);
    return NextResponse.json({ user: created.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ошибка регистрации." }, { status: 500 });
  }
}
