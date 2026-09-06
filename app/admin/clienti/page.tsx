"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  demo_access: boolean;
  autogerma_free_booking_bonus: number;
  created_at: string;
};

export default function AdminClientiPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bonusDrafts, setBonusDrafts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  async function load(nextSearch = search) {
    try {
      const query = nextSearch.trim() ? `?search=${encodeURIComponent(nextSearch.trim())}` : "";
      const response = await fetch(`/api/admin/customers${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile caricare i clienti.");
      const nextCustomers = data.customers ?? [];
      setCustomers(nextCustomers);
      setBonusDrafts(Object.fromEntries(nextCustomers.map((customer: Customer) => [customer.id, customer.autogerma_free_booking_bonus ?? 0])));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore.");
    }
  }

  useEffect(() => { void load(""); }, []);

  async function toggleDemo(customer: Customer) {
    setBusyId(customer.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/demo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoAccess: !customer.demo_access }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile aggiornare l'accesso demo.");
      setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, demo_access: data.customer.demo_access } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante l'aggiornamento.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveBonus(customer: Customer) {
    const bonus = bonusDrafts[customer.id] ?? 0;
    setBusyId(customer.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/bonus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile aggiornare i bonus.");
      setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, autogerma_free_booking_bonus: data.customer.autogerma_free_booking_bonus } : item));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante il salvataggio del bonus.");
    } finally {
      setBusyId(null);
    }
  }

  return <>
    <Header />
    <main className="page"><div className="shell">
      <Link href="/admin">← Amministrazione</Link>
      <div className="eyebrow" style={{ marginTop: 24 }}>AMMINISTRAZIONE</div>
      <h1>Clienti</h1>
      <p className="lead">Ricerca rapida per nome o telefono, accesso demo e bonus prenotazioni gratuite Autogerma.</p>
      <div className="panel" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(search); }} placeholder="Cerca nome o telefono" />
        <button type="button" className="button" onClick={() => void load(search)}>Cerca</button>
      </div>
      {message && <p className="notice">{message}</p>}
      <section className="panel" style={{ marginTop: 20 }}>
        {customers.length === 0 ? <p style={{ marginBottom: 0 }}>Nessun cliente trovato.</p> : <div style={{ display: "grid", gap: 12 }}>
          {customers.map((customer) => <div key={customer.id} className="card" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong>{customer.full_name || "Cliente senza nome"}</strong>
                {customer.phone && <div style={{ opacity: .7, marginTop: 4 }}>{customer.phone}</div>}
                <small style={{ opacity: .7 }}>Registrato il {new Date(customer.created_at).toLocaleDateString("it-IT")}</small>
              </div>
              <button className={`button ${customer.demo_access ? "" : "secondary"}`} type="button" onClick={() => void toggleDemo(customer)} disabled={busyId === customer.id}>
                {busyId === customer.id ? "Salvataggio…" : customer.demo_access ? "Demo attivo · Disattiva" : "Attiva Accesso Demo"}
              </button>
            </div>
            <div className="panel" style={{ margin: 0, display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
              <label style={{ minWidth: 220, flex: 1 }}>
                Bonus prenotazioni gratuite Autogerma
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={bonusDrafts[customer.id] ?? 0}
                  onChange={(event) => setBonusDrafts((current) => ({ ...current, [customer.id]: Math.max(0, Number.parseInt(event.target.value || "0", 10) || 0) }))}
                />
                <small style={{ display: "block", marginTop: 4, opacity: .7 }}>Visibile al cliente solo come pulsante “Prenota gratis” quando seleziona Autogerma.</small>
              </label>
              <button className="button secondary" type="button" onClick={() => void saveBonus(customer)} disabled={busyId === customer.id}>Salva bonus</button>
            </div>
          </div>)}
        </div>}
      </section>
    </div></main>
  </>;
}
