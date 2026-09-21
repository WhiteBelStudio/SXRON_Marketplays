import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Файл не выбран." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Разрешены JPG, PNG, WEBP и GIF." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_SIZE) return NextResponse.json({ error: "Размер изображения должен быть от 1 байта до 8 МБ." }, { status: 400 });

    const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const safeName = `listings/${user.id}/${crypto.randomUUID()}.${extension}`;
    const blob = await put(safeName, file, { access: "public", addRandomSuffix: false });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить изображение." }, { status: 500 });
  }
}
