# SXRON MARKETPLAYS roadmap

The requested 16 foundations are now represented in the repository:
1 architecture
2 database schema
3 API layer
4 auth/session
5 users/roles
6 categories
7 listings/products
8 search/filtering
9 sellers
10 orders
11 chat
12 favorites
13 reviews
14 moderation
15 Web/PWA
16 Android/iOS/Windows/macOS client foundations

Next production hardening:
- connect Neon PostgreSQL and run the migration;
- add complete CRUD for listings, sellers and orders;
- add transactional order creation and inventory locking;
- add realtime chat/notifications;
- add object storage for listing images;
- build full web screens;
- configure EAS builds and Tauri CI releases;
- add automated tests and observability.
