import { supabase } from "./supabaseClient.js";

// ---------- Recipe image uploads ----------
// Stored in the public "recipe-images" Supabase Storage bucket, one folder
// per recipe id, so a public getPublicUrl() link works with no signed-URL
// code on the client.
export async function uploadRecipeImage(recipeId, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${recipeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("recipe-images")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw new Error("Couldn't upload that image. Try again.");
  const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
  return data.publicUrl;
}
