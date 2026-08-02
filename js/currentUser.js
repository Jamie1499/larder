import { supabase } from "./supabaseClient.js";

// ---------- Current signed-in user ----------
// Cached once at startup so callers (e.g. stamping "createdBy" when saving a
// new recipe) can read it synchronously instead of awaiting on every save.
export let currentUserEmail = null;

export async function loadCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.error(error);
  currentUserEmail = data?.user?.email || null;
}
