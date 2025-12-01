// Check if sessions exist in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('🔍 Checking sessions in Supabase...');
console.log('');

// Get all sessions for the user
const userId = 'ce99e637-2f13-413d-949e-d0e39046a071';

const { data: sessions, error } = await supabase
  .from('user_sessions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Error fetching sessions:', error);
} else {
  console.log(`✅ Found ${sessions?.length || 0} sessions for user ${userId}`);
  console.log('');
  
  if (sessions && sessions.length > 0) {
    console.log('Sessions:');
    sessions.forEach((session, i) => {
      console.log(`\n${i + 1}. Session ID: ${session.session_id}`);
      console.log(`   Query: ${session.original_query}`);
      console.log(`   Created: ${session.created_at}`);
      console.log(`   Expires: ${session.expires_at}`);
      console.log(`   Questions: ${Array.isArray(session.questions) ? session.questions.length : 'N/A'}`);
    });
  } else {
    console.log('No sessions found in database.');
    console.log('This means sessions are not being created when you make API calls.');
  }
}


