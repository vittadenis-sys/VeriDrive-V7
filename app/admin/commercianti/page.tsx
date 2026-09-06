"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

type Merchant = { id: string; company_name: string | null; full_name: string | null; phone: string | null; credits: number | null; created_at: string };

export default function AdminCommerciantiPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function load(nextSearch = search) {
    try {
      const query = nextSearch.trim() ? `?search=${encodeURIComponent(nextSearch.trim())}` : "";
      const response = await fetch(`/api/admin/merchants${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossibile caricare i commercianti.");
      setMerchants(data.merchants ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Errore durante il caricamento.");
    }
  }

  useEffect(() => { void load(""); }, []);

  return <>
    <Header />
    <main className="page"><div className="shell">
      <Link href="/admin">← Amministrazione</Link>
      <div className="eyebrow" style={{ marginTop: 24 }}>AMMINISTRAZIONE</div>
      <h1>Commercianti</h1>
      <p className="lead">Ricerca e gestione delle aziende e dei crediti collegati ai servizi VeriDrive.</p>
      <div className="panel admin-search">
        <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(search); }} placeholder="Cerca azienda, nome o telefono" />
        <button type="button" className="button" onClick={() => void load(search)}>Cerca</button>
      </div>
      {message && <p className="notice error-notice">{message}</p>}
      <section className="panel admin-list-panel">
        {merchants.length === 0 ? <p style={{ marginBottom: 0 }}>Nessun commerciante trovato.</p> : <div className="admin-list">
          {merchants.map((merchant) => <article className="card admin-list-card" key={merchant.id}>
            <div>
              <strong>{merchant.company_name || merchant.full_name || "Commerciante"}</strong>
              {(merchant.full_name && merchant.company_name) && <div className="muted">{merchant.full_name}</div>}
              {merchant.phone && <div className="muted">{merchant.phone}</div>}
            </div>
            <div className="metric"><span>Crediti</span><strong>{merchant.credits ?? 0}</strong></div>
          </article>)}
        </div>}
      </section>
    </div></main>
  </>;
}
