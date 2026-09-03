"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, Menu, UserRound, Settings, Clock3, Building2, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";

const stats = [
  { label: "Verifiche oggi", value: "0", icon: ClipboardList },
  { label: "Da completare", value: "0", icon: CalendarDays },
  { label: "Guadagni mese", value: "€0", icon: Euro },
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
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow">Partner VeriDrive</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Building2 size={22} /><h2 style={{ margin: 0 }}>VeriDrive Faloppio — Autogerma</h2></div>
            <p style={{ margin: "6px 0 0", opacity: .7, fontSize: 14 }}>Officina Principale</p>
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
            <p style={{ margin: "10px 0 6px", fontSize: 14 }}>Questa officina usa le stesse regole delle officine partner.</p>
            <Link href="/officina/calendario" style={{ fontSize: 14 }}>Modifica disponibilità</Link>
          </div>
        </aside>

        <main className="main" style={{ paddingBottom: 96 }}>
          <div className="eyebrow">Panoramica officina</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", marginBottom: 8 }}>Dashboard officina</h1>
              <p className="lead" style={{ marginBottom: 0 }}>Vista operativa identica a quella dei partner VeriDrive.</p>
            </div>
            <Link className="button" href="/officina/checklist">Apri una pratica di test</Link>
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
                  <div className="eyebrow">Agenda</div>
                  <h3 style={{ marginBottom: 4 }}>Le tue pratiche</h3>
                  <p style={{ marginBottom: 0, opacity: 0.76 }}>Le prenotazioni reali compariranno qui quando saranno assegnate a questa officina.</p>
                </div>
                <Link href="/officina/calendario">Apri calendario</Link>
              </div>
              <div className="notice" style={{ display: "flex", gap: 10, alignItems: "center" }}><CheckCircle2 size={20} /><span>Nessuna prenotazione assegnata al momento.</span></div>
            </div>
          </section>

          <section style={{ padding: "0 0 28px" }}>
            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Link className="card" href="/officina/calendario"><Clock3 size={22} /><h3 style={{ marginTop: 10 }}>Disponibilità</h3><p>Imposta gli orari prenotabili, capacità giornaliera e chiusure.</p></Link>
              <Link className="card" href="/officina/checklist"><ClipboardList size={22} /><h3 style={{ marginTop: 10 }}>Pratica di test</h3><p>Prova checklist, VeriScore, note, foto e chiusura della verifica.</p></Link>
              <Link className="card" href="/officina/guadagni"><Euro size={22} /><h3 style={{ marginTop: 10 }}>Guadagni</h3><p>Controlla compensi, urgenze e pratiche già liquidate.</p></Link>
            </div>
          </section>
        </main>
      </div>

      <nav aria-label="Navigazione officina mobile" style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 50, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: 8, borderRadius: 20, border: "1px solid rgba(127,127,127,.18)", background: "rgba(255,255,255,.94)", backdropFilter: "blur(16px)", boxShadow: "0 12px 40px rgba(0,0,0,.12)" }}>
        {nav.slice(0, 4).map(([label, href, Icon]) => (<Link key={href} href={href} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "9px 4px", fontSize: 12, fontWeight: 600 }}><Icon size={20} /><span>{label}</span></Link>))}
      </nav>
    </>
  );
}
