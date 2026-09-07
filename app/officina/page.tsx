"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, UserRound, Settings, Clock3, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";

type Booking = {
  id: string;
  plate: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  requested_date: string | null;
  requested_slot: string | null;
  status: string;
  service_key: string;
  urgency: boolean;
  customer_price_cents: number;
  payout: { amount_cents: number; status: string; paid_at: string | null } | null;
};

type DashboardPayload = {
  workshop: { id: string; name: string; city: string | null; address: string | null; postal_code: string | null };
  bookings: Booking[];
};

const nav = [
  ["Panoramica", "/officina", Home],
  ["Calendario", "/officina/calendario", CalendarDays],
  ["Pratiche", "/officina", ClipboardList],
  ["Guadagni", "/officina/guadagni", Euro],
  ["Profilo", "/officina/profilo", UserRound],
] as const;

const SERVICE_NAMES: Record<string, string> = {
  check_viaggio: "Check Viaggio",
  veriscore: "Check-up + VeriScore",
  check_online: "Check Online",
  veriscore_plus: "Check-up + VeriScorePlus",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Richiesta",
  assigned: "Assegnata",
  confirmed: "Confermata",
  in_progress: "In lavorazione",
  completed: "Conclusa",
  cancelled: "Annullata",
  refunded: "Rimborsata",
};

export default function Officina() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setMessage("");
    try {
      const response = await fetch("/api/workshop/dashboard", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossibile caricare la dashboard.");
      setData(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossibile caricare la dashboard.");
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayBookings = data?.bookings.filter((booking) => booking.requested_date === today).length ?? 0;
    const open = data?.bookings.filter((booking) => ["assigned", "confirmed", "in_progress"].includes(booking.status)).length ?? 0;
    const due = (data?.bookings ?? []).filter((booking) => booking.payout?.status === "pending").reduce((sum, booking) => sum + (booking.payout?.amount_cents ?? 0), 0);
    return [
      { label: "Prenotazioni oggi", value: String(todayBookings), icon: ClipboardList },
      { label: "Da completare", value: String(open), icon: CalendarDays },
      { label: "Da liquidare", value: `€${(due / 100).toFixed(2).replace('.', ',')}`, icon: Euro },
    ];
  }, [data]);

  async function changeStatus(id: string, toStatus: "confirmed" | "in_progress") {
    setBusyId(id); setMessage("");
    try {
      const response = await fetch("/api/workshop/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, toStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossibile aggiornare la pratica.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossibile aggiornare la pratica.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Header />
      <div className="dashboard workshop-dashboard">
        <aside className="side workshop-side" style={{ paddingBottom: 96 }}>
          <div className="workshop-side-head">
            <div className="eyebrow">Partner VeriDrive</div>
            <h2 style={{ marginBottom: 4 }}>{data?.workshop ? `VeriDrive ${data.workshop.city ?? ""} — ${data.workshop.name}` : "Officina VeriDrive"}</h2>
            <p style={{ margin: 0, opacity: .7, fontSize: 14 }}>Dashboard operativa</p>
          </div>
          <nav className="workshop-nav" aria-label="Navigazione officina">
            {nav.map(([label, href, Icon]) => <Link key={label} href={href} className="workshop-nav-link"><Icon size={19} />{label}</Link>)}
          </nav>
          <div className="panel workshop-tools">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Settings size={18} /><b>Operatività</b></div>
            <p style={{ margin: "10px 0 6px", fontSize: 14 }}>Gestisci disponibilità e chiusure dal calendario.</p>
            <Link href="/officina/calendario" style={{ fontSize: 14 }}>Apri calendario</Link>
          </div>
          <Link href="/admin" className="button secondary workshop-admin-switch"><ShieldCheck size={18} /> Amministrazione</Link>
        </aside>

        <main className="main workshop-main" style={{ paddingBottom: 96 }}>
          <div className="workshop-mobile-toolbar">
            <Link href="/admin" className="button secondary"><ShieldCheck size={17} /> Admin</Link>
            <button type="button" className="button" onClick={() => void load()}>Aggiorna</button>
          </div>
          <div className="eyebrow">Panoramica officina</div>
          <div className="workshop-hero-row">
            <div>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", marginBottom: 8 }}>Le tue prenotazioni</h1>
              <p className="lead" style={{ marginBottom: 0 }}>Lavora sulle pratiche assegnate e avvia la verifica direttamente da qui.</p>
            </div>
            <button type="button" className="button workshop-desktop-refresh" onClick={() => void load()}>Aggiorna</button>
          </div>

          {message && <div className="notice error-notice" style={{ marginTop: 18 }}>{message}</div>}

          <section style={{ padding: "28px 0 8px" }}>
            <div className="cards workshop-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {stats.map(({ label, value, icon: Icon }) => <div className="metric" key={label} style={{ minHeight: 132 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={20} />{label}</div><strong style={{ marginTop: 12, fontSize: 34 }}>{value}</strong></div>)}
            </div>
          </section>

          <section style={{ padding: "28px 0" }}>
            <div className="panel workshop-bookings-panel">
              <div className="workshop-panel-head">
                <div><div className="eyebrow">Pratiche</div><h3 style={{ marginBottom: 4 }}>Elenco vetture</h3><p style={{ marginBottom: 0, opacity: .76 }}>Solo pratiche assegnate a questa officina.</p></div>
                <span className="badge">{data?.bookings.length ?? 0} pratiche</span>
              </div>
              <div className="workshop-bookings-list">
                {(data?.bookings ?? []).length === 0 && <div className="empty-state">Nessuna pratica assegnata.</div>}
                {(data?.bookings ?? []).map((booking) => {
                  const vehicle = [booking.vehicle_make, booking.vehicle_model, booking.vehicle_year].filter(Boolean).join(" ");
                  const payout = booking.payout ? `€${(booking.payout.amount_cents / 100).toFixed(2).replace('.', ',')}` : "—";
                  return <article key={booking.id} className="workshop-booking-card">
                    <div className="workshop-booking-main">
                      <div className="workshop-booking-title"><strong>{vehicle || "Veicolo"}</strong><span className="badge">{SERVICE_NAMES[booking.service_key] ?? booking.service_key}</span>{booking.urgency && <span className="badge">Urgenza</span>}</div>
                      <div className="workshop-booking-meta">{booking.plate} · {booking.requested_date ?? "Data da definire"} {booking.requested_slot ?? ""}</div>
                    </div>
                    <div className="workshop-booking-actions">
                      <span className="badge">{STATUS_LABELS[booking.status] ?? booking.status}</span>
                      {booking.status === "assigned" && <button type="button" className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "confirmed")}>{busyId === booking.id ? "…" : "Conferma"}</button>}
                      {booking.status === "confirmed" && <button type="button" className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "in_progress")}>{busyId === booking.id ? "…" : "Inizia verifica"}</button>}
                      {booking.status !== "completed" && booking.status !== "cancelled" && booking.status !== "refunded" && <Link className="button" href={`/officina/checklist?booking=${booking.id}`}>Checklist</Link>}
                      {booking.status === "completed" && <Link className="button secondary" href={`/officina/checklist?booking=${booking.id}`}>Rivedi</Link>}
                      <span className="workshop-payout">{payout}</span>
                    </div>
                  </article>;
                })}
              </div>
            </div>
          </section>

          <section style={{ padding: "0 0 28px" }}>
            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Link className="card" href="/officina/calendario"><Clock3 size={22} /><h3 style={{ marginTop: 10 }}>Disponibilità</h3><p>Imposta gli slot prenotabili, capacità giornaliera e chiusure.</p></Link>
              <Link className="card" href="/officina/guadagni"><Euro size={22} /><h3 style={{ marginTop: 10 }}>Guadagni</h3><p>Vedi pratiche concluse e compensi ancora da liquidare.</p></Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
