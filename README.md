# QR DineFlow

Production-ready restaurant QR ordering system, now split for deployment:

- [frontend_web](/d:/QR%20scan/frontend_web) for Vercel
- [backend](/d:/QR%20scan/backend) for Render

Detailed split setup is in [SPLIT_DEPLOYMENT.md](/d:/QR%20scan/SPLIT_DEPLOYMENT.md).

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
backend/
  src/server.js
  models/
  scripts/
  validations/
frontend_web/
  app/
  components/
  lib/
```

## Deploy Targets

- Vercel: [frontend_web](/d:/QR%20scan/frontend_web)
- Render: [backend](/d:/QR%20scan/backend)

## Local Development

1. Install dependencies:

```bash
cd backend
npm install
cd ..\frontend_web
npm install
```

2. Create env files from:

```bash
backend/.env.example
frontend_web/.env.example
```

3. Start MongoDB locally.

4. Seed demo data:

```bash
cd backend
npm run seed
```

5. Start the backend and frontend:

```bash
cd backend
npm run dev

cd ..\frontend_web
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

## Deployment

- Render backend config is in [render.yaml](/d:/QR%20scan/render.yaml)
- Vercel frontend root directory should be `frontend_web`
- Full env and deploy steps are in [SPLIT_DEPLOYMENT.md](/d:/QR%20scan/SPLIT_DEPLOYMENT.md)
