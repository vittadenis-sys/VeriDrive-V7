"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";

export default function AdminResetPassword() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(form: FormData) {
    if (!supabase) { setMessage("Servizio di accesso non configurato."); return; }
    setBusy(true); setMessage("");
    const password = String(form.get("password") ?? "");
    if (password.length < 8) { setBusy(false); setMessage("La password deve contenere almeno 8 caratteri."); return; }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Password aggiornata. Ora puoi accedere all'area Admin.");
  }

  return <><Header/><main className="page"><div className="shell" style={{maxWidth:600}}>
    <div className="eyebrow">AMMINISTRAZIONE</div>
    <h1 style={{fontSize:"clamp(40px,6vw,54px)"}}>Imposta nuova password</h1>
    <p className="lead">Usa questa pagina dopo aver aperto il Magic Link ricevuto su admin@veridrive.it.</p>
    <form action={submit} className="panel form">
      <label className="full">Nuova password<input name="password" type="password" minLength={8} required /></label>
      <button className="button full" disabled={busy}>{busy ? "Salvataggio…" : "Salva nuova password"}</button>
      {message&&<p className="notice full">{message}</p>}
    </form>
  </div></main></>;
}
