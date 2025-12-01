# Frontend Testing Guide

## 🧪 Testing the Authentication & Profile Flow

This guide will help you test the complete frontend authentication and profile setup flow.

---

## ✅ Pre-Testing Checklist

Before testing, make sure:

- [ ] Supabase projects are set up (dev + prod)
- [ ] Google OAuth is configured in Supabase
- [ ] Database tables are created (`user_profiles`, `user_sessions`, `user_search_history`)
- [ ] RLS policies are set up
- [ ] `.env` file has Supabase keys
- [ ] Dependencies are installed (`npm install` done)

---

## 🚀 Starting the Server

1. **Build TypeScript:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development (auto-rebuild):
   ```bash
   npm run dev
   ```

3. **Verify server is running:**
   - Should see: `Q&A Recommendation Agent Server is running on http://localhost:3001`
   - Open browser to: `http://localhost:3001`

---

## 📋 Testing Steps

### Test 1: Login Page

1. **Navigate to:** `http://localhost:3001/login.html`
2. **Expected:**
   - See "Welcome Back" heading
   - See "Sign in with Google" button with Google icon
   - Button should be styled correctly

### Test 2: Google OAuth Flow

1. **Click "Sign in with Google" button**
2. **Expected:**
   - Button shows loading state
   - Redirects to Google OAuth page
   - You'll see Google's sign-in page

3. **Sign in with your Google account**
4. **Expected:**
   - Google redirects back to your app
   - You should land on `/auth-callback.html`
   - See "Authenticating..." message
   - Then redirects to `/profile.html` (since you don't have a profile yet)

### Test 3: Profile Form

1. **You should land on:** `http://localhost:3001/profile.html`
2. **Expected:**
   - See "Complete Your Profile" heading
   - Form with fields: Name, Age, Gender, Lives in US checkbox
   - All fields marked as required

3. **Test Validation (without filling form):**
   - Click "Continue" button
   - **Expected:** Inline errors appear for all empty fields

4. **Fill out the form:**
   - **Name:** Enter your name (e.g., "John Doe")
   - **Age:** Enter a number (e.g., 25)
   - **Gender:** Select one option (Male/Female/Other)
   - **Lives in US:** Check the checkbox

5. **Submit the form:**
   - Click "Continue"
   - **Expected:**
     - Button shows "Saving..."
     - Then redirects to main app (`/`)

### Test 4: Main App Access

1. **You should land on:** `http://localhost:3001/`
2. **Expected:**
   - See the main Q&A interface
   - No redirect to login
   - App is functional

### Test 5: Session Persistence

1. **Refresh the page** (F5 or Cmd+R)
2. **Expected:**
   - Still logged in
   - No redirect to login
   - Profile data persists

### Test 6: Logout

1. **Click the hamburger menu** (top left)
2. **Click "Logout"**
3. **Expected:**
   - Redirects to `/login.html`
   - Session is cleared

### Test 7: Re-login (Profile Already Exists)

1. **Sign in with Google again**
2. **Expected:**
   - After Google auth, redirects directly to `/` (main app)
   - Skips profile page (since profile already exists)

---

## 🐛 Common Issues & Solutions

### Issue: "Supabase config not found"
**Solution:** 
- Check that `supabase-config.js` exists in `public/` folder
- Check browser console for errors
- Verify the file is being loaded (check Network tab)

### Issue: "Failed to sign in with Google"
**Solution:**
- Check Supabase dashboard → Authentication → Providers → Google is enabled
- Verify Google Client ID and Secret are correct
- Check redirect URL in Google Cloud Console matches: `https://[your-project].supabase.co/auth/v1/callback`

### Issue: "Error saving profile" or RLS policy error
**Solution:**
- Check RLS policies are enabled in Supabase
- Verify policies allow INSERT for authenticated users
- Check browser console for specific error message

### Issue: Redirect loop
**Solution:**
- Clear browser cache and localStorage
- Check browser console for errors
- Verify Supabase session is being created

### Issue: Profile form doesn't submit
**Solution:**
- Check browser console for JavaScript errors
- Verify all required fields are filled
- Check that Supabase client is initialized

---

## 🔍 Debugging Tips

1. **Open Browser Console (F12 or Cmd+Option+I)**
   - Check for JavaScript errors
   - Look for Supabase-related errors
   - Check network requests

2. **Check Network Tab:**
   - Verify requests to Supabase are successful
   - Check for CORS errors
   - Verify redirects are working

3. **Check Application/Storage Tab:**
   - Look for Supabase session in localStorage
   - Verify tokens are being stored

4. **Supabase Dashboard:**
   - Go to Authentication → Users
   - Verify your user was created
   - Check Table Editor → `user_profiles` to see if profile was saved

---

## ✅ Success Criteria

The frontend is working correctly if:

- [ ] Google OAuth login works
- [ ] Redirects to profile page after first login
- [ ] Profile form validates correctly
- [ ] Profile saves to database
- [ ] Redirects to main app after profile creation
- [ ] Re-login skips profile page
- [ ] Logout works correctly
- [ ] Session persists across page refreshes

---

## 📝 Next Steps After Testing

Once frontend testing is successful:
- Move to backend todos (Express auth middleware, session migration, etc.)
- Test full integration (frontend + backend)
- Test Python service integration

---

**Ready to test?** Start the server and follow the steps above!


