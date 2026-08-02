import { supabase } from "./supabaseClient.js";

// ---------- Storage (shared, backed by Supabase) ----------
// All signed-in users read and write the same rows — there's no per-user data.

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
  const { data, error } = await supabase.from("shopping_state").select("selection").eq("id", 1).maybeSingle();
  if (error) console.error(error);
  return new Set(data?.selection || []);
}

export async function saveSelection(set) {
  const { error } = await supabase.from("shopping_state").upsert({ id: 1, selection: [...set] });
  if (error) console.error(error);
}

export async function loadChecked() {
  const { data, error } = await supabase.from("shopping_state").select("checked").eq("id", 1).maybeSingle();
  if (error) console.error(error);
  return new Set(data?.checked || []);
}

export async function saveChecked(set) {
  const { error } = await supabase.from("shopping_state").upsert({ id: 1, checked: [...set] });
  if (error) console.error(error);
}
