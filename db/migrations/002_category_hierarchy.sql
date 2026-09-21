-- Category hierarchy for marketplace navigation and listing creation.
-- Safe to run more than once.

WITH roots(name, slug, sort_order) AS (
  VALUES
    ('Электроника','electronics',1),
    ('Одежда','clothing',2),
    ('Дом и сад','home',3),
    ('Авто','auto',4),
    ('Красота','beauty',5),
    ('Хобби','hobby',6),
    ('Спорт','sport',7),
    ('Услуги','services',8)
)
INSERT INTO categories (name, slug, sort_order)
SELECT name, slug, sort_order
FROM roots
ON CONFLICT (slug) DO UPDATE
SET name=EXCLUDED.name,
    sort_order=EXCLUDED.sort_order,
    is_active=true;

WITH children(parent_slug, name, slug, sort_order) AS (
  VALUES
    ('electronics','Смартфоны','smartphones',1),
    ('electronics','Планшеты','tablets',2),
    ('electronics','Ноутбуки','laptops',3),
    ('electronics','Компьютеры','computers',4),
    ('electronics','Комплектующие','pc-components',5),
    ('electronics','Наушники и аудио','audio',6),
    ('electronics','Телевизоры','tv',7),
    ('electronics','Аксессуары','electronics-accessories',8),

    ('clothing','Мужская одежда','mens-clothing',1),
    ('clothing','Женская одежда','womens-clothing',2),
    ('clothing','Детская одежда','kids-clothing',3),
    ('clothing','Обувь','shoes',4),
    ('clothing','Верхняя одежда','outerwear',5),
    ('clothing','Аксессуары','clothing-accessories',6),

    ('home','Мебель','furniture',1),
    ('home','Бытовая техника','appliances',2),
    ('home','Посуда','dishes',3),
    ('home','Декор','decor',4),
    ('home','Инструменты','tools',5),
    ('home','Сад и дача','garden',6),

    ('auto','Автомобили','cars',1),
    ('auto','Запчасти','auto-parts',2),
    ('auto','Колёса и шины','wheels-tires',3),
    ('auto','Аксессуары','auto-accessories',4),
    ('auto','Расходники','consumables',5),

    ('beauty','Косметика','cosmetics',1),
    ('beauty','Парфюмерия','perfumery',2),
    ('beauty','Уход','care',3),
    ('beauty','Аксессуары','beauty-accessories',4),

    ('hobby','Игры','games',1),
    ('hobby','Игровые приставки','consoles',2),
    ('hobby','Книги','books',3),
    ('hobby','Музыка','music',4),
    ('hobby','Коллекционирование','collecting',5),

    ('sport','Фитнес','fitness',1),
    ('sport','Велосипеды','bicycles',2),
    ('sport','Спортивная одежда','sportswear',3),
    ('sport','Инвентарь','sports-equipment',4),
    ('sport','Туризм','tourism',5),

    ('services','Ремонт','repair',1),
    ('services','Дизайн','design',2),
    ('services','IT','it',3),
    ('services','Фото и видео','photo-video',4),
    ('services','Доставка','delivery',5),
    ('services','Другое','other-services',6)
)
INSERT INTO categories (parent_id, name, slug, sort_order)
SELECT p.id, c.name, c.slug, c.sort_order
FROM children c
JOIN categories p ON p.slug=c.parent_slug
ON CONFLICT (slug) DO UPDATE
SET parent_id=EXCLUDED.parent_id,
    name=EXCLUDED.name,
    sort_order=EXCLUDED.sort_order,
    is_active=true;

CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id);
