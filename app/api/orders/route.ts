import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  try {
    const result = await db.query(
      `SELECT o.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'listingId', oi.listing_id,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unit_price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.buyer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [user.id],
    );

    return NextResponse.json({ orders: result.rows });
  } catch {
    return NextResponse.json({ error: "Не удалось загрузить заказы." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const listingId = String(body.listingId ?? "");
    const quantity = Number(body.quantity ?? 1);
    const shippingAddress = body.shippingAddress ?? null;

    if (!UUID_RE.test(listingId)) {
      return NextResponse.json({ error: "Некорректный listingId." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      return NextResponse.json({ error: "Некорректное количество." }, { status: 400 });
    }
    if (
      shippingAddress !== null &&
      (typeof shippingAddress !== "object" || Array.isArray(shippingAddress))
    ) {
      return NextResponse.json(
        { error: "shippingAddress должен быть объектом." },
        { status: 400 },
      );
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const listingResult = await client.query(
        `SELECT id, owner_id, seller_id, price, currency, quantity, status
         FROM listings
         WHERE id = $1
         FOR UPDATE`,
        [listingId],
      );
      const listing = listingResult.rows[0];

      if (!listing || listing.status !== "published") {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Опубликованное объявление не найдено." },
          { status: 404 },
        );
      }

      if (listing.owner_id === user.id) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Нельзя оформить заказ на собственное объявление." },
          { status: 400 },
        );
      }

      if (listing.quantity < quantity) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Недостаточно товара в наличии." },
          { status: 409 },
        );
      }

      const total = Number(listing.price) * quantity;

      const orderResult = await client.query(
        `INSERT INTO orders
           (buyer_id, seller_id, status, total_amount, currency, shipping_address)
         VALUES ($1, $2, 'pending', $3, $4, $5)
         RETURNING *`,
        [user.id, listing.seller_id, total, listing.currency, shippingAddress],
      );

      await client.query(
        `INSERT INTO order_items (order_id, listing_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderResult.rows[0].id, listingId, quantity, listing.price],
      );

      await client.query(
        "UPDATE listings SET quantity = quantity - $1, updated_at = now() WHERE id = $2",
        [quantity, listingId],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        { order: orderResult.rows[0] },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json({ error: "Не удалось создать заказ." }, { status: 500 });
  }
}
