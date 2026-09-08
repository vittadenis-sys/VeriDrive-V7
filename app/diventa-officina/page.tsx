"use client";

import { useState } from "react";
import { Header } from "@/components/Header";

export default function DiventaOfficina() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/workshop/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: String(form.get("businessName") ?? ""),
          vatNumber: String(form.get("vatNumber") ?? ""),
          city: String(form.get("city") ?? ""),
          address: String(form.get("address") ?? ""),
          phone: String(form.get("phone") ?? ""),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossibile inviare la richiesta.");
      setMessage("Richiesta inviata. La attivazione dell’Area Officina avverrà solo dopo approvazione VeriDrive.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossibile inviare la richiesta.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Header />
    <main className="page">
      <div className="shell" style={{ maxWidth: 760 }}>
        <div className="eyebrow">PARTNER VERIDRIVE</div>
        <h1>Diventa officina partner</h1>
        <p className="lead">La registrazione crea sempre un account Cliente. L’Area Officina viene attivata solo dopo la tua approvazione.</p>
        <form action={submit} className="panel form">
          <label className="full">Ragione sociale<input name="businessName" required /></label>
          <label className="full">Partita IVA<input name="vatNumber" required /></label>
          <label className="full">Città<input name="city" required /></label>
          <label className="full">Indirizzo<input name="address" required /></label>
          <label className="full">Telefono<input name="phone" required /></label>
          <button className="button full" disabled={busy}>{busy ? "Invio…" : "Invia richiesta officina"}</button>
          {message && <p className="notice full">{message}</p>}
        </form>
      </div>
    </main>
  </>;
}
