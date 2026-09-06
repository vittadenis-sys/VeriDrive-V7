"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const client = createClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: "admin@veridrive.it",
        password,
      });

      console.log("LOGIN_RESULT", {
        ok: !error,
        error: error?.message,
        hasSession: Boolean(data.session),
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        setMessage("Accesso non completato: nessuna sessione ricevuta.");
        return;
      }

      window.location.assign("/admin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante l'accesso.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      const client = createClient();
      const { error } = await client.auth.resetPasswordForEmail("admin@veridrive.it", {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      setMessage(error ? error.message : "Controlla la tua email per il link di recupero.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante il recupero password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page">
        <div className="shell" style={{ maxWidth: 600 }}>
          <div className="eyebrow">AMMINISTRAZIONE</div>
          <h1 style={{ fontSize: "clamp(40px,6vw,54px)" }}>Accesso Admin</h1>
          <p className="lead">Accedi con email e password. Il recupero password usa un Magic Link inviato all'indirizzo admin.</p>

          <div className="panel form">
            <label className="full">
              Email
              <input name="email" type="email" value="admin@veridrive.it" readOnly required />
            </label>

            <label className="full">
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLogin();
                  }
                }}
                required
              />
            </label>

            <button className="button full" type="button" onClick={() => void handleLogin()} disabled={busy || password.length < 8}>
              {busy ? "Attendi…" : "Accedi"}
            </button>
          </div>

          <div className="panel form" style={{ marginTop: 18 }}>
            <div className="full"><h3>Password dimenticata?</h3><p>Invia un Magic Link a <b>admin@veridrive.it</b> per impostarne una nuova.</p></div>
            <button className="button secondary full" type="button" onClick={() => void handleReset()} disabled={busy}>
              {busy ? "Attendi…" : "Invia Magic Link"}
            </button>
          </div>

          {message && <p className="notice" style={{ marginTop: 16 }}>{message}</p>}
        </div>
      </main>
    </>
  );
}
