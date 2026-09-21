import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const DISPLAY_NAME_MAX = 80;
const AVATAR_MAX = 2048;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });

  const result = await db.query(
    `SELECT id,email,username,display_name,avatar_url,role,is_blocked,created_at,updated_at
     FROM users WHERE id=$1 LIMIT 1`,
    [user.id],
  );

  return NextResponse.json({ user: result.rows[0] ?? null });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });

  try {
    const body = await request.json();
    const displayName = body.displayName === undefined ? undefined : String(body.displayName).trim();
    const avatarUrl =
      body.avatarUrl === null ? null :
      body.avatarUrl === undefined ? undefined :
      String(body.avatarUrl).trim();

    if (displayName !== undefined && (displayName.length < 2 || displayName.length > DISPLAY_NAME_MAX)) {
      return NextResponse.json({ error: "Имя должно содержать от 2 до 80 символов." }, { status: 400 });
    }
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl.length > AVATAR_MAX) {
      return NextResponse.json({ error: "Ссылка на аватар слишком длинная." }, { status: 400 });
    }
    if (avatarUrl !== undefined && avatarUrl !== null && !/^https?:\/\//i.test(avatarUrl)) {
      return NextResponse.json({ error: "Аватар должен быть HTTP(S)-ссылкой." }, { status: 400 });
    }
    if (displayName === undefined && avatarUrl === undefined) {
      return NextResponse.json({ error: "Нет данных для изменения." }, { status: 400 });
    }

    const result = await db.query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           avatar_url = CASE WHEN $2::boolean THEN $3 ELSE avatar_url END,
           updated_at = now()
       WHERE id=$4
       RETURNING id,email,username,display_name,avatar_url,role,is_blocked,created_at,updated_at`,
      [displayName ?? null, avatarUrl !== undefined, avatarUrl ?? null, user.id],
    );

    return NextResponse.json({ user: result.rows[0] ?? null });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить профиль." }, { status: 500 });
  }
}
