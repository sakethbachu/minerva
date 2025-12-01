// Test script to verify user_id from JWT
// Run this in browser console after getting your token

// First, get your token (run this in browser console):
/*
const supabase = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);
const { data: { session } } = await supabase.auth.getSession();
console.log('Token:', session?.access_token);
console.log('User ID:', session?.user?.id);
*/

// Then paste your token here and run this script:
const token = 'PASTE_YOUR_TOKEN_HERE';

// Decode JWT to see user_id
const parts = token.split('.');
if (parts.length === 3) {
  const payload = JSON.parse(atob(parts[1]));
  console.log('JWT Payload:', payload);
  console.log('User ID from JWT:', payload.sub);
  console.log('\n✅ This user_id should exist in auth.users table');
  console.log('Check Supabase Dashboard → Authentication → Users');
}


