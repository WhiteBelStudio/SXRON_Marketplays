import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

async function ownerListing(id: string, userId: string) {
  const result = await db.query(
    "SELECT id,title,slug,description,price,currency,quantity,city,condition,type,status,category_id,owner_id,seller_id FROM listings WHERE id=$1 AND owner_id=$2 LIMIT 1",
    [id, userId],
  );
  return result.rows[0] ?? null;
}

async function validLeafCategory(categoryId: string) {
  const result = await db.query(
    "SELECT c.id, EXISTS(SELECT 1 FROM categories child WHERE child.parent_id=c.id AND child.is_active=true) AS has_children FROM categories c WHERE c.id=$1 AND c.is_active=true LIMIT 1",
    [categoryId],
  );
  const row = result.rows[0];
  return Boolean(row) && !row.has_children;
}

async function listingImages(id: string) {
  const result = await db.query(
    "SELECT id,url,sort_order FROM listing_images WHERE listing_id=$1 ORDER BY sort_order,id",
    [id],
  );
  return result.rows;
}

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  try {
    const publicResult = await db.query(
      "SELECT l.id,l.title,l.slug,l.description,l.price,l.currency,l.quantity,l.city,l.condition,l.type,l.status,l.category_id,l.owner_id,l.seller_id,l.created_at,l.updated_at,c.name AS category,c.slug AS category_slug,s.store_name AS seller FROM listings l LEFT JOIN categories c ON c.id=l.category_id LEFT JOIN sellers s ON s.id=l.seller_id WHERE l.id=$1 AND l.status='published' LIMIT 1",
      [id],
    );
    let listing = publicResult.rows[0] ?? null;
    if (!listing) {
      const user = await getCurrentUser();
      if (user && !user.is_blocked) {
        const own = await db.query(
          "SELECT l.id,l.title,l.slug,l.description,l.price,l.currency,l.quantity,l.city,l.condition,l.type,l.status,l.category_id,l.owner_id,l.seller_id,l.created_at,l.updated_at,c.name AS category,c.slug AS category_slug,s.store_name AS seller FROM listings l LEFT JOIN categories c ON c.id=l.category_id LEFT JOIN sellers s ON s.id=l.seller_id WHERE l.id=$1 AND l.owner_id=$2 LIMIT 1",
          [id, user.id],
        );
        listing = own.rows[0] ?? null;
      }
    }
    if (!listing) return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });
    return NextResponse.json({ listing: { ...listing, images: await listingImages(id) } });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить объявление." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  const { id } = await context.params;
  try {
    const existing = await ownerListing(id, user.id);
    if (!existing) return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });
    const body = await request.json();
    const title = String(body.title ?? existing.title).trim();
    const description = String(body.description ?? existing.description).trim();
    const price = Number(body.price ?? existing.price);
    const quantity = Number(body.quantity ?? existing.quantity);
    const city = String(body.city ?? existing.city ?? "").trim() || null;
    const condition = String(body.condition ?? existing.condition ?? "").trim() || null;
    const categoryId = String(body.category_id ?? existing.category_id).trim();
    const currency = String(body.currency ?? existing.currency).trim().toUpperCase();
    const status = String(body.status ?? existing.status).trim();
    if (title.length < 3 || title.length > 140) return NextResponse.json({ error: "Название должно содержать от 3 до 140 символов." }, { status: 400 });
    if (description.length < 10 || description.length > 10000) return NextResponse.json({ error: "Описание должно содержать от 10 до 10000 символов." }, { status: 400 });
    if (!Number.isFinite(price) || price < 0 || price > 9999999999) return NextResponse.json({ error: "Некорректная цена." }, { status: 400 });
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) return NextResponse.json({ error: "Некорректное количество." }, { status: 400 });
    if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Валюта должна быть в формате ISO 4217." }, { status: 400 });
    if (city && city.length > 120) return NextResponse.json({ error: "Город слишком длинный." }, { status: 400 });
    if (condition && condition.length > 80) return NextResponse.json({ error: "Состояние указано некорректно." }, { status: 400 });
    if (!["draft", "published"].includes(status)) return NextResponse.json({ error: "Некорректный статус объявления." }, { status: 400 });
    if (!(await validLeafCategory(categoryId))) return NextResponse.json({ error: "Выберите активную подкатегорию." }, { status: 400 });

    const rawImages = Array.isArray(body.images) ? body.images : null;
    const images = rawImages
      ? rawImages.map((item: unknown) => String(item ?? "").trim()).filter((item: string) => /^https?:\/\//i.test(item)).slice(0, 10)
      : null;

    const result = await db.query(
      "UPDATE listings SET title=$1,description=$2,price=$3,currency=$4,quantity=$5,city=$6,condition=$7,category_id=$8,status=$9,updated_at=now() WHERE id=$10 AND owner_id=$11 RETURNING id,title,slug,description,price,currency,quantity,city,condition,type,status,category_id,owner_id,seller_id,created_at,updated_at",
      [title, description, price, currency, quantity, city, condition, categoryId, status, id, user.id],
    );

    if (images) {
      await db.query("DELETE FROM listing_images WHERE listing_id=$1", [id]);
      if (images.length) {
        await db.query(
          "INSERT INTO listing_images (listing_id,url,sort_order) SELECT $1,url,ord-1 FROM unnest($2::text[]) WITH ORDINALITY AS t(url,ord)",
          [id, images],
        );
      }
    }
    return NextResponse.json({ listing: result.rows[0], images: images ?? await listingImages(id) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить объявление." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  const { id } = await context.params;
  try {
    const result = await db.query("UPDATE listings SET status='archived',updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING id", [id, user.id]);
    if (!result.rows[0]) return NextResponse.json({ error: "Объявление не найдено." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить объявление." }, { status: 500 });
  }
}
