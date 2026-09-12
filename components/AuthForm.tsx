"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function submit(form: FormData) {
    if (!supabase) {
      setMessage("Configura Supabase in .env.local.");
      return;
    }

    if (busy) return;

    setBusy(true);
    setMessage("");
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
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

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === "register") {
        setMessage("Controlla la tua email per confermare l’account. Il nuovo account parte come Cliente; Commerciante e Officina richiedono approvazione Admin.");
        return;
      }

      const user = result.data.user;
      if (!user) {
        setMessage("Accesso completato ma utente non disponibile.");
        return;
      }

      // Give Supabase a chance to persist/propagate the new auth state before
      // the client-side navigation. This avoids the first redirect landing
      // back on /login while the session is still being written.
      await supabase.auth.getSession();

      const bootstrap = await fetch("/api/customer/bootstrap", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!bootstrap.ok) {
        setMessage("Accesso riuscito, ma non riesco a creare il profilo Cliente. Riprova tra poco.");
        return;
      }

      const { data: workshop } = await supabase
        .from("workshops")
        .select("id")
        .eq("owner_auth_id", user.id)
        .eq("active", true)
        .maybeSingle();

      const { data: admin } = await supabase
        .from("admins")
        .select("role")
        .eq("auth_id", user.id)
        .maybeSingle();

      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

      if (admin?.role === "super_admin" || admin?.role === "admin") {
        router.replace(safeNext || "/admin");
      } else if (workshop) {
        router.replace(safeNext || "/officina");
      } else {
        router.replace(safeNext || "/dashboard");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante l’accesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="panel form"
    >
      {mode === "register" && <label className="full">Nome e cognome<input name="name" required /></label>}
      <label className="full">Email<input name="email" type="email" required /></label>
      <label className="full">Password<input name="password" type="password" minLength={8} required /></label>
      <button type="submit" className="button full" disabled={busy}>{busy ? "Attendi…" : mode === "login" ? "Accedi" : "Crea account"}</button>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
