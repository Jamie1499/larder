import { supabase } from "./supabaseClient.js";

// ---------- Auth gating ----------
// Sign-up is disabled at the Supabase project level (invite-only), so this is
// just a sign-in form plus show/hide of the app behind a session check.

export function setupAuth(onSignedIn, onSignedOut) {
  const loginScreen = document.getElementById("login-screen");
  const tabs = document.getElementById("main-tabs");
  const signoutBtn = document.getElementById("signout-btn");
  const app = document.getElementById("app");
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit-btn");

  function showApp() {
    loginScreen.classList.add("hidden");
    tabs.classList.remove("hidden");
    signoutBtn.classList.remove("hidden");
    app.classList.remove("hidden");
  }

  function showLogin() {
    loginScreen.classList.remove("hidden");
    tabs.classList.add("hidden");
    signoutBtn.classList.add("hidden");
    app.classList.add("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    submitBtn.disabled = true;
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    submitBtn.disabled = false;
    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove("hidden");
    }
  });

  signoutBtn.addEventListener("click", () => supabase.auth.signOut());

  let signedIn = false;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showApp();
      if (!signedIn) {
        signedIn = true;
        onSignedIn();
      }
    } else {
      signedIn = false;
      showLogin();
      onSignedOut();
    }
  });
}
