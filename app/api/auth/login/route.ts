import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const result = await db.query("SELECT * FROM users WHERE email=$1 LIMIT 1", [email]);
  const user = result.rows[0];
  if (!user || user.is_blocked || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ user: { id:user.id,email:user.email,username:user.username,displayName:user.display_name,role:user.role } });
}
