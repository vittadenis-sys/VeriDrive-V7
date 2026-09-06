"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  demo_access: boolean;
  created_at: string;
};

export default function AdminClientiPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("");
    const response = await fetch("/api/admin/customers", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Impossibile caricare i clienti.");
    setCustomers(data.customers ?? []);
  }

  useEffect(() => {
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "Errore."));
  }, []);

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

  return <>
    <Header />
    <main className="page">
      <div className="shell">
        <div className="eyebrow">AMMINISTRAZIONE</div>
        <h1>Clienti</h1>
        <p className="lead">Gestisci l'accesso demo ai servizi B2C senza modificare il sistema crediti dei commercianti.</p>
        {message && <p className="notice">{message}</p>}
        <section className="panel" style={{ marginTop: 20 }}>
          {customers.length === 0 ? <p style={{ marginBottom: 0 }}>Nessun cliente registrato.</p> : <div style={{ display: "grid", gap: 12 }}>
            {customers.map((customer) => <div key={customer.id} className="card" style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong>{customer.full_name || "Cliente senza nome"}</strong>
                {customer.phone && <div style={{ opacity: .7, marginTop: 4 }}>{customer.phone}</div>}
                <small style={{ opacity: .7 }}>Registrato il {new Date(customer.created_at).toLocaleDateString("it-IT")}</small>
              </div>
              <button className={`button ${customer.demo_access ? "" : "secondary"}`} type="button" onClick={() => void toggleDemo(customer)} disabled={busyId === customer.id}>
                {busyId === customer.id ? "Salvataggio…" : customer.demo_access ? "Demo attivo · Disattiva" : "Attiva Accesso Demo"}
              </button>
            </div>)}
          </div>}
        </section>
      </div>
    </main>
  </>;
}
