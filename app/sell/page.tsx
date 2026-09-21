"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; slug: string; parent_id: string | null; children?: Category[] };

export default function SellPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentId, setParentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", currency: "RUB", quantity: "1", city: "", condition: "", type: "product" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(data => setCategories(data.categories || [])).catch(() => setError("Не удалось загрузить категории."));
  }, []);

  const selectedParent = categories.find(c => c.id === parentId);
  const leaves = selectedParent?.children || [];

  function update(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    if (images.length + files.length > 10) { setError("Можно добавить не более 10 фотографий."); return; }
    setUploading(true); setError("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData(); body.append("file", file);
        const response = await fetch("/api/listings/upload", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Не удалось загрузить фотографию.");
        uploaded.push(data.url);
      }
      setImages(prev => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки фотографии.");
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price), quantity: Number(form.quantity), category_id: categoryId, images, status: "published" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось разместить объявление.");
      router.push("/listings/" + data.listing.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Произошла ошибка."); }
    finally { setBusy(false); }
  }

  return (
    <main className="shell">
      <header className="header"><a className="brand" href="/"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></a><div className="detailActions"><a className="secondaryButton" href="/my-listings">Мои объявления</a><a className="ghostButton" href="/listings">Каталог</a></div></header>
      <section className="formPage">
        <div className="sectionHead"><div><p className="eyebrow">ПРОДАЖА</p><h1>Разместить товар</h1></div></div>
        <form className="listingForm" onSubmit={submit}>
          <label>Название<input required minLength={3} maxLength={140} value={form.title} onChange={e => update("title", e.target.value)} placeholder="Например, iPhone 15" /></label>
          <label>Описание<textarea required minLength={10} maxLength={10000} value={form.description} onChange={e => update("description", e.target.value)} placeholder="Опишите товар..." /></label>
          <div className="formGrid">
            <label>Категория<select required value={parentId} onChange={e => { setParentId(e.target.value); setCategoryId(""); }}><option value="">Выберите раздел</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Подкатегория<select required value={categoryId} disabled={!parentId} onChange={e => setCategoryId(e.target.value)}><option value="">Выберите подкатегорию</option>{leaves.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Цена<input required type="number" min="0" step="0.01" value={form.price} onChange={e => update("price", e.target.value)} /></label>
            <label>Количество<input required type="number" min="0" value={form.quantity} onChange={e => update("quantity", e.target.value)} /></label>
            <label>Город<input maxLength={120} value={form.city} onChange={e => update("city", e.target.value)} /></label>
            <label>Состояние<input maxLength={80} value={form.condition} onChange={e => update("condition", e.target.value)} placeholder="Новое, б/у..." /></label>
          </div>
          <label>Тип<select value={form.type} onChange={e => update("type", e.target.value)}><option value="product">Товар</option><option value="classified">Объявление</option></select></label>
          <div>
            <div className="fieldTitle">Фотографии</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={e => uploadFiles(e.target.files)} />
            <button type="button" className="secondaryButton" disabled={uploading || images.length >= 10} onClick={() => fileRef.current?.click()}>{uploading ? "Загрузка..." : "📷 Выбрать фотографии"}</button>
            <div className="listingGrid" style={{ marginTop: 16 }}>
              {images.map((url, index) => <div className="listingCard" key={url}><div className="listingImage"><img src={url} alt="" /></div><div className="listingBody"><button type="button" className="dangerButton" onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}>Удалить</button></div></div>)}
            </div>
            <p className="muted">До 10 изображений, каждое до 8 МБ.</p>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="primaryButton" disabled={busy || uploading}>{busy ? "Публикуем..." : "Опубликовать товар"}</button>
        </form>
      </section>
    </main>
  );
}
