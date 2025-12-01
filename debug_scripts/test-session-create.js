// Test session creation with real user_id
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const userId = 'ce99e637-2f13-413d-949e-d0e39046a071';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('🧪 Testing session creation with real user_id...');
console.log('User ID:', userId);
console.log('');

const testSession = {
  user_id: userId,
  session_id: 'test_session_' + Date.now(),
  original_query: 'test query from script',
  questions: [{ id: 'q1', text: 'Test question', answers: ['Answer 1'] }],
  answers: {},
  current_question_index: 0,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

console.log('Attempting to insert session...');
const { data: insertData, error: insertError } = await supabase
  .from('user_sessions')
  .insert(testSession)
  .select();

if (insertError) {
  console.error('❌ Insert failed!');
  console.error('Error code:', insertError.code);
  console.error('Error message:', insertError.message);
  console.error('Error details:', insertError.details);
  console.error('Error hint:', insertError.hint);
} else {
  console.log('✅ Insert successful!');
  console.log('Inserted session:', insertData);
  
  // Check if it's visible
  const { data: checkData, error: checkError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('session_id', testSession.session_id);
  
  if (checkError) {
    console.error('❌ Error checking session:', checkError);
  } else {
    console.log('✅ Session found in database:', checkData);
  }
  
  // Clean up
  await supabase
    .from('user_sessions')
    .delete()
    .eq('session_id', testSession.session_id);
  console.log('🧹 Test session cleaned up');
}


