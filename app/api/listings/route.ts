import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type ListingInput = {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  quantity?: unknown;
  city?: unknown;
  condition?: unknown;
  category_id?: unknown;
  type?: unknown;
  status?: unknown;
  images?: unknown;
};

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return slug || "listing";
}

async function uniqueSlug(title: string) {
  const base = slugify(title);
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const found = await db.query("SELECT 1 FROM listings WHERE slug=$1 LIMIT 1", [candidate]);
    if (!found.rowCount) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function validateCategory(categoryId: string) {
  const result = await db.query(
    "SELECT c.id, EXISTS(SELECT 1 FROM categories child WHERE child.parent_id=c.id AND child.is_active=true) AS has_children FROM categories c WHERE c.id=$1 AND c.is_active=true LIMIT 1",
    [categoryId],
  );
  const category = result.rows[0];
  if (!category) return { ok: false, error: "Категория не найдена или отключена." };
  if (category.has_children) return { ok: false, error: "Выберите подкатегорию, а не основную категорию." };
  return { ok: true };
}

function parseInput(body: ListingInput) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const categoryId = String(body.category_id ?? "").trim();
  const currency = String(body.currency ?? "RUB").trim().toUpperCase();
  const city = String(body.city ?? "").trim();
  const condition = String(body.condition ?? "").trim();
  const type = String(body.type ?? "product").trim();
  const status = String(body.status ?? "draft").trim();
  const price = Number(body.price);
  const quantity = Number(body.quantity ?? 1);

  if (title.length < 3 || title.length > 140) return { error: "Название должно содержать от 3 до 140 символов." };
  if (description.length < 10 || description.length > 10000) return { error: "Описание должно содержать от 10 до 10000 символов." };
  if (!Number.isFinite(price) || price < 0 || price > 9999999999) return { error: "Некорректная цена." };
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) return { error: "Некорректное количество." };
  if (!categoryId) return { error: "Выберите подкатегорию." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Валюта должна быть в формате ISO 4217." };
  if (city.length > 120) return { error: "Город слишком длинный." };
  if (condition.length > 80) return { error: "Состояние указано некорректно." };
  if (!["product", "classified"].includes(type)) return { error: "Некорректный тип объявления." };
  if (!["draft", "published"].includes(status)) return { error: "Некорректный статус объявления." };

  const rawImages = Array.isArray(body.images) ? body.images : [];
  const images = rawImages
    .map((item) => String(item ?? "").trim())
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, 10);

  return { title, description, categoryId, currency, city: city || null, condition: condition || null, type, status, price, quantity, images };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "true";
  const user = mine ? await getCurrentUser() : null;
  if (mine && (!user || user.is_blocked)) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });

  try {
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (mine) {
      values.push(user!.id);
      conditions.push(`l.owner_id=$${values.length}`);
    } else {
      conditions.push("l.status='published'");
    }

    const q = (url.searchParams.get("q") || url.searchParams.get("query") || "").trim();
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`(l.title ILIKE $${values.length} OR l.description ILIKE $${values.length} OR COALESCE(l.city,'') ILIKE $${values.length} OR COALESCE(c.name,'') ILIKE $${values.length})`);
    }

    const category = url.searchParams.get("category");
    if (category) {
      values.push(category);
      conditions.push(`(c.id=$${values.length} OR c.parent_id=$${values.length})`);
    }

    const city = url.searchParams.get("city");
    if (city) {
      values.push(city);
      conditions.push(`l.city ILIKE $${values.length}`);
    }

    const minPrice = url.searchParams.get("minPrice");
    if (minPrice && Number.isFinite(Number(minPrice))) {
      values.push(Number(minPrice));
      conditions.push(`l.price >= $${values.length}`);
    }

    const maxPrice = url.searchParams.get("maxPrice");
    if (maxPrice && Number.isFinite(Number(maxPrice))) {
      values.push(Number(maxPrice));
      conditions.push(`l.price <= $${values.length}`);
    }

    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 24), 1), 50);
    values.push(limit);
    const limitParameter = values.length;

    const result = await db.query(
      `SELECT l.id,l.title,l.slug,l.description,l.price,l.currency,l.quantity,l.city,l.condition,l.type,l.status,l.category_id,l.owner_id,l.seller_id,l.created_at,l.updated_at,
              c.name AS category,c.slug AS category_slug,s.store_name AS seller,
              COALESCE((SELECT json_agg(json_build_object('id',li.id,'url',li.url,'sort_order',li.sort_order) ORDER BY li.sort_order,li.id) FROM listing_images li WHERE li.listing_id=l.id),'[]'::json) AS images
       FROM listings l
       LEFT JOIN categories c ON c.id=l.category_id
       LEFT JOIN sellers s ON s.id=l.seller_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY l.is_featured DESC,l.created_at DESC
       LIMIT $${limitParameter}`,
      values,
    );

    return NextResponse.json({ listings: result.rows });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить объявления." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });

  try {
    const parsed = parseInput(await request.json() as ListingInput);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const category = await validateCategory(parsed.categoryId);
    if (!category.ok) return NextResponse.json({ error: category.error }, { status: 400 });

    const sellerResult = await db.query("SELECT id FROM sellers WHERE user_id=$1 LIMIT 1", [user.id]);
    const sellerId = sellerResult.rows[0]?.id ?? null;
    const slug = await uniqueSlug(parsed.title);

    const result = await db.query(
      "INSERT INTO listings (seller_id,category_id,owner_id,type,title,slug,description,price,currency,quantity,city,condition,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,title,slug,description,price,currency,quantity,city,condition,type,status,category_id,owner_id,seller_id,created_at,updated_at",
      [sellerId, parsed.categoryId, user.id, parsed.type, parsed.title, slug, parsed.description, parsed.price, parsed.currency, parsed.quantity, parsed.city, parsed.condition, parsed.status],
    );

    const listing = result.rows[0];
    if (parsed.images.length) {
      await db.query(
        "INSERT INTO listing_images (listing_id,url,sort_order) SELECT $1,url,ord-1 FROM unnest($2::text[]) WITH ORDINALITY AS t(url,ord)",
        [listing.id, parsed.images],
      );
    }

    return NextResponse.json({ listing: { ...listing, images: parsed.images } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось создать объявление." }, { status: 500 });
  }
}
