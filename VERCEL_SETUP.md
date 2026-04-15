# Vercel Auto-Deployment Setup Guide

## Issue: Auto-deployment not working on new commits

### Solution Steps:

#### 1. **Verify GitHub Connection to Vercel**
- Go to https://vercel.com/dashboard
- Click on your project
- Go to Settings → Git
- Make sure your GitHub repo is connected
- If not connected, click "Connect Git Repository"

#### 2. **Configure Root Directory**
Since your frontend is in `frontend_web/` subdirectory:

- Go to Settings → General
- Under "Root Directory", set it to: `frontend_web`
- Click Save

#### 3. **Set Environment Variables**
Go to Settings → Environment Variables and add:

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend-url.onrender.com
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

#### 4. **Build & Development Settings**
Go to Settings → Build & Development:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

#### 5. **Enable Auto-Deployment**
- Go to Settings → Git
- Under "Deploy on push", make sure it's enabled
- Deployments branch: `main` (or your default branch)

#### 6. **Test Deployment**
Make a small commit and push:
```bash
git add .
git commit -m "Test Vercel deployment"
git push origin main
```

You should see the deployment start automatically in the Vercel dashboard.

#### 7. **Alternative: Manual Deploy**
If auto-deploy still doesn't work:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend_web directory
cd frontend_web
vercel --prod
```

## Troubleshooting

### If deployment fails:
1. Check Vercel Deployment logs for errors
2. Verify all environment variables are set
3. Ensure `.next` folder exists locally with `npm run build`
4. Check that `package.json` scripts are correct:
   - `"build": "next build --webpack"`
   - `"start": "next start"`

### If build is slow:
- Vercel uses cached dependencies - wait for first build to complete
- Check build logs for any warnings

## Current Configuration

**vercel.json** is intentionally minimal.
- Do not use custom `builds` or `routes` for this project
- Set `frontend_web` as the Vercel Root Directory in the dashboard
- Configure environment variables in Vercel Project Settings instead of `vercel.json`

**next.config.mjs** optimized with:
- Webpack configuration for module fallbacks
- Image remotePatterns for Cloudinary
- Turbopack and Webpack support

Push changes and check Vercel dashboard in 2-3 minutes for auto-deployment!
