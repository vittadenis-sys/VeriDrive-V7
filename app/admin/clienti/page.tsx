"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

type Customer = { id: string; auth_id: string; full_name: string; phone: string | null; demo_access: boolean; created_at: string };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile caricare i clienti.");
      setCustomers(data.customers ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile caricare i clienti."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function toggle(customer: Customer) {
    setBusy(customer.id); setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}/demo`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !customer.demo_access }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile aggiornare l'accesso demo.");
      setCustomers((current) => current.map((item) => item.id === customer.id ? { ...item, demo_access: Boolean(data.customer.demo_access) } : item));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile aggiornare l'accesso demo."); }
    finally { setBusy(""); }
  }

  return <><Header/><main className="page"><div className="shell">
    <Link href="/admin">← Amministrazione</Link>
    <div className="eyebrow" style={{ marginTop: 24 }}>CLIENTI B2C</div>
    <div className="dashboard-hero"><div><h1>Gestione clienti</h1><p className="lead">Abilita o disabilita l'Accesso Demo per singolo cliente. Il normale pagamento Stripe resta attivo per tutti gli altri.</p></div><button className="button secondary" type="button" onClick={() => void load()} disabled={loading}>Aggiorna</button></div>
    {message && <p className="notice">{message}</p>}
    {loading ? <div className="notice">Caricamento clienti…</div> : customers.length === 0 ? <section className="panel" style={{ marginTop: 24 }}><h3>Nessun cliente</h3><p>Non risultano profili cliente disponibili.</p></section> : <section style={{ padding: "28px 0" }}><div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>{customers.map((customer) => <article className="card" key={customer.id}><div className="eyebrow">CLIENTE</div><h3 style={{ margin: "7px 0" }}>{customer.full_name}</h3><p>{customer.phone || "Telefono non disponibile"}</p><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14 }}><span className="badge">{customer.demo_access ? "Demo attiva" : "Pagamento normale"}</span><button type="button" className={`button ${customer.demo_access ? "secondary" : ""}`} disabled={busy === customer.id} onClick={() => void toggle(customer)}>{busy === customer.id ? "Salvataggio…" : customer.demo_access ? "Disattiva demo" : "Attiva demo"}</button></div></article>)}</div></section>}
  </div></main></>;
}
