# Kiosk Stores — Full Stack SaaS

A multi-store product catalog platform:

- **frontend/** — Next.js 14 (TypeScript/TSX) + Tailwind CSS + GSAP. Customer-facing storefront: login/register, product grid with search & category filters, product details page with an image/video gallery and size picker. Listens for live stock/price updates over Socket.io.
- **admin/** — React 18 (Vite) + Tailwind CSS. Admin login, dashboard, product list with inline stock editing, add/edit product forms with multi-image/video upload. Broadcasts changes over Socket.io.
- **backend/** — Node.js + Express + MongoDB (Mongoose) + Cloudinary (image/video storage) + Socket.io (real-time). JWT auth, role-based access (`admin` vs `customer`).

## Architecture

```
frontend (Next.js, :3000)   admin (React/Vite, :5173)
        │                            │
        └───────────┬────────────────┘
                     │ REST + Socket.io
                     ▼
            backend (Express, :5000)
                     │
        ┌────────────┼────────────────┐
        ▼            ▼                ▼
   MongoDB       Cloudinary        Socket.io
 (products,     (images/videos)   (live updates
  users)                          to both apps)
```

Every product has: **name, description/specification, price, category, overall stock balance, optional per-size stock (e.g. S/M/L or shoe sizes), and multiple images/videos** stored on Cloudinary. Products can optionally belong to a **Store** (kiosk), so this can grow into a multi-kiosk marketplace.

When an admin adds a product, edits it, or changes stock, the backend emits a Socket.io event (`product:created`, `product:updated`, `product:stockUpdated`, `product:deleted`). Both the storefront and the admin panel are subscribed, so everyone sees changes instantly with no page refresh.

## 1. Backend setup

```bash
cd backend
cp .env.example .env    # fill in MongoDB URI, JWT secret, Cloudinary keys
npm install
npm run seed             # creates admin@kiosk.com / Admin@123
npm run dev               # starts on http://localhost:5000
```

You need:
- A MongoDB connection string (MongoDB Atlas free tier works fine) → `MONGO_URI`
- A free Cloudinary account → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Any long random string → `JWT_SECRET`

## 2. Admin panel setup

```bash
cd admin
cp .env.example .env    # points at the backend API + socket URL
npm install
npm run dev               # starts on http://localhost:5173
```

Log in with the seeded admin account (`admin@kiosk.com` / `Admin@123`), then use **Add Product** to create your first listing with photos/videos, price, category, stock, and sizes.

## 3. Customer frontend setup

```bash
cd frontend
cp .env.example .env    # points at the backend API + socket URL
npm install
npm run dev               # starts on http://localhost:3000
```

Customers can register/login and browse the storefront. Product details (full description, gallery, size picker) are gated behind login, matching the flow you described; the grid itself is public so people can browse before signing in.

## API summary

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a customer account |
| POST | `/api/auth/login` | Public | Login (customer or admin) |
| GET | `/api/auth/me` | Auth | Current user profile |
| GET | `/api/products` | Public | List products (`?search=&category=&page=&limit=`) |
| GET | `/api/products/:id` | Public | Product details |
| GET | `/api/products/categories` | Public | Distinct category list |
| POST | `/api/products/upload` | Admin | Upload images/videos to Cloudinary, returns media array |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| PATCH | `/api/products/:id/stock` | Admin | Quick stock update (drives live badges) |
| DELETE | `/api/products/:id` | Admin | Delete product (also removes Cloudinary media) |
| GET/POST/PUT/DELETE | `/api/stores` | Public/Admin | Manage kiosk stores |

## Socket.io events

Emitted by the backend, consumed by both `frontend` and `admin`:
- `product:created`
- `product:updated`
- `product:stockUpdated`
- `product:deleted`
- `store:created` / `store:updated` / `store:deleted`

## Notes & next steps

- Passwords are hashed with bcrypt; JWTs expire per `JWT_EXPIRES_IN` in `.env`.
- Multer streams uploads directly to Cloudinary (`multer-storage-cloudinary`) — nothing touches your server's disk.
- To deploy: host `backend` on something like Render/Railway, `frontend` on Vercel, `admin` on Vercel/Netlify, and point the `.env` files at the deployed backend URL.
- Suggested next additions: cart/checkout flow, order model, per-store admin roles, image reordering, pagination controls in the UI.
