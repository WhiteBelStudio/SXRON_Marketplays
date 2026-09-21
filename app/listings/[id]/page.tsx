"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Listing = { id: string; title: string; description: string; price: string | number; currency: string; quantity: number; city?: string | null; condition?: string | null; owner_id: string; images?: { url: string; sort_order: number }[]; seller?: { username?: string; display_name?: string } | null };

export default function ListingPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/listings/" + id).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Товар не найден."); setListing(data.listing); }).catch(e => setError(e.message)); }, [id]);

  if (error) return <main className="shell"><div className="emptyState"><h1>Не удалось открыть объявление</h1><p>{error}</p><Link href="/listings">Вернуться в каталог</Link></div></main>;
  if (!listing) return <main className="shell"><p className="muted">Загрузка...</p></main>;

  return <main className="shell"><header className="header"><Link className="brand" href="/"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></Link><Link href="/listings">Каталог</Link></header><section className="detailPage"><div className="gallery">{listing.images?.length ? listing.images.map((image, i) => <img key={image.url + i} src={image.url} alt="" />) : <div className="galleryEmpty">Без фото</div>}</div><article className="detailInfo"><p className="eyebrow">ОБЪЯВЛЕНИЕ</p><h1>{listing.title}</h1><div className="detailPrice">{Number(listing.price).toLocaleString("ru-RU")} {listing.currency}</div><p className="detailDescription">{listing.description}</p><div className="detailMeta"><span>Количество: {listing.quantity}</span>{listing.city && <span>Город: {listing.city}</span>}{listing.condition && <span>Состояние: {listing.condition}</span>}</div><div className="detailActions"><button className="primaryButton">Связаться с продавцом</button><Link className="secondaryButton" href="/listings">Назад</Link></div></article></section></main>;
}
