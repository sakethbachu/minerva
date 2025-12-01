# Debug Scripts

This directory contains debugging and testing scripts that are **not part of the main application**.

## Purpose

These scripts were created during development and testing to help debug authentication, sessions, and database queries. They are kept here for reference and future debugging purposes.

## Important Notes

- ⚠️ **These scripts are NOT part of the main application**
- ⚠️ **Do NOT run these scripts in production**
- ⚠️ **These scripts are for development/debugging only**

## Scripts

### User & Authentication (JavaScript)
- `check-user-exists.js` - Check if a user exists in Supabase auth.users
- `test-user-id.js` - Test user ID validation

### Sessions (JavaScript)
- `check-sessions.js` - Check user sessions in the database
- `test-session-create.js` - Test session creation
- `test-session-debug.js` - Debug session issues

### Server & Flow (JavaScript/Shell)
- `test-server-flow.js` - Test server request flow
- `test-integration.js` - End-to-end integration tests (run in browser console)
- `test_search.sh` - Test search functionality
- `test-sessions.sh` - Test session management

### Python Service (Python)
- `test_supabase_connection.py` - Test Supabase client initialization and connection
- `test_user_data_queries.py` - Test user profile and search history queries
- `test_search_debug.py` - Debug search functionality

## Usage

If you need to use these scripts for debugging:

1. Make sure you have the required environment variables set in `.env`
2. Run the scripts from this directory or provide the full path
3. Most scripts require command-line arguments - check the script comments for usage

## Examples

### JavaScript/Node.js Scripts
```bash
# Check if a user exists
node debug_scripts/check-user-exists.js <user_id>

# Check sessions
node debug_scripts/check-sessions.js

# Run integration tests (in browser console)
# Open http://localhost:3001, then in console: testIntegration()
```

### Python Scripts
```bash
# Test Supabase connection
cd python-service
python ../debug_scripts/test_supabase_connection.py

# Test user data queries
python ../debug_scripts/test_user_data_queries.py <user_id>
```

### Shell Scripts
```bash
# Test search functionality
bash debug_scripts/test_search.sh

# Test sessions
bash debug_scripts/test-sessions.sh
```

