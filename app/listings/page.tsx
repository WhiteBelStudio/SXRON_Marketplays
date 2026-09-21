"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Category={id:string;name:string;parent_id:string|null;children?:Category[]};
type Listing={id:string;title:string;price:string|number;currency:string;city?:string|null;condition?:string|null;type?:string;images?:{url:string}[]};
const CONDITIONS=["Новый","Как новый","Хорошее","Удовлетворительное","Требует ремонта"];

export default function ListingsPage(){
  const [query,setQuery]=useState(""); const [city,setCity]=useState(""); const [category,setCategory]=useState("");
  const [condition,setCondition]=useState(""); const [minPrice,setMinPrice]=useState(""); const [maxPrice,setMaxPrice]=useState("");
  const [type,setType]=useState(""); const [sort,setSort]=useState("recent"); const [categories,setCategories]=useState<Category[]>([]);
  const [listings,setListings]=useState<Listing[]>([]); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const subcategories=useMemo(()=>categories.flatMap(parent=>(parent.children||[]).map(child=>({...child,parentName:parent.name}))),[categories]);

  useEffect(()=>{fetch("/api/categories").then(r=>r.json()).then(d=>setCategories(d.categories||[])).catch(()=>{});},[]);
  async function load(offset=0){
    setLoading(true); setError("");
    try{
      const params=new URLSearchParams();
      if(query.trim()) params.set("q",query.trim()); if(category) params.set("category",category); if(city.trim()) params.set("city",city.trim());
      if(condition) params.set("condition",condition); if(minPrice.trim()) params.set("minPrice",minPrice.trim()); if(maxPrice.trim()) params.set("maxPrice",maxPrice.trim());
      if(type) params.set("type",type); if(sort!=="recent") params.set("sort",sort); params.set("limit","24"); params.set("offset",String(offset));
      const r=await fetch("/api/listings?"+params.toString(),{cache:"no-store"}); const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Не удалось загрузить объявления.");
      setListings(d.listings||[]); setTotal(Number(d.total||0)); window.history.replaceState(null,"","/listings?"+params.toString());
    }catch(e){setError(e instanceof Error?e.message:"Не удалось загрузить объявления.");}finally{setLoading(false);}
  }
  useEffect(()=>{load(0);},[]);
  function submit(e:FormEvent){e.preventDefault();load(0);}
  function clearFilters(){setQuery("");setCity("");setCategory("");setCondition("");setMinPrice("");setMaxPrice("");setType("");setSort("recent");setTimeout(()=>load(0),0);}

  return <main className="shell">
    <header className="header"><Link className="brand" href="/"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></Link><Link className="primaryButton smallButton" href="/sell">Разместить товар</Link></header>
    <section className="catalogPage">
      <div className="sectionHead"><div><p className="eyebrow">КАТАЛОГ</p><h1>Товары и объявления</h1><p className="muted">{total} найдено</p></div></div>
      <form className="catalogFilters" onSubmit={submit}>
        <div className="catalogSearch"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Что ищете? Например: iPhone 15"/><button className="primaryButton" type="submit">Найти</button></div>
        <div className="filterGrid">
          <select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Все категории</option>{subcategories.map(item=><option key={item.id} value={item.id}>{item.parentName} · {item.name}</option>)}</select>
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Город"/>
          <input type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Цена от"/>
          <input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Цена до"/>
          <select value={condition} onChange={e=>setCondition(e.target.value)}><option value="">Любое состояние</option>{CONDITIONS.map(item=><option key={item}>{item}</option>)}</select>
          <select value={type} onChange={e=>setType(e.target.value)}><option value="">Все типы</option><option value="product">Товар</option><option value="classified">Объявление</option></select>
          <select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Сначала новые</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option><option value="oldest">Сначала старые</option></select>
          <button className="secondaryButton" type="submit">Применить фильтры</button><button className="ghostButton" type="button" onClick={clearFilters}>Сбросить</button>
        </div>
      </form>
      {error?<div className="error">{error}</div>:loading?<p className="muted">Загрузка...</p>:listings.length===0?<div className="emptyState"><h2>Ничего не найдено</h2><p>Измените запрос или ослабьте фильтры.</p><button className="primaryButton" onClick={clearFilters}>Сбросить фильтры</button></div>:
      <><div className="listingGrid">{listings.map(item=><Link className="listingCard" href={"/listings/"+item.id} key={item.id}><div className="listingImage">{item.images?.[0]?.url?<img src={item.images[0].url} alt=""/>:<span>Без фото</span>}</div><div className="listingBody"><h3>{item.title}</h3><strong>{Number(item.price).toLocaleString("ru-RU")} {item.currency}</strong><p>{item.city||"Город не указан"}{item.condition?" · "+item.condition:""}</p></div></Link>)}</div>
      <div className="catalogFooter">{total>listings.length&&<button className="secondaryButton" onClick={()=>load(listings.length)}>Загрузить ещё</button>}<span className="muted">Показано {listings.length} из {total}</span></div></>}
    </section>
  </main>;
}
