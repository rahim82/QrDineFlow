# QR DineFlow

This repo now also includes a split deployment structure:

- [frontend_web](/d:/QR%20scan/frontend_web) for Vercel
- [backend](/d:/QR%20scan/backend) for Render

Use [SPLIT_DEPLOYMENT.md](/d:/QR%20scan/SPLIT_DEPLOYMENT.md) for the separate frontend/backend setup. The rest of this README reflects the older single-app structure.

Production-ready full-stack restaurant QR ordering system built with Next.js 16.2.1, Tailwind CSS 4.2.2, MongoDB, and Socket.io.

## Features

- Smart menu with categories, images, stock states, and dynamic happy-hour pricing
- QR-based table journeys that open a menu for the exact restaurant table
- Digital billing with split billing metadata and downloadable PDF invoices
- Pay-at-table billing flow with real-time order updates
- Real-time order notifications for restaurant operations and live customer order updates
- Admin and manager dashboards with sales, top items, peak hours, and table performance
- JWT login for admin and manager roles with password or Google
- Modular REST APIs and MongoDB schemas built for multi-restaurant scaling

## Tech Stack

- Next.js 16.2.1
- Tailwind CSS 4.2.2
- React 19
- MongoDB + Mongoose
- Socket.io
- Recharts

## Folder Structure

```text
app/
  api/
    analytics/summary
    auth/login
    menu
    orders
    payments
    seed
    tables/qr
  admin/dashboard
  manager/dashboard
  menu/[restaurantId]/[tableNumber]
  (marketing)/login
components/
  dashboard/
  menu/
  providers/
  shared/
lib/
  auth.ts
  billing.ts
  data.ts
  db.ts
  env.ts
  pdf.ts
  pricing.ts
  socket.ts
  validations/
models/
  MenuItem.ts
  Order.ts
  Payment.ts
  Restaurant.ts
  Table.ts
  User.ts
scripts/
  seed.ts
types/
```

## API Routes

- `POST /api/auth/login` login with password and set JWT cookie
- `GET /api/auth/google` start Google login
- `GET /api/auth/google/callback` finish Google login and set JWT cookie
- `GET /api/menu?restaurantId=<id>&hideUnavailable=true` list menu items
- `POST /api/menu` create menu items
- `PATCH /api/menu/:id` update menu items or availability
- `GET /api/orders?restaurantId=<id>` list orders
- `POST /api/orders` create order, bill, and payment record
- `PATCH /api/orders/:id` update order status
- `GET /api/orders/:id/bill` download PDF bill
- `GET /api/analytics/summary?restaurantId=<id>` fetch analytics summary
- `GET /api/tables/qr?restaurantSlug=<slug>&tableNumber=<number>` generate QR payload
- `POST /api/seed` seed sample data

## MongoDB Collections

- `users`: admin and manager accounts
- `restaurants`: restaurant records and manager linkage
- `tables`: table inventory and QR targets
- `menuitems`: menu catalog, stock flags, pricing rules
- `orders`: placed orders, bill totals, split billing
- `payments`: payment lifecycle records

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
copy .env.example .env.local
```

3. Start MongoDB locally.

4. Seed demo data:

```bash
npm run seed
```

5. Start the app:

```bash
npm run dev
```

6. Open `http://localhost:3000`

## Demo Credentials

- Admin: `admin@demo.com` / `password123`
- Manager: `manager@demo.com` / `password123`

## Menu Image Uploads

- MongoDB should store only the image URL, not the image binary.
- For direct menu image uploads, configure Cloudinary with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Managers can either paste an image URL or upload an image from the dashboard.
- Uploaded files go to Cloudinary, and the returned secure URL is stored in MongoDB.

## Production Notes

- Put Next.js behind a process manager like PM2 or systemd and run `node server.js`
- Store JWT secret and third-party service secrets in a real secret manager
- Add role checks around protected routes before deployment
- Add webhooks for payment reconciliation and kitchen printer integrations as needed

## Render Deployment

1. Push this project to GitHub.
2. Create a new `Web Service` on Render and connect the repo.
3. Render can auto-detect [render.yaml](/d:/QR%20scan/render.yaml), or use these values manually:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

4. Add these environment variables in Render:

```text
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-render-service.onrender.com
MONGODB_URI=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

5. After the first deploy, update `NEXT_PUBLIC_APP_URL` to your final Render URL if needed and redeploy.

6. Seed your production database only if you really want demo data. Do not seed production if it already has live data.

## Reduce Render Free Cold Starts

- Render free web services sleep after inactivity, so the first request may show a loading page while the app wakes up.
- This cannot be fully removed from inside the app on the free plan.
- To reduce it, ping this endpoint every 5-10 minutes from an external uptime monitor or cron service:

```text
https://your-render-service.onrender.com/api/health
```

- If you want the loading page gone reliably, move to a paid always-on plan.
