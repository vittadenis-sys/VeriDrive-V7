"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, Menu, UserRound, Settings, Clock3 } from "lucide-react";
import { Header } from "@/components/Header";

const stats = [
  { label: "Verifiche oggi", value: "4", icon: ClipboardList },
  { label: "Da completare", value: "2", icon: CalendarDays },
  { label: "Guadagni mese", value: "€1.020", icon: Euro },
];

const jobs = [
  { id: "VD-24091", time: "10:30", car: "Volkswagen Golf 1.5 TSI", plate: "AB123CD", service: "Plus", payout: "€80", status: "Da iniziare" },
  { id: "VD-24092", time: "14:00", car: "Fiat 500 1.0 Hybrid", plate: "EF456GH", service: "Premium", payout: "€80", status: "In attesa" },
  { id: "VD-24088", time: "Ieri", car: "BMW 320d", plate: "IL789MN", service: "Plus + Urgenza", payout: "€95", status: "Completata" },
];

const nav = [
  ["Panoramica", "/officina", Home],
  ["Calendario", "/officina/calendario", CalendarDays],
  ["Pratiche", "/officina/checklist", ClipboardList],
  ["Guadagni", "/officina/guadagni", Euro],
  ["Profilo", "/officina/profilo", UserRound],
] as const;

export default function Officina() {
  return (
    <>
      <Header />
      <div className="dashboard">
        <aside className="side" style={{ paddingBottom: 96 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
            <div>
              <div className="eyebrow">Partner VeriDrive</div>
              <h2 style={{ marginBottom: 0 }}>Centro Auto Milano</h2>
            </div>
            <Menu size={22} aria-hidden />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {nav.map(([label, href, Icon]) => (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
                <Icon size={19} />
                {label}
              </Link>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Settings size={18} /><b>Impostazioni rapide</b></div>
            <p style={{ margin: "10px 0 6px", fontSize: 14 }}>Massimo 4 verifiche al giorno</p>
            <Link href="/officina/calendario" style={{ fontSize: 14 }}>Modifica disponibilità</Link>
          </div>
        </aside>

        <main className="main" style={{ paddingBottom: 96 }}>
          <div className="eyebrow">Panoramica officina</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", marginBottom: 8 }}>Buongiorno, Andrea</h1>
              <p className="lead" style={{ marginBottom: 0 }}>Hai 2 verifiche da gestire oggi.</p>
            </div>
            <Link className="button" href="/officina/checklist">Apri prossima pratica</Link>
          </div>

          <section style={{ padding: "28px 0 8px" }}>
            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {stats.map(({ label, value, icon: Icon }) => (
                <div className="metric" key={label} style={{ minHeight: 132 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={20} />{label}</div>
                  <strong style={{ marginTop: 12, fontSize: 34 }}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={{ padding: "28px 0" }}>
            <div className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <div className="eyebrow">Oggi</div>
                  <h3 style={{ marginBottom: 4 }}>Le tue pratiche</h3>
                  <p style={{ marginBottom: 0, opacity: 0.76 }}>Apri una pratica e lavora direttamente dal telefono o dal PC.</p>
                </div>
                <Link href="/officina/checklist">Vedi tutte</Link>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {jobs.map((job) => (
                  <div key={job.id} style={{ border: "1px solid rgba(127,127,127,.18)", borderRadius: 18, padding: 16, display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                        <strong>{job.car}</strong>
                        <span className="badge">{job.service}</span>
                      </div>
                      <div style={{ fontSize: 14, opacity: 0.72 }}>{job.id} · {job.plate} · {job.time}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{job.payout}</span>
                      <span className="badge">{job.status}</span>
                      {job.status !== "Completata" && <Link className="button secondary" href="/officina/checklist">Apri</Link>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={{ padding: "0 0 28px" }}>
            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Link className="card" href="/officina/calendario">
                <Clock3 size={22} />
                <h3 style={{ marginTop: 10 }}>Disponibilità</h3>
                <p>Imposta i singoli orari prenotabili, capacità giornaliera e chiusure.</p>
              </Link>
              <Link className="card" href="/officina/guadagni">
                <Euro size={22} />
                <h3 style={{ marginTop: 10 }}>Guadagni</h3>
                <p>Controlla compensi, urgenze e pratiche già liquidate.</p>
              </Link>
            </div>
          </section>
        </main>
      </div>

      <nav aria-label="Navigazione officina mobile" style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 50, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: 8, borderRadius: 20, border: "1px solid rgba(127,127,127,.18)", background: "rgba(255,255,255,.94)", backdropFilter: "blur(16px)", boxShadow: "0 12px 40px rgba(0,0,0,.12)" }}>
        {nav.slice(0, 4).map(([label, href, Icon]) => (
          <Link key={href} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "9px 4px", fontSize: 12, fontWeight: 600 }}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
