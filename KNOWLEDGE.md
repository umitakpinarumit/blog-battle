# Blog Battle – Knowledge Log

## Amaç ve Kapsam
- Kullanıcılar blog yazısı gönderir; yazılar ikili eşleşir, oylama ile kazanan üst tura çıkar.
- Roller: Yazar (kayıt, yazı ekle, bildirim), Okuyucu (okuma, giriş sonrası oy).
- Frontend: React + TailwindCSS + Redux Toolkit; mobil swipe; animasyonlu sonuç.
- Backend: Node.js + Express + MongoDB; JWT auth; Post CRUD; eşleşme ve oy; bracket ilerleme.

## Mimari ve Teknoloji Kararları
- Paket yöneticisi: npm (varsayılan, ek kurulum gerektirmez)
- Veritabanı: Yerel MongoDB Community (Docker zorunlu değil)
- Dil/Çatı: TypeScript, Express, Mongoose
- Gerçek zaman: İlk sürüm SSE; gerekirse Socket.IO
- Doğrulama: zod; Güvenlik: JWT, bcrypt, CORS, rate limit (ilerleyen aşama)

## Dizin Yapısı (özet)
```
blog-battle/
  apps/
    server/ (Express + TS)
    client/ (Vite React TS + Tailwind + RTK)
```

## Uç Noktalar (taslak)
- Auth: POST /auth/register, POST /auth/login, GET /auth/me
- Post: GET/POST/PUT/DELETE /posts, POST /posts/:id/image
- Match: GET /matches/active, GET /matches/:id, POST /matches
- Vote: POST /votes { matchId, choice }
- Real-time: GET /matches/:id/stream (SSE)

## Adım Günlüğü
- 1) Proje klasörleri oluşturuldu: blog-battle/apps/{server,client}
- 2) Client: Vite React TS iskeleti kuruldu; paketler eklendi (Router, RTK, axios, RHF, zod, framer-motion, react-swipeable)
- 3) Client: Tailwind konfigürasyonu manuel eklendi (postcss.config.js, tailwind.config.ts, index.css direktifleri)
- 4) Server: Express TS iskeleti kuruldu; app.ts, index.ts, mongoose.ts eklendi; scripts: dev/build/start
- 5) Docker yerine yerel MongoDB Community kullanılmasına karar verildi
- 6) Gündem: Yerel MongoDB kur, .env ayarla, API’yi DB’ye bağla
\- 7) MongoDB Community kuruldu ve servis Running; API bağlandı ("MongoDB connected")
\- 8) Backend uçları: Auth (register/login/me), Posts (CRUD + upload), Matches (create/list/get/stream/finish), Votes (tek oy kuralı)
\- 9) SSE yayını eklendi: GET /matches/:id/stream
\- 10) Seed script ile 1 kullanıcı, 4 yazı, 2 aktif eşleşme yüklendi
\- 11) Port yönetimi: Geçici 5001 denemesi → kalıcı 5000’e geri dönüş; çakışma temizlendi
\- 12) Frontend iskeleti: Vite React TS + RTK store + Router; `VITE_API_URL` env (çalıştırma sırasında terminalden aktarım)
\- 13) Vote sonrası SSE yayını aggregate ile yüzdeleri hesaplayıp yayınlar (vote.controller)
\- 14) Create Post: react-hook-form + zod doğrulama, başarıda `/profile` yönlendirme
\- 15) Profile: `/auth/me` ile kullanıcı bilgisi ve `authorId` filtreli gönderiler listesi
\- 16) Backend `/posts` listesinde `authorId` query desteği
\- 17) README oluşturuldu; kurulum/çalıştırma/test adımları ve API özeti eklendi

## Çalıştırma
- Backend (5000):
```
cd apps/server
npm run dev
```
- Frontend (5173):
```
cd apps/client
set VITE_API_URL=http://localhost:5000 && npm run dev
```

## Ortam Değişkenleri (server/.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/blog_battle
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
JWT_SECRET=change_me
```

## Notlar
- Teslimde README’de kurulum talimatları, seed verisi (4 yazı, 2 eşleşme), test akışı yer alacak.

