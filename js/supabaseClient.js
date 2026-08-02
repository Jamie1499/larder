// ---------- Supabase client ----------
// Fill these in from your Supabase project: Settings -> API.
// The anon key is safe to expose in client code — Row Level Security plus the
// "authenticated users only" policies on the tables are what actually gate access.
const SUPABASE_URL = "https://aegyplppxzjuogujujvs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_PLF8zriU076seyMS2ipNng_ZS1KpDDD";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
