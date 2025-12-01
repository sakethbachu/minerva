// Supabase configuration for frontend
// This file is served as a static file, so we can't use .env directly
// Values will be injected by the server or set here for development

// For development, we'll use the dev project
// In production, these should be injected by the server or set via build process
window.SUPABASE_CONFIG = {
  url: 'https://hlepjkscdaiqbwhcmiqe.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZXBqa3NjZGFpcWJ3aGNtaXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NTcwMDcsImV4cCI6MjA4MDAzMzAwN30.39DgL2fh5a3Iawd1Lkl3Zhxr7WEB1zmQvN-naRf6kgM'
};