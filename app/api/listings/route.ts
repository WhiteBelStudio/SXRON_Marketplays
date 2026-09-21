import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category");
  const city = url.searchParams.get("city");
  const min = Number(url.searchParams.get("min") ?? 0);
  const max = Number(url.searchParams.get("max") ?? Number.MAX_SAFE_INTEGER);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 24), 50);

  const values: unknown[] = [];
  const where = ["l.status='published'"];
  if (q) { values.push(q); where.push(`to_tsvector('simple', l.title || ' ' || l.description) @@ plainto_tsquery('simple',$${values.length})`); }
  if (category) { values.push(category); where.push(`c.slug=$${values.length}`); }
  if (city) { values.push(city); where.push(`l.city=$${values.length}`); }
  values.push(min); where.push(`l.price >= $${values.length}`);
  values.push(max); where.push(`l.price <= $${values.length}`);
  values.push(limit);

  const result = await db.query(
    `SELECT l.id,l.title,l.slug,l.description,l.price,l.currency,l.city,l.condition,l.created_at,
            c.name AS category, s.store_name AS seller
     FROM listings l
     LEFT JOIN categories c ON c.id=l.category_id
     LEFT JOIN sellers s ON s.id=l.seller_id
     WHERE ${where.join(" AND ")}
     ORDER BY l.is_featured DESC,l.created_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return NextResponse.json({ listings: result.rows });
}
