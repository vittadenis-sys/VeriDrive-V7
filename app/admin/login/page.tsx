"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { getSupabaseClientAsync } from "@/lib/supabase";

export default function AdminLogin() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getSupabaseClientAsync().then((client) => {
      setReady(Boolean(client));
      if (!client) setMessage("Servizio di accesso non configurato.");
    });
  }, []);

  async function login(form: FormData) {
    const client = await getSupabaseClientAsync();
    if (!client) { setMessage("Servizio di accesso non configurato."); return; }
    setBusy(true); setMessage("");
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    window.location.assign("/admin");
  }

  async function reset(form: FormData) {
    const client = await getSupabaseClientAsync();
    if (!client) { setMessage("Servizio di accesso non configurato."); return; }
    setBusy(true); setMessage("");
    const email = String(form.get("email") ?? "").trim();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset-password` });
    setBusy(false);
    setMessage(error ? error.message : "Controlla la tua email per il link di recupero.");
  }

  return <><Header/><main className="page"><div className="shell" style={{maxWidth:600}}>
    <div className="eyebrow">AMMINISTRAZIONE</div>
    <h1 style={{fontSize:"clamp(40px,6vw,54px)"}}>Accesso Admin</h1>
    <p className="lead">Accedi con email e password. Il recupero password usa un Magic Link inviato all'indirizzo admin.</p>
    <form action={login} className="panel form">
      <label className="full">Email<input name="email" type="email" value="admin@veridrive.it" readOnly required /></label>
      <label className="full">Password<input name="password" type="password" minLength={8} required /></label>
      <button className="button full" disabled={busy || !ready}>{busy ? "Attendi…" : "Accedi"}</button>
    </form>
    <form action={reset} className="panel form" style={{marginTop:18}}>
      <div className="full"><h3>Password dimenticata?</h3><p>Invia un Magic Link a <b>admin@veridrive.it</b> per impostarne una nuova.</p></div>
      <input type="hidden" name="email" value="admin@veridrive.it" />
      <button className="button secondary full" disabled={busy || !ready}>Invia Magic Link</button>
    </form>
    {message&&<p className="notice" style={{marginTop:16}}>{message}</p>}
  </div></main></>;
}
