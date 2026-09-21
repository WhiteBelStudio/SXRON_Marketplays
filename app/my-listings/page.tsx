"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Listing = {
  id: string; title: string; price: string | number; currency: string;
  status: string; city?: string | null; images?: { url: string }[];
};

const labels: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  sold: "Продано",
  archived: "В архиве",
  rejected: "Отклонено",
};

export default function MyListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/listings?mine=true&limit=50", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить объявления.");
      setItems(data.listings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Произошла ошибка.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function archive(id: string) {
    if (!confirm("Архивировать это объявление?")) return;
    const response = await fetch("/api/listings/" + id, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось архивировать объявление.");
      return;
    }
    await load();
  }

  return (
    <main className="shell">
      <header className="header">
        <Link className="brand" href="/"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></Link>
        <div className="detailActions"><Link className="secondaryButton" href="/listings">Каталог</Link><Link className="primaryButton smallButton" href="/sell">Новое объявление</Link></div>
      </header>
      <section className="catalogPage">
        <div className="sectionHead"><div><p className="eyebrow">ПРОФИЛЬ</p><h1>Мои объявления</h1></div></div>
        {error && <p className="error">{error}</p>}
        {loading ? <p className="muted">Загрузка...</p> : items.length === 0 ? (
          <div className="emptyState"><h2>У вас пока нет объявлений</h2><p>Создайте первое объявление и оно появится здесь.</p><Link className="primaryButton" href="/sell">Разместить товар</Link></div>
        ) : (
          <div className="listingGrid">
            {items.map(item => (
              <article className="listingCard" key={item.id}>
                <Link href={"/listings/" + item.id}>
                  <div className="listingImage">{item.images?.[0]?.url ? <img src={item.images[0].url} alt="" /> : <span>Без фото</span>}</div>
                  <div className="listingBody"><h3>{item.title}</h3><strong>{Number(item.price).toLocaleString("ru-RU")} {item.currency}</strong><p>{labels[item.status] || item.status}{item.city ? " · " + item.city : ""}</p></div>
                </Link>
                <div className="detailActions">
                  <Link className="secondaryButton" href={"/listings/" + item.id + "/edit"}>Изменить</Link>
                  {item.status !== "archived" && <button className="dangerButton" onClick={() => archive(item.id)}>Архив</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
