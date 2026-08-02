// ---------- Utils ----------
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// "jamie.patrick@me.com" -> "jamie.patrick", for a lightweight "added by" label.
export function formatCreatedBy(email) {
  return email ? email.split("@")[0] : "";
}
