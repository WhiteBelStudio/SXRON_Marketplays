# Platform matrix

| Platform | Client | Backend | Release |
|---|---|---|---|
| Web | Next.js | Vercel | GitHub main |
| PWA | Next.js + Web Manifest | Vercel | GitHub main |
| Android | Expo/React Native | Same REST API | EAS |
| iOS | Expo/React Native | Same REST API | EAS |
| Windows | Tauri | Same REST API | Tauri bundle |
| macOS | Tauri | Same REST API | Tauri bundle |

Business logic stays server-side so all clients share the same users, catalog, orders, chat, favorites, reviews and moderation rules.
