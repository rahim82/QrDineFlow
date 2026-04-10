# Split Deployment Guide

## Apps

- [frontend_web](/d:/QR%20scan/frontend_web)
  Next.js frontend for Vercel
- [backend](/d:/QR%20scan/backend)
  Express + MongoDB + Socket.io backend for Render

## What stays the same

- same login/register UI
- same manager/admin dashboards
- same customer QR menu flow
- same client-side `/api/*` fetch usage in the UI

The frontend now proxies browser `/api/*` requests to the backend through [route.js](/d:/QR%20scan/frontend_web/app/api/%5B...path%5D/route.js), and server-rendered dashboard pages fetch backend data directly through [data.js](/d:/QR%20scan/frontend_web/lib/data.js).

## Local setup

### Backend

1. Open [backend](/d:/QR%20scan/backend)
2. Install deps
```bash
npm install
```
3. Copy [backend/.env.example](/d:/QR%20scan/backend/.env.example) to `.env.local`
4. Start MongoDB
5. Seed data
```bash
npm run seed
```
6. Start backend
```bash
npm run dev
```

Backend envs:
```env
MONGODB_URI=...
JWT_SECRET=...
FRONTEND_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Frontend

1. Open [frontend_web](/d:/QR%20scan/frontend_web)
2. Install deps
```bash
npm install
```
3. Copy [frontend_web/.env.example](/d:/QR%20scan/frontend_web/.env.example) to `.env.local`
4. Start frontend
```bash
npm run dev
```

Frontend envs:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
JWT_SECRET=the-same-secret-as-backend
```

## Deploy

### Render

- root Render config is [render.yaml](/d:/QR%20scan/render.yaml)
- service root directory is `backend`
- set:
```env
MONGODB_URI=...
JWT_SECRET=...
FRONTEND_APP_URL=https://your-vercel-app.vercel.app
BACKEND_URL=https://your-render-api.onrender.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Vercel

- set project root directory to `frontend_web`
- set:
```env
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
API_BASE_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-render-api.onrender.com
JWT_SECRET=the-same-secret-as-backend
```

Google OAuth callback URIs:

- local: `http://localhost:3000/api/auth/google/callback`
- production: `https://your-vercel-app.vercel.app/api/auth/google/callback`

## Validation status

- frontend build verified successfully in [frontend_web](/d:/QR%20scan/frontend_web)
- backend server syntax checked successfully in [backend/src/server.js](/d:/QR%20scan/backend/src/server.js)
