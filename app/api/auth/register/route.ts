import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const username = String(body.username ?? "").trim();
    const displayName = String(body.displayName ?? username).trim();
    const password = String(body.password ?? "");

    if (!email || !username || password.length < 8) {
      return NextResponse.json({ error: "Некорректные данные. Пароль — минимум 8 символов." }, { status: 400 });
    }

    const exists = await db.query("SELECT 1 FROM users WHERE email=$1 OR username=$2 LIMIT 1", [email, username]);
    if (exists.rowCount) return NextResponse.json({ error: "Email или username уже занят." }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const created = await db.query(
      "INSERT INTO users (email,password_hash,username,display_name) VALUES ($1,$2,$3,$4) RETURNING id,email,username,display_name,role",
      [email, hash, username, displayName],
    );
    await createSession(created.rows[0].id);
    return NextResponse.json({ user: created.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ошибка регистрации." }, { status: 500 });
  }
}
