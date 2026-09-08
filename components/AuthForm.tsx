"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(form: FormData) {
    if (!supabase) {
      setMessage("Configura Supabase in .env.local.");
      return;
    }

    setBusy(true);
    setMessage("");
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
            data: { full_name: form.get("name") },
          },
        });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "login") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Accesso completato ma sessione non disponibile.");
        return;
      }

      // Admin/super-admin keep the admin area; all other users start as customers.
      const { data: workshop } = await supabase
        .from("workshops")
        .select("id")
        .eq("owner_auth_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const { data: admin } = await supabase
        .from("admins")
        .select("role")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (admin?.role === "super_admin" || admin?.role === "admin") {
        location.assign("/admin");
      } else if (workshop) {
        location.assign("/officina");
      } else {
        location.assign("/dashboard");
      }
      return;
    }

    setMessage("Controlla la tua email per confermare l’account. Il nuovo account parte come Cliente; l’accesso Officina viene attivato solo dopo approvazione.");
  }

  return (
    <form action={submit} className="panel form">
      {mode === "register" && <label className="full">Nome e cognome<input name="name" required /></label>}
      <label className="full">Email<input name="email" type="email" required /></label>
      <label className="full">Password<input name="password" type="password" minLength={8} required /></label>
      <button className="button full" disabled={busy}>{busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
