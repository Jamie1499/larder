import { supabase } from "./supabaseClient.js";

// ---------- Storage (backed by Supabase) ----------
// Recipes are shared across every signed-in user. The shopping list
// (selection + checked items) is per-user, keyed by auth.uid().

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) console.error(error);
  return data?.user?.id;
}

export async function loadRecipes() {
  const { data, error } = await supabase.from("recipes").select("id, data");
  if (error) {
    console.error(error);
    return [];
  }
  return (data || []).map((row) => ({ ...row.data, id: row.id }));
}

export async function saveRecipes(recipes) {
  const ids = recipes.map((r) => r.id);
  if (recipes.length) {
    const { error } = await supabase.from("recipes").upsert(recipes.map((r) => ({ id: r.id, data: r })));
    if (error) console.error(error);
  }
  const deleteResult = ids.length
    ? await supabase.from("recipes").delete().not("id", "in", `(${ids.join(",")})`)
    : await supabase.from("recipes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteResult.error) console.error(deleteResult.error);
}

export async function loadSelection() {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("shopping_state").select("selection").eq("user_id", userId).maybeSingle();
  if (error) console.error(error);
  return new Set(data?.selection || []);
}

export async function saveSelection(set) {
  const userId = await currentUserId();
  const { error } = await supabase.from("shopping_state").upsert({ user_id: userId, selection: [...set] });
  if (error) console.error(error);
}

export async function loadChecked() {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("shopping_state").select("checked").eq("user_id", userId).maybeSingle();
  if (error) console.error(error);
  return new Set(data?.checked || []);
}

export async function saveChecked(set) {
  const userId = await currentUserId();
  const { error } = await supabase.from("shopping_state").upsert({ user_id: userId, checked: [...set] });
  if (error) console.error(error);
}
