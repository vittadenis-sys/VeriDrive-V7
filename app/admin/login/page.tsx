"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase";

export default function AdminLogin() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(form: FormData) {
    setBusy(true); setMessage("");
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const client = createClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.assign("/admin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante l'accesso.");
    } finally {
      setBusy(false);
    }
  }

  async function reset(form: FormData) {
    setBusy(true); setMessage("");
    const email = String(form.get("email") ?? "").trim();
    try {
      const client = createClient();
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset-password` });
      setMessage(error ? error.message : "Controlla la tua email per il link di recupero.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante il recupero password.");
    } finally {
      setBusy(false);
    }
  }

  return <><Header/><main className="page"><div className="shell" style={{maxWidth:600}}>
    <div className="eyebrow">AMMINISTRAZIONE</div>
    <h1 style={{fontSize:"clamp(40px,6vw,54px)"}}>Accesso Admin</h1>
    <p className="lead">Accedi con email e password. Il recupero password usa un Magic Link inviato all'indirizzo admin.</p>
    <form action={login} className="panel form">
      <label className="full">Email<input name="email" type="email" value="admin@veridrive.it" readOnly required /></label>
      <label className="full">Password<input name="password" type="password" minLength={8} required /></label>
      <button className="button full" disabled={busy}>{busy ? "Attendi…" : "Accedi"}</button>
    </form>
    <form action={reset} className="panel form" style={{marginTop:18}}>
      <div className="full"><h3>Password dimenticata?</h3><p>Invia un Magic Link a <b>admin@veridrive.it</b> per impostarne una nuova.</p></div>
      <input type="hidden" name="email" value="admin@veridrive.it" />
      <button className="button secondary full" disabled={busy}>Invia Magic Link</button>
    </form>
    {message&&<p className="notice" style={{marginTop:16}}>{message}</p>}
  </div></main></>;
}
