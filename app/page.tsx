const categories = ["Электроника","Одежда","Дом","Авто","Красота","Хобби","Спорт","Услуги"];

export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <div className="brand"><span className="mark">S</span><span>SXRON</span><small>MARKETPLAYS</small></div>
        <nav><button>Войти</button><button className="primary">Разместить товар</button></nav>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">НОВОЕ ПОКОЛЕНИЕ МАРКЕТПЛЕЙСА</p>
          <h1>Покупай. Продавай.<br/><span>Развивай свой магазин.</span></h1>
          <p className="lead">Объявления как в классифайдах и полноценные магазины в одной платформе.</p>
          <div className="search"><span>⌕</span><input placeholder="Что ищете?" /><button>Найти</button></div>
        </div>
      </section>
      <section className="section">
        <div className="sectionHead"><h2>Категории</h2><span>Все категории →</span></div>
        <div className="categories">{categories.map(c=><button key={c}>{c}</button>)}</div>
      </section>
      <section className="section">
        <div className="sectionHead"><h2>Архитектура уже готова к росту</h2></div>
        <div className="cards">
          <article><b>🛍 Маркетплейс</b><p>Каталог, товары, корзина, заказы и магазины продавцов.</p></article>
          <article><b>📍 Объявления</b><p>Локальные продажи, фильтры, избранное и безопасные сделки.</p></article>
          <article><b>⚡ Единая платформа</b><p>Web, Android, iOS, Windows и macOS поверх общего ядра.</p></article>
        </div>
      </section>
    </main>
  );
}