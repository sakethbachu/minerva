# Deployment Guide for Minerva

This guide covers hosting options for your Minerva application, which consists of:
- **Node.js/Express backend** (port 3001)
- **Python FastAPI service** (port 8000)
- **Static frontend** (public/)
- **Supabase** (authentication & database)

---

## Quick Comparison

| Platform | Free Tier | Ease of Setup | Best For |
|----------|-----------|---------------|----------|
| **Railway** | ✅ 500 hrs/month | ⭐⭐⭐⭐⭐ | Easiest dual-service deployment |
| **Render** | ✅ (spins down) | ⭐⭐⭐⭐ | Simple, good free tier |
| **Fly.io** | ✅ Generous | ⭐⭐⭐ | Global edge deployment |
| **DigitalOcean** | ❌ | ⭐⭐⭐⭐ | Production-ready, managed |
| **Vercel + Railway** | ✅ | ⭐⭐⭐⭐ | Best frontend + backend split |

---

## Option 1: Railway (Recommended) 🚂

### Why Railway?
- **Easiest dual-service setup** - Deploy both services in one project
- **Internal networking** - Services can communicate via private URLs
- **Environment variables** - Easy secret management
- **Automatic HTTPS** - SSL certificates included
- **Free tier** - 500 hours/month ($5 credit)

### Setup Steps

#### 1. Prepare Your Services

Create `railway.json` in project root:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 2. Deploy Node.js Service

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository
4. Railway will auto-detect Node.js
5. Set environment variables:
   ```
   PORT=3001
   NUM_QUESTIONS=3
   NUM_ANSWERS=4
   OPENAI_API_KEY=your_key
   PYTHON_SERVICE_URL=https://your-python-service.railway.app
   ```

#### 3. Deploy Python Service

1. In the same Railway project, click "New Service"
2. Select "GitHub Repo" → same repo
3. Set root directory to `python-service`
4. Railway will auto-detect Python
5. Set environment variables:
   ```
   PORT=8000
   GEMINI_API_KEY=your_key
   TAVILY_API_KEY=your_key
   LOG_LEVEL=INFO
   ```
6. Railway will generate a URL like `https://python-service-production.up.railway.app`

#### 4. Update Express Server

Update `src/server.ts` to use Railway's Python service URL:

```typescript
// Replace localhost:8000 with environment variable
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// In submit-answers endpoint:
const searchResponse = await fetch(`${PYTHON_SERVICE_URL}/api/search`, {
  // ... rest of code
});
```

#### 5. Deploy Static Files

Railway will serve files from `public/` automatically via Express static middleware.

### Railway Pricing
- **Free**: $5 credit/month (500 hours)
- **Hobby**: $5/month per service (unlimited hours)
- **Pro**: $20/month per service (better performance)

---

## Option 2: Render 🎨

### Why Render?
- **Free tier available** - Good for testing
- **Simple setup** - Web-based deployment
- **Auto-deploy** - Deploys on git push

### Setup Steps

#### 1. Deploy Python Service

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: `minerva-python-service`
   - **Environment**: Python 3
   - **Build Command**: `cd python-service && pip install -r requirements.txt`
   - **Start Command**: `cd python-service && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `python-service`
5. Set environment variables (same as Railway)
6. Render will generate a URL like `https://minerva-python-service.onrender.com`

#### 2. Deploy Node.js Service

1. Create another "Web Service"
2. Configure:
   - **Name**: `minerva-backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `/` (root)
3. Set environment variables:
   ```
   PORT=3001
   PYTHON_SERVICE_URL=https://minerva-python-service.onrender.com
   OPENAI_API_KEY=your_key
   ```

### Render Pricing
- **Free**: Spins down after 15 min inactivity (slow cold starts)
- **Starter**: $7/month per service (always on)

---

## Option 3: Fly.io ✈️

### Why Fly.io?
- **Global edge** - Deploys close to users
- **Generous free tier** - 3 shared VMs
- **Fast cold starts** - Better than Render free tier

### Setup Steps

#### 1. Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

#### 2. Create `fly.toml` for Python Service

Create `python-service/fly.toml`:
```toml
app = "minerva-python"
primary_region = "iad"

[build]

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  protocol = "tcp"
  internal_port = 8000
```

#### 3. Deploy Python Service
```bash
cd python-service
fly launch
fly secrets set GEMINI_API_KEY=your_key TAVILY_API_KEY=your_key
fly deploy
```

#### 4. Deploy Node.js Service

Create `fly.toml` in root:
```toml
app = "minerva-backend"
primary_region = "iad"

[build]

[http_service]
  internal_port = 3001
  force_https = true

[[services]]
  protocol = "tcp"
  internal_port = 3001
```

Deploy:
```bash
fly launch
fly secrets set PYTHON_SERVICE_URL=https://minerva-python.fly.dev OPENAI_API_KEY=your_key
fly deploy
```

### Fly.io Pricing
- **Free**: 3 shared VMs, 160GB outbound data
- **Paid**: ~$1.94/month per VM (always on)

---

## Option 4: Vercel (Frontend) + Railway (Backend) 🎯

### Why This Combo?
- **Vercel** excels at static frontend hosting
- **Railway** handles backend services well
- **Best performance** for frontend

### Setup Steps

#### 1. Deploy Backend Services to Railway
Follow Railway setup above.

#### 2. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Configure:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty, frontend is static)
   - **Output Directory**: `public`
4. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

#### 3. Update Frontend API Calls

Update `public/app.js` to use environment variable:
```javascript
const API_URL = window.API_URL || 'https://your-backend.railway.app';
```

### Pricing
- **Vercel**: Free tier (generous)
- **Railway**: $5/month per service

---

## Option 5: DigitalOcean App Platform 🐳

### Why DigitalOcean?
- **Production-ready** - Managed platform
- **Database included** - Can add managed PostgreSQL
- **Simple pricing** - Predictable costs

### Setup Steps

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create two components:
   - **Component 1**: Python service
     - Source: GitHub
     - Type: Web Service
     - Build Command: `cd python-service && pip install -r requirements.txt`
     - Run Command: `cd python-service && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Component 2**: Node.js service
     - Source: GitHub
     - Type: Web Service
     - Build Command: `npm install && npm run build`
     - Run Command: `npm start`

### Pricing
- **Basic**: $5/month per service
- **Professional**: $12/month per service

---

## Environment Variables Checklist

Set these in your hosting platform:

### Node.js Service
```bash
PORT=3001
NUM_QUESTIONS=3
NUM_ANSWERS=4
OPENAI_API_KEY=your_openai_key
PYTHON_SERVICE_URL=https://your-python-service-url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Python Service
```bash
PORT=8000
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
LOG_LEVEL=INFO
```

---

## Pre-Deployment Checklist

- [ ] Update `src/server.ts` to use `PYTHON_SERVICE_URL` env var instead of hardcoded `localhost:8000`
- [ ] Test both services locally with environment variables
- [ ] Ensure `.env` is in `.gitignore` (never commit secrets!)
- [ ] Set up Supabase project and get credentials
- [ ] Configure CORS to allow your frontend domain
- [ ] Test API endpoints after deployment
- [ ] Set up monitoring/health checks

---

## Recommended: Railway Setup

For the easiest deployment experience, I recommend **Railway**:

1. ✅ Deploy both services in one project
2. ✅ Internal networking (services can talk to each other)
3. ✅ Simple environment variable management
4. ✅ Automatic HTTPS
5. ✅ Free tier to get started

Would you like me to:
1. Create Railway-specific configuration files?
2. Update your code to use environment variables for service URLs?
3. Create a deployment script?

---

## Troubleshooting

### Services Can't Communicate
- Check that `PYTHON_SERVICE_URL` is set correctly
- Verify the Python service is running (check `/health` endpoint)
- Check CORS settings in Python service

### Environment Variables Not Working
- Ensure variables are set in hosting platform (not just `.env`)
- Restart services after adding new variables
- Check variable names match exactly (case-sensitive)

### Static Files Not Serving
- Verify `public/` directory is included in deployment
- Check Express static middleware configuration
- Ensure build process includes public files

---

## Next Steps

1. Choose a hosting platform
2. Set up environment variables
3. Deploy Python service first
4. Deploy Node.js service with Python service URL
5. Test endpoints
6. Configure custom domain (optional)

Need help with a specific platform? Let me know!


