# Todo #1: Supabase Projects Setup Guide

## 📋 What We're Doing

Creating **TWO Supabase projects**:
1. **Development project** (`minerva-dev`) - for localhost testing
2. **Production project** (`minerva-prod`) - for production deployment

Both will use the **free tier** (50,000 MAUs, 500MB database each).

---

## 🚀 Step-by-Step Instructions

### Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"**
3. Sign up with:
   - GitHub account (recommended), or
   - Email address
4. Verify your email if needed

### Step 2: Create Development Project

1. In Supabase dashboard, click **"New Project"**
2. Fill in the form:
   - **Name:** `minerva-dev`
   - **Database Password:** Create a strong password (save it somewhere safe!)
   - **Region:** Choose closest to you (e.g., `US East (North Virginia)`)
   - **Pricing Plan:** Select **"Free"** tier
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize

### Step 3: Get Development Project API Keys

Once the project is ready:

1. In the left sidebar, click **"Settings"** (gear icon)
2. Click **"API"** in the settings menu
3. You'll see:
   - **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Keep this secret!)

4. **Copy these values** - we'll need them later:
   - Project URL
   - anon public key
   - service_role key

### Step 4: Create Production Project

1. In Supabase dashboard, click **"New Project"** again
2. Fill in the form:
   - **Name:** `minerva-prod`
   - **Database Password:** Create a different strong password (save it!)
   - **Region:** Choose closest to your production server
   - **Pricing Plan:** Select **"Free"** tier
3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize

### Step 5: Get Production Project API Keys

1. Select the `minerva-prod` project
2. Go to **Settings → API**
3. Copy the same values:
   - Project URL
   - anon public key
   - service_role key

---

## 📝 Information We Need

After completing the setup, please provide:

### Development Project:
```
DEV_SUPABASE_URL=https://[your-dev-project-id].supabase.co
DEV_SUPABASE_ANON_KEY=[your-dev-anon-key]
DEV_SUPABASE_SERVICE_ROLE_KEY=[your-dev-service-role-key]
```

### Production Project:
```
PROD_SUPABASE_URL=https://[your-prod-project-id].supabase.co
PROD_SUPABASE_ANON_KEY=[your-prod-anon-key]
PROD_SUPABASE_SERVICE_ROLE_KEY=[your-prod-service-role-key]
```

---

## ⚠️ Important Notes

1. **Keep service_role keys SECRET** - Never commit them to git or expose in frontend
2. **Save database passwords** - You'll need them for direct database access
3. **Free tier limits:**
   - 50,000 monthly active users per project
   - 500MB database storage per project
   - 2GB file storage per project
   - Should be plenty for development and initial production!

---

## ✅ Checklist

- [ ] Created Supabase account
- [ ] Created `minerva-dev` project
- [ ] Got dev project API keys (URL, anon key, service_role key)
- [ ] Created `minerva-prod` project
- [ ] Got prod project API keys (URL, anon key, service_role key)
- [ ] Saved all keys securely (we'll add them to .env files next)

---

## 🎯 Next Steps

Once you have all the keys, we'll:
1. Add them to `.env` files (with `.env.example` templates)
2. Move to Todo #2: Google OAuth setup

---

**Ready?** Go ahead and create the projects, then share the keys when ready (or we can add them directly to .env files if you prefer).


