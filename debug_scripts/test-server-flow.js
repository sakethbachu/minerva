// Simulate what the server does when creating a session
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Simulate the sessionService.createSession function
async function createSession(userId, sessionId, originalQuery, questions) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Supabase credentials not found");
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase
      .from("user_sessions")
      .insert({
        user_id: userId,
        session_id: sessionId,
        original_query: originalQuery,
        questions: questions,
        answers: {},
        current_question_index: 0,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error("Error creating session:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      return false;
    }

    console.log(`✅ Session ${sessionId} created successfully`);
    return true;
  } catch (error) {
    console.error("Error creating session (catch):", error);
    return false;
  }
}

// Test with the actual session data from the browser
const userId = 'ce99e637-2f13-413d-949e-d0e39046a071';
const sessionId = 'session_1764486055191_976wh6vfi'; // From your browser test
const originalQuery = 'test running shoes';
const questions = [
  { id: 'q1', text: 'Question 1', answers: ['A1', 'A2'] },
  { id: 'q2', text: 'Question 2', answers: ['A1', 'A2'] },
  { id: 'q3', text: 'Question 3', answers: ['A1', 'A2'] }
];

console.log('🧪 Testing server flow...');
console.log('User ID:', userId);
console.log('Session ID:', sessionId);
console.log('');

const result = await createSession(userId, sessionId, originalQuery, questions);

if (result) {
  console.log('✅ Session creation succeeded!');
  console.log('Check Supabase Dashboard → user_sessions table');
} else {
  console.log('❌ Session creation failed - check errors above');
}


