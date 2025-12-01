// Quick diagnostic script to test session creation
// Run with: node test-session-debug.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey.substring(0, 20) + '...');
console.log('');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test 1: Check connection
console.log('Test 1: Checking connection...');
try {
  const { data, error } = await supabase.from('user_sessions').select('count').limit(1);
  if (error) {
    console.error('❌ Connection error:', error);
  } else {
    console.log('✅ Connection successful');
  }
} catch (err) {
  console.error('❌ Connection failed:', err.message);
}

// Test 2: Try to insert a test session
console.log('\nTest 2: Testing session insert...');
const testSession = {
  user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
  session_id: 'test_session_' + Date.now(),
  original_query: 'test query',
  questions: [],
  answers: {},
  current_question_index: 0,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const { data: insertData, error: insertError } = await supabase
  .from('user_sessions')
  .insert(testSession)
  .select();

if (insertError) {
  console.error('❌ Insert failed:', insertError);
  console.error('Error details:', JSON.stringify(insertError, null, 2));
} else {
  console.log('✅ Insert successful');
  console.log('Inserted session:', insertData);
  
  // Clean up test session
  await supabase
    .from('user_sessions')
    .delete()
    .eq('session_id', testSession.session_id);
  console.log('🧹 Test session cleaned up');
}

// Test 3: Check RLS policies
console.log('\nTest 3: Checking table structure...');
const { data: tableInfo, error: tableError } = await supabase
  .from('user_sessions')
  .select('*')
  .limit(0);

if (tableError) {
  console.error('❌ Table access error:', tableError);
} else {
  console.log('✅ Table accessible');
}

console.log('\n✅ Diagnostic complete!');


