// ============================================================
// Shared Supabase connection — used by login.js, register.js,
// dashboard.js, profile.js, and auth-callback.js
//
// SETUP: Get these two values from Supabase Dashboard > Project Settings > API
//   - Project URL          -> SUPABASE_URL
//   - anon / public key    -> SUPABASE_ANON_KEY
// The anon key is safe to put in frontend code (unlike the service_role key).
// ============================================================
const SUPABASE_URL = "https://bfjkjiizmlsbfszyhxfe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmamtqaWl6bWxzYmZzenloeGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTY4OTgsImV4cCI6MjEwMjAzMjg5OH0.fIaE9Voe5bsXV-z-2UV0-DL4xwdpvOWVwRk_-KDprew";

// Create Supabase client and attach to window for global access
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Base URL for calling our own backend API (Express). Using a relative path
// means this works whether you're on localhost or behind Nginx on port 80 —
// no more hardcoded "localhost:5000".
const API_BASE = "/api";