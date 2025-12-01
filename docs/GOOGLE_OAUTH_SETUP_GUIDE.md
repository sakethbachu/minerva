# Todo #2: Google OAuth Setup Guide

## 📋 What We're Doing

Setting up Google OAuth 2.0 credentials so users can sign in with their Google accounts through Supabase.

We need to:
1. Create a Google Cloud Console project
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure redirect URIs for both Supabase projects (dev + prod)
5. Get Client ID and Client Secret

---

## 🚀 Step-by-Step Instructions

### Step 1: Create Google Cloud Console Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top
4. Click **"New Project"**
5. Fill in:
   - **Project name:** `minerva-auth` (or any name you prefer)
   - **Organization:** (optional, leave as default)
   - **Location:** (optional, leave as default)
6. Click **"Create"**
7. Wait a few seconds, then select the new project from the dropdown

### Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"** (left sidebar)
2. Search for **"Google+ API"** or **"Google Identity Services API"**
3. Click on **"Google+ API"** or **"Google Identity Services API"**
4. Click **"Enable"**
5. Wait for it to enable (usually instant)

**Note:** Google+ API is being deprecated, but you can also use:
- **"Google Identity Services API"** (newer, recommended)
- Or just proceed - Supabase handles the OAuth flow

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"** (left sidebar)
2. Select **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name:** `Minerva` (or your app name)
   - **User support email:** Your email
   - **Developer contact information:** Your email
5. Click **"Save and Continue"**
6. On **"Scopes"** page: Click **"Save and Continue"** (default scopes are fine)
7. On **"Test users"** page: 
   - Add your email address (for testing)
   - Click **"Save and Continue"**
8. On **"Summary"** page: Click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"** as the application type
5. Fill in:
   - **Name:** `Minerva Supabase OAuth` (or any name)
   - **Authorized JavaScript origins:** (leave empty for now)
   - **Authorized redirect URIs:** Add these TWO URLs:
     ```
     https://hlepjkscdaiqbwhcmique.supabase.co/auth/v1/callback
     https://oauxjxhyatiawnekvoyt.supabase.co/auth/v1/callback
     ```
     - First URL is for **dev** project
     - Second URL is for **prod** project
6. Click **"Create"**
7. **IMPORTANT:** A popup will show your credentials:
   - **Client ID:** `xxxxxxxxxxxxx.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-xxxxxxxxxxxxx`
   - **Copy both immediately!** (You can't see the secret again)
   - Click **"OK"**

### Step 5: Save Your Credentials

You now have:
- **Client ID:** `xxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret:** `GOCSPX-xxxxxxxxxxxxx`

**Save these securely** - we'll add them to Supabase in the next todo.

---

## 📝 Information We Need

After completing the setup, please provide:

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

---

## ⚠️ Important Notes

1. **Redirect URIs must match exactly:**
   - Dev: `https://hlepjkscdaiqbwhcmique.supabase.co/auth/v1/callback`
   - Prod: `https://oauxjxhyatiawnekvoyt.supabase.co/auth/v1/callback`
   - No trailing slashes, exact match required

2. **Client Secret is shown only once:**
   - Copy it immediately when created
   - If you lose it, you'll need to create new credentials

3. **OAuth Consent Screen:**
   - For development, "External" is fine
   - You can add test users for testing
   - For production, you'll need to verify the app

4. **Both redirect URIs in one credential:**
   - You can add multiple redirect URIs to the same OAuth client
   - This allows one credential to work for both dev and prod

---

## ✅ Checklist

- [ ] Created Google Cloud Console project
- [ ] Enabled Google+ API or Google Identity Services API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Added both Supabase redirect URIs
- [ ] Copied Client ID and Client Secret
- [ ] Saved credentials securely

---

## 🎯 Next Steps

Once you have the Client ID and Client Secret:
1. We'll add them to Supabase (both dev and prod projects)
2. Configure Supabase to use Google OAuth
3. Test the OAuth flow

---

## 🔗 Quick Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [OAuth Credentials](https://console.cloud.google.com/apis/credentials)

---

**Ready?** Go ahead and create the Google Cloud Console project, then share the Client ID and Client Secret when ready!

