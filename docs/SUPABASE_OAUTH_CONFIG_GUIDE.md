# Todo #3: Configure Supabase for Google OAuth

## 📋 What We're Doing

Configuring both Supabase projects (dev + prod) to:
1. Disable email confirmation (users can sign in immediately)
2. Enable Google OAuth provider
3. Add Google Client ID and Secret
4. Configure CORS for your frontend

---

## 🚀 Step-by-Step Instructions

### For Development Project (minerva-dev)

#### Step 1: Disable Email Confirmation

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **`minerva-dev`** project
3. Go to **"Authentication"** → **"Settings"** (left sidebar)
4. Scroll down to **"Email Auth"** section
5. Find **"Enable email confirmations"**
6. **Toggle it OFF** (disable email confirmation)
7. Click **"Save"** at the bottom

#### Step 2: Enable Google OAuth Provider

1. Still in **"Authentication"** → **"Providers"** (left sidebar)
2. Find **"Google"** in the list of providers
3. Click **"Google"** to expand it
4. Toggle **"Enable Google provider"** to **ON**
5. Fill in:
   - **Client ID (for OAuth):** Paste your Google Client ID
     - Example: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - **Client Secret (for OAuth):** Paste your Google Client Secret
     - Example: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
6. Click **"Save"** at the bottom

#### Step 3: Configure CORS (Optional - May Not Be Visible)

**Note:** CORS settings may not be visible in all Supabase projects. If you can't find it, that's okay - Supabase handles CORS automatically for most cases.

**If CORS section exists:**
1. Go to **"Settings"** → **"API"** (left sidebar)
2. Scroll down to look for **"CORS"** or **"Allowed Origins"** section
3. If found, add your frontend URL: `http://localhost:3001`
4. Click **"Save"**

**If you can't find CORS:**
- Don't worry! Supabase's client library handles CORS automatically
- The redirect URLs you added in Step 2 are more important
- We can test and add CORS later if needed

---

### For Production Project (minerva-prod)

Repeat the same steps for your production project:

#### Step 1: Disable Email Confirmation

1. Select your **`minerva-prod`** project
2. Go to **"Authentication"** → **"Settings"**
3. Toggle **"Enable email confirmations"** to **OFF**
4. Click **"Save"**

#### Step 2: Enable Google OAuth Provider

1. Go to **"Authentication"** → **"Providers"**
2. Click **"Google"**
3. Toggle **"Enable Google provider"** to **ON**
4. Fill in the **same** Client ID and Client Secret (same credentials work for both)
5. Click **"Save"**

#### Step 3: Configure CORS (Optional - May Not Be Visible)

**If CORS section exists:**
1. Go to **"Settings"** → **"API"**
2. Look for **"CORS"** or **"Allowed Origins"** section
3. If found, add your production frontend URL: `https://yourdomain.com`
4. Click **"Save"**

**If you can't find CORS:**
- That's fine! Supabase handles CORS automatically
- Focus on the redirect URLs instead

---

## ✅ Checklist

### Development Project (minerva-dev):
- [ ] Email confirmation disabled
- [ ] Google OAuth provider enabled
- [ ] Client ID added
- [ ] Client Secret added
- [ ] CORS configured (localhost:3001)

### Production Project (minerva-prod):
- [ ] Email confirmation disabled
- [ ] Google OAuth provider enabled
- [ ] Client ID added
- [ ] Client Secret added
- [ ] CORS configured (production domain)

---

## 🎯 What Happens Next

After configuration:
- Users can click "Sign in with Google" on your login page
- They'll be redirected to Google for authentication
- After Google auth, they'll be redirected back to your app
- Supabase will create a user account automatically
- User will get a JWT token for authentication

---

## 🔍 Testing

Once configured, you can test:
1. Go to your login page
2. Click "Sign in with Google"
3. You should be redirected to Google
4. After signing in, you'll be redirected back
5. Check Supabase Dashboard → Authentication → Users to see the new user

---

## ⚠️ Important Notes

1. **Same credentials for both projects:**
   - You can use the same Google Client ID and Secret for both dev and prod
   - The redirect URIs we configured earlier handle the routing

2. **Email confirmation:**
   - We're disabling it so users can sign in immediately
   - No email verification needed for Google OAuth

3. **CORS:**
   - Make sure your frontend URL is added to CORS
   - Without it, you might get CORS errors when calling Supabase from your frontend

---

## 🚀 Next Steps

After completing this configuration:
- We'll move to Todo #4: Create database schema
- Then we'll install dependencies and start coding!

---

**Ready?** Go ahead and configure both Supabase projects, then let me know when you're done!

