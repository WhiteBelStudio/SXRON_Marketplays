"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Listing = { id: string; title: string; price: string | number; currency: string; city?: string | null; condition?: string | null; images?: { url: string }[] };

export default function ListingsPage() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(value = query) {
    setLoading(true);
    const response = await fetch("/api/listings" + (value ? "?q=" + encodeURIComponent(value) : ""));
    const data = await response.json();
    setListings(data.listings || []);
    setLoading(false);
  }

  useEffect(() => { load(params.get("q") || ""); }, [params]);

  function submit(event: FormEvent) {
    event.preventDefault();
    load();
  }

  return (
    <main className="shell">
      <header className="header"><Link className="brand" href="/"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></Link><Link className="primaryButton smallButton" href="/sell">Разместить товар</Link></header>
      <section className="catalogPage">
        <div className="sectionHead"><div><p className="eyebrow">КАТАЛОГ</p><h1>Товары и объявления</h1></div></div>
        <form className="catalogSearch" onSubmit={submit}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Что ищете?" /><button className="primaryButton">Найти</button></form>
        {loading ? <p className="muted">Загрузка...</p> : listings.length === 0 ? <div className="emptyState"><h2>Пока ничего не найдено</h2><p>Попробуйте изменить запрос или разместите первое объявление.</p><Link className="primaryButton" href="/sell">Разместить товар</Link></div> : <div className="listingGrid">{listings.map(item => <Link className="listingCard" href={"/listings/" + item.id} key={item.id}><div className="listingImage">{item.images?.[0]?.url ? <img src={item.images[0].url} alt="" /> : <span>Без фото</span>}</div><div className="listingBody"><h3>{item.title}</h3><strong>{Number(item.price).toLocaleString("ru-RU")} {item.currency}</strong><p>{item.city || "Город не указан"}{item.condition ? " · " + item.condition : ""}</p></div></Link>)}</div>}
      </section>
    </main>
  );
}
