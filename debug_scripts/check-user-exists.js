// Script to check if a user exists in auth.users
// Run: node check-user-exists.js <user_id>

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node check-user-exists.js <user_id>');
  console.log('\nTo get your user_id, run this in browser console:');
  console.log(`
    const supabase = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    const { data: { session } } = await supabase.auth.getSession();
    console.log('User ID:', session?.user?.id);
  `);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('🔍 Checking if user exists in auth.users...');
console.log('User ID:', userId);
console.log('');

// Check if user exists in auth.users
const { data: user, error } = await supabase.auth.admin.getUserById(userId);

if (error) {
  console.error('❌ Error checking user:', error);
  console.error('This means the user_id does not exist in auth.users');
  console.error('\nPossible causes:');
  console.error('1. User signed in but was not created in auth.users');
  console.error('2. User_id format is incorrect');
  console.error('3. Using wrong Supabase project (dev vs prod)');
} else if (user) {
  console.log('✅ User exists in auth.users');
  console.log('Email:', user.user?.email);
  console.log('Created at:', user.user?.created_at);
  console.log('\n✅ This user_id should work for creating sessions');
} else {
  console.log('❌ User not found in auth.users');
}


