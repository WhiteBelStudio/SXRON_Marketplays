import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.is_blocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const orderId = String(body.orderId ?? "");
    const rating = Number(body.rating);
    const text = String(body.text ?? "").trim();

    if (!UUID_RE.test(orderId)) {
      return NextResponse.json({ error: "Некорректный orderId." }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Оценка должна быть целым числом от 1 до 5." },
        { status: 400 },
      );
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { error: "Текст отзыва не должен превышать 2000 символов." },
        { status: 400 },
      );
    }

    const orderResult = await db.query(
      `SELECT o.id, o.seller_id, oi.listing_id
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND o.buyer_id = $2 AND o.status = 'completed'
       LIMIT 1`,
      [orderId, user.id],
    );
    const order = orderResult.rows[0];

    if (!order) {
      return NextResponse.json(
        { error: "Отзыв можно оставить только по завершённому своему заказу." },
        { status: 403 },
      );
    }
    if (!order.seller_id) {
      return NextResponse.json(
        { error: "У заказа отсутствует продавец." },
        { status: 409 },
      );
    }

    const duplicate = await db.query(
      "SELECT 1 FROM reviews WHERE order_id = $1 AND author_id = $2 LIMIT 1",
      [orderId, user.id],
    );
    if (duplicate.rows[0]) {
      return NextResponse.json(
        { error: "Отзыв по этому заказу уже оставлен." },
        { status: 409 },
      );
    }

    const review = await db.query(
      `INSERT INTO reviews
         (order_id, author_id, seller_id, listing_id, rating, text)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, user.id, order.seller_id, order.listing_id, rating, text || null],
    );

    await db.query(
      `UPDATE sellers
       SET review_count = review_count + 1,
           rating = ROUND(((rating * review_count) + $1) / (review_count + 1), 2)
       WHERE id = $2`,
      [rating, order.seller_id],
    );

    return NextResponse.json({ review: review.rows[0] }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { error: "Отзыв по этому заказу уже оставлен." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Не удалось создать отзыв." }, { status: 500 });
  }
}
