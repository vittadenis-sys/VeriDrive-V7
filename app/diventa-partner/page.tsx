"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Building2, Store } from "lucide-react";
import { Header } from "@/components/Header";

type PartnerType = "workshop" | "merchant";

const fields = [
  ["contactName", "Nome e cognome referente"],
  ["businessName", "Ragione sociale / nome attività"],
  ["vatNumber", "Partita IVA"],
  ["city", "Città"],
  ["address", "Indirizzo"],
  ["phone", "Telefono"],
] as const;

export default function PartnerRequest() {
  const [type, setType] = useState<PartnerType | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!type) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/${type === "workshop" ? "workshop" : "merchant"}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossibile inviare la richiesta.");
      setMessage("Richiesta inviata. Verrà verificata da VeriDrive prima dell’abilitazione.");
      event.currentTarget.reset();
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
        <h1>Diventa Partner</h1>
        <p className="lead">La registrazione è sempre personale. L’accesso come Officina o Commerciante viene attivato solo dopo la verifica di VeriDrive.</p>

        <div className="cards" style={{ marginTop: 28 }}>
          <button type="button" className={`card ${type === "workshop" ? "selected" : ""}`} onClick={() => setType("workshop")}>
            <Building2 size={28} />
            <h3>Officina</h3>
            <p>Richiedi l’abilitazione come officina partner.</p>
          </button>
          <button type="button" className={`card ${type === "merchant" ? "selected" : ""}`} onClick={() => setType("merchant")}>
            <Store size={28} />
            <h3>Commerciante</h3>
            <p>Richiedi l’abilitazione come commerciante partner.</p>
          </button>
        </div>

        {type && <form className="panel form" style={{ marginTop: 24 }} onSubmit={submit}>
          {fields.map(([name, label]) => <label className="full" key={name}>{label}<input name={name} required /></label>)}
          <div className="notice full">La richiesta resterà in valutazione finché un amministratore VeriDrive non la approverà.</div>
          <button className="button full" disabled={busy}>{busy ? "Invio…" : `Invia richiesta ${type === "workshop" ? "Officina" : "Commerciante"}`}</button>
          {message && <p className="notice full">{message}</p>}
        </form>}

        <p style={{ marginTop: 20 }}>Torna alla <Link href="/dashboard">Area Cliente</Link>.</p>
      </div>
    </main>
  </>;
}
