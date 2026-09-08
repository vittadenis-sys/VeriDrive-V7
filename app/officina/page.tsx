"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, UserRound, Clock3, Shield } from "lucide-react";
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  async function load() {
    setMessage("");
    try {
      const response = await fetch("/api/workshop/dashboard", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossibile caricare i dati dell'officina.");
      setData(payload);
      setIsSuperAdmin(payload.isSuperAdmin === true);
    } catch (error) {
      setData(null);
      setIsSuperAdmin(false);
      setMessage(error instanceof Error ? error.message : "Impossibile caricare i dati dell'officina.");
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const bookings = data?.bookings ?? [];
    return [
      { label: "Prenotazioni oggi", value: String(bookings.filter((booking) => booking.requested_date === today).length), icon: ClipboardList },
      { label: "Da completare", value: String(bookings.filter((booking) => ["assigned", "confirmed", "in_progress"].includes(booking.status)).length), icon: CalendarDays },
      { label: "Da liquidare", value: `€${(bookings.filter((booking) => booking.payout?.status === "pending").reduce((sum, booking) => sum + (booking.payout?.amount_cents ?? 0), 0) / 100).toFixed(2).replace(".", ",")}`, icon: Euro },
    ];
  }, [data]);

  async function changeStatus(id: string, toStatus: "confirmed" | "in_progress") {
    setBusyId(id);
    setMessage("");
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
      <main className="page workshop-page">
        <div className="shell">
          <section className="workshop-mobile-title">
            <div className="eyebrow">Partner VeriDrive</div>
            <h1>{data?.workshop?.name ? `Officina ${data.workshop.name}` : "Officina VeriDrive"}</h1>
            <p>Dashboard operativa</p>
          </section>

          <section className="workshop-toolbar">
            <div>
              <div className="eyebrow">Panoramica officina</div>
              <h2>Le tue prenotazioni</h2>
              <p className="lead">Lavora sulle pratiche assegnate e avvia la verifica direttamente da qui.</p>
            </div>
            <div className="workshop-head-actions">
              {isSuperAdmin && <Link className="button secondary" href="/admin"><Shield size={18} /> Admin</Link>}
              <button className="button" type="button" onClick={() => void load()}>Aggiorna</button>
            </div>
          </section>

          <nav className="workshop-nav-bar" aria-label="Navigazione officina">
            {nav.map(([label, href, Icon]) => (
              <Link key={`${label}-${href}`} href={href}>
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <section className="workshop-stats-section">
            <div className="workshop-stats-grid">
              {stats.map(({ label, value, icon: Icon }) => (
                <article className="metric workshop-stat-card" key={label}>
                  <div className="workshop-stat-label"><Icon size={21} /><span>{label}</span></div>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="workshop-practices-section">
            <div className="panel workshop-practices-panel">
              <div className="workshop-section-head">
                <div>
                  <div className="eyebrow">Pratiche</div>
                  <h2>Elenco vetture</h2>
                  <p>Solo pratiche assegnate a questa officina.</p>
                </div>
                <span className="badge">{data?.bookings.length ?? 0} pratiche</span>
              </div>

              {message && <p className="notice workshop-message">Impossibile caricare i dati dell'officina.</p>}
              <div className="workshop-bookings">
                {(data?.bookings ?? []).length === 0 && !message && <div className="notice">Nessuna pratica assegnata.</div>}
                {(data?.bookings ?? []).map((booking) => {
                  const vehicle = [booking.vehicle_make, booking.vehicle_model, booking.vehicle_year].filter(Boolean).join(" ");
                  const payout = booking.payout ? `€${(booking.payout.amount_cents / 100).toFixed(2).replace(".", ",")}` : "—";
                  return (
                    <article className="workshop-booking" key={booking.id}>
                      <div className="workshop-booking-main">
                        <div className="workshop-booking-title">
                          <strong>{vehicle || "Veicolo"}</strong>
                          <span className="badge">{SERVICE_NAMES[booking.service_key] ?? booking.service_key}</span>
                          {booking.urgency && <span className="badge">Urgenza</span>}
                        </div>
                        <div className="workshop-booking-meta">{booking.plate} · {booking.requested_date ?? "Data da definire"} {booking.requested_slot ?? ""}</div>
                      </div>
                      <div className="workshop-booking-actions">
                        <span className="badge">{STATUS_LABELS[booking.status] ?? booking.status}</span>
                        {booking.status === "assigned" && <button className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "confirmed")}>{busyId === booking.id ? "…" : "Conferma"}</button>}
                        {booking.status === "confirmed" && <button className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "in_progress")}>{busyId === booking.id ? "…" : "Inizia verifica"}</button>}
                        {booking.status !== "completed" && booking.status !== "cancelled" && booking.status !== "refunded" && <Link className="button" href={`/officina/checklist?booking=${booking.id}`}>Checklist</Link>}
                        {booking.status === "completed" && <Link className="button secondary" href={`/officina/checklist?booking=${booking.id}`}>Rivedi</Link>}
                        <span className="workshop-payout">{payout}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="workshop-bottom">
            <Link className="card workshop-bottom-card" href="/officina/calendario">
              <Clock3 size={22} />
              <div><h3>Disponibilità</h3><p>Imposta gli slot prenotabili, capacità giornaliera e chiusure.</p></div>
            </Link>
            <Link className="card workshop-bottom-card" href="/officina/guadagni">
              <Euro size={22} />
              <div><h3>Guadagni</h3><p>Vedi pratiche concluse e compensi ancora da liquidare.</p></div>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
