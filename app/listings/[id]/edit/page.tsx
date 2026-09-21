"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Listing = { id:string; title:string; description:string; price:string|number; currency:string; quantity:number; city?:string|null; condition?:string|null; type:string; category_id?:string|null; images?:{url:string}[] };

export default function EditListingPage() {
  const params=useParams();
  const router=useRouter();
  const id=String(params.id||"");
  const [listing,setListing]=useState<Listing|null>(null);
  const [form,setForm]=useState({title:"",description:"",price:"",currency:"RUB",quantity:"1",city:"",condition:"",type:"product"});
  const [images,setImages]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{ fetch("/api/listings/"+id).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Не удалось открыть товар.");setListing(d.listing);setForm({title:d.listing.title,description:d.listing.description,price:String(d.listing.price),currency:d.listing.currency,quantity:String(d.listing.quantity),city:d.listing.city||"",condition:d.listing.condition||"",type:d.listing.type});setImages((d.listing.images||[]).map((x:{url:string})=>x.url));}).catch(e=>setError(e.message));},[id]);

  async function save(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/listings/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,price:Number(form.price),quantity:Number(form.quantity),images:images.filter(Boolean)})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Не удалось сохранить.");router.push("/listings/"+id);}catch(e){setError(e instanceof Error?e.message:"Ошибка сохранения.");}finally{setBusy(false);}}
  async function archive(){if(!confirm("Архивировать это объявление?"))return;setBusy(true);const r=await fetch("/api/listings/"+id,{method:"DELETE"});if(r.ok)router.push("/listings");else{const d=await r.json();setError(d.error||"Не удалось архивировать.");setBusy(false);}}

  if(error&&!listing)return <main className="shell"><div className="emptyState"><h1>Ошибка</h1><p>{error}</p><Link href="/listings">В каталог</Link></div></main>;
  if(!listing)return <main className="shell"><p className="muted">Загрузка...</p></main>;

  return <main className="shell"><header className="header"><Link className="brand" href="/"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></Link><Link href={"/listings/"+id}>К товару</Link></header><section className="formPage"><p className="eyebrow">УПРАВЛЕНИЕ ТОВАРОМ</p><h1>Редактировать</h1><form className="listingForm" onSubmit={save}><label>Название<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Описание<textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="formGrid"><label>Цена<input required type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Количество<input required type="number" min="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label><label>Город<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>Состояние<input value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}/></label></div><div><div className="fieldTitle">Фотографии по URL</div>{images.map((url,i)=><div className="imageInput" key={i}><input type="url" value={url} onChange={e=>setImages(images.map((v,n)=>n===i?e.target.value:v))}/><button type="button" className="iconButton" onClick={()=>setImages(images.filter((_,n)=>n!==i))}>×</button></div>)}{images.length<10&&<button type="button" className="secondaryButton" onClick={()=>setImages([...images,""])}>+ Добавить фото</button>}</div>{error&&<p className="error">{error}</p>}<div className="detailActions"><button className="primaryButton" disabled={busy}>{busy?"Сохраняем...":"Сохранить изменения"}</button><button type="button" className="dangerButton" disabled={busy} onClick={archive}>Архивировать</button></div></form></section></main>;
}
