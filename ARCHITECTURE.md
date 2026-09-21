# SXRON MARKETPLAYS — Architecture

## Product
Unified marketplace + classifieds platform:
- marketplace catalog and seller stores;
- individual listings;
- search and filters;
- favorites, orders, chat, reviews;
- moderation and administration;
- responsive Web/PWA;
- Android/iOS via Expo;
- Windows/macOS via Tauri.

## Runtime architecture

Browser/PWA -> Next.js Web -> REST API -> PostgreSQL
                                  -> Object Storage
                                  -> Realtime/notifications (future)

Android/iOS -> Expo client -> same API
Windows/macOS -> Tauri shell -> same Web client/API

The business rules live in the API/database layer rather than in a platform-specific client.

## Repository
```
app/                         # Next.js web application
  api/                       # REST API route handlers
  login/                     # authentication UI
  register/
  catalog/
  listing/
  seller/
  orders/
  chat/
  favorites/
  profile/
  moderation/
components/                  # reusable web UI
lib/                         # DB, auth, validation, shared server helpers
db/migrations/               # PostgreSQL schema
public/                      # PWA assets/manifest
apps/
  mobile/                    # Expo Android/iOS/web client
  desktop/                   # Tauri Windows/macOS shell
docs/                        # product/API documentation
```

## Core domains
Auth, Users, Categories, Listings, Sellers, Orders, Chat, Favorites, Reviews, Moderation.

## Security
- password hashes only; never store plaintext passwords;
- httpOnly session cookies;
- server-side authorization;
- role checks for seller/admin operations;
- input validation;
- report/block support;
- secrets only through environment variables.

## Deployment
- Web: Vercel, GitHub `main` -> Production.
- Database: PostgreSQL/Neon.
- Mobile: Expo/EAS.
- Desktop: Tauri builds for Windows/macOS.
