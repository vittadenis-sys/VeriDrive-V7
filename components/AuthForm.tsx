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

    try {
      const email = String(form.get("email") ?? "").trim();
      const password = String(form.get("password") ?? "");
      const fullName = String(form.get("name") ?? "").trim();

      if (mode === "login") {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        window.location.assign("/dashboard");
        return;
      }

      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName },
        },
      });

      if (result.error) throw result.error;

      if (!result.data.user) throw new Error("Impossibile creare l'account.");

      // Create the customer profile immediately when the account is created.
      // This makes the new user available to the customer dashboard after login.
      if (result.data.session) {
        const { error: profileError } = await supabase.from("customers").upsert(
          {
            auth_id: result.data.user.id,
            full_name: fullName || null,
            phone: null,
          },
          { onConflict: "auth_id" },
        );

        if (profileError) throw profileError;
        setBusy(false);
        window.location.assign("/dashboard");
        return;
      }

      setMessage("Controlla la tua email per confermare l’account.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registrazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="panel form">
      {mode === "register" && (
        <label className="full">
          Nome e cognome
          <input name="name" required />
        </label>
      )}
      <label className="full">
        Email
        <input name="email" type="email" required />
      </label>
      <label className="full">
        Password
        <input name="password" type="password" minLength={8} required />
      </label>
      <button className="button full" disabled={busy}>
        {busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}
      </button>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
