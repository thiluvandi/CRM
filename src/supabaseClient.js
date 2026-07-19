import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Isolated client used only when an Admin/CA signs up a new employee.
// A fresh, non-persisted session keeps that signUp call from overwriting
// the currently logged-in Admin/CA's session in the main client above.
export const supabaseSignupClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const DRAFTS_BUCKET = "task-drafts";
