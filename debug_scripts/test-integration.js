/**
 * Integration test script for authentication and search flow
 * Run this in browser console: testIntegration()
 */

(function() {
  'use strict';
  
  // Use existing API_BASE from app.js if available, otherwise define it
  const TEST_API_BASE = window.API_BASE || 'http://localhost:3001';

  // Test results
  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  function logTest(name, passed, message = '') {
    if (passed) {
      results.passed.push(name);
      console.log(`✅ ${name}${message ? ': ' + message : ''}`);
    } else {
      results.failed.push(name);
      console.error(`❌ ${name}${message ? ': ' + message : ''}`);
    }
  }

  function logSkip(name, reason) {
    results.skipped.push({ name, reason });
    console.log(`⏭️  ${name} (skipped: ${reason})`);
  }

  // Make function available globally
  window.testIntegration = async function() {
  console.log('🧪 Starting Integration Tests...\n');
  console.log('='.repeat(50));
  
  // Reset results
  results.passed = [];
  results.failed = [];
  results.skipped = [];
  
  // Test 1: Check Authentication
  console.log('\n📋 Test 1: Authentication');
  try {
    const supabase = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      logTest('Authentication', false, 'Not logged in');
      console.log('\n⚠️  Please log in first, then run tests again');
      console.log('Go to: http://localhost:3001');
      return;
    }
    
    logTest('Authentication', true, `User: ${session.user.email}`);
    const userId = session.user.id;
    const token = session.access_token;
    
    // Test 2: Check Profile
    console.log('\n📋 Test 2: User Profile');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      logTest('Profile Exists', false, 'Profile not found');
      logSkip('Profile Data', 'No profile to test');
    } else {
      logTest('Profile Exists', true);
      logTest('Profile Age', profile.age >= 1 && profile.age <= 150, `Age: ${profile.age}`);
      logTest('Profile Gender', ['Male', 'Female', 'Other'].includes(profile.gender), `Gender: ${profile.gender}`);
      logTest('Profile Location', typeof profile.lives_in_us === 'boolean', `US: ${profile.lives_in_us}`);
    }
    
    // Test 3: Create Session
    console.log('\n📋 Test 3: Session Creation');
    const queryResponse = await fetch(`${TEST_API_BASE}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: 'test integration search - running shoes' })
    });
    
    if (!queryResponse.ok) {
      const errorData = await queryResponse.json().catch(() => ({}));
      logTest('Session Creation', false, `HTTP ${queryResponse.status}: ${errorData.error || 'Unknown error'}`);
    } else {
      const queryData = await queryResponse.json();
      if (queryData.success && queryData.sessionId) {
        logTest('Session Creation', true, `Session: ${queryData.sessionId}`);
        logTest('Questions Generated', queryData.questions?.length > 0, `${queryData.questions.length} questions`);
        
        // Test 4: Submit Answers
        console.log('\n📋 Test 4: Submit Answers with Personalization');
        const answers = {};
        queryData.questions.forEach(q => {
          answers[q.id] = q.answers[0]; // First answer
        });
        
        console.log('   Submitting answers...');
        const submitResponse = await fetch(`${TEST_API_BASE}/submit-answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            sessionId: queryData.sessionId,
            answers: answers
          })
        });
        
        if (!submitResponse.ok) {
          const errorData = await submitResponse.json().catch(() => ({}));
          logTest('Submit Answers', false, `HTTP ${submitResponse.status}: ${errorData.error || errorData.message || 'Unknown error'}`);
          console.error('   Full error response:', errorData);
        } else {
          const submitData = await submitResponse.json();
          console.log('   Submit response:', submitData);
          
          if (!submitData.success) {
            logTest('Submit Answers', false, submitData.error || submitData.message || 'Search failed');
            console.error('   Error details:', submitData);
          } else {
            logTest('Submit Answers', true, submitData.message || 'Success');
            logTest('Search Results', submitData.searchResults?.length > 0, `${submitData.searchResults?.length || 0} results`);
            
            if (submitData.searchResults && submitData.searchResults.length > 0) {
              console.log('   Sample result:', submitData.searchResults[0].title);
            }
          }
        }
        
        // Test 5: Check Search History
        console.log('\n📋 Test 5: Search History');
        const { data: history, error: historyError } = await supabase
          .from('user_search_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (historyError) {
          logTest('Search History Fetch', false, historyError.message);
        } else {
          logTest('Search History Fetch', true, `${history?.length || 0} entries`);
          if (history && history.length > 0) {
            const latest = history[0];
            logTest('Latest Search Query', !!latest.query, latest.query);
            logTest('Latest Search Answers', !!latest.answers, 'Answers saved');
            logTest('Latest Search Results', !!latest.search_results, 'Results saved');
          }
        }
        
        // Test 6: Check Session in Database
        console.log('\n📋 Test 6: Session in Database');
        const { data: sessions, error: sessionError } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('session_id', queryData.sessionId)
          .single();
        
        if (sessionError) {
          logTest('Session in Database', false, sessionError.message);
        } else {
          logTest('Session in Database', true, 'Session found');
          logTest('Session User ID', sessions.user_id === userId, 'User ID matches');
          logTest('Session Expires At', !!sessions.expires_at, 'Expiration set');
        }
        
      } else {
        logTest('Session Creation', false, 'Invalid response format');
      }
    }
    
    // Test 7: Protected Routes
    console.log('\n📋 Test 7: Protected Routes');
    const unauthenticatedResponse = await fetch(`${TEST_API_BASE}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'test' })
    });
    logTest('Unauthenticated Request Blocked', unauthenticatedResponse.status === 401, `Status: ${unauthenticatedResponse.status}`);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failed.forEach(test => console.log(`   - ${test}`));
    }
    
    if (results.passed.length > 0) {
      console.log('\n✅ Passed Tests:');
      results.passed.forEach(test => console.log(`   - ${test}`));
    }
    
    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Tests:');
      results.skipped.forEach(skip => console.log(`   - ${skip.name}: ${skip.reason}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (results.failed.length === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
    console.error('Stack:', error.stack);
  }
  };
  
  console.log('✅ Test script loaded! Run: testIntegration()');
})();

