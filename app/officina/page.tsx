"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, UserRound, Clock3, Shield } from "lucide-react";
import { Header } from "@/components/Header";

type Booking = {
  id: string;
  booking_code: string | null;
  customer_id: string;
  vehicle_id: string | null;
  workshop_id: string;
  service: string;
  status: string;
  inspection_date: string | null;
  total: number | null;
  vehicle?: Record<string, unknown> | null;
  customer?: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
};

type DashboardPayload = {
  workshop: { id: string; name: string; city: string | null; address: string | null; cap: number | null };
  bookings: Booking[];
  isSuperAdmin?: boolean;
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

function vehicleLabel(vehicle: Record<string, unknown> | null | undefined) {
  if (!vehicle) return "Veicolo";
  const make = vehicle.make ?? vehicle.vehicle_make ?? vehicle.brand ?? vehicle.marca;
  const model = vehicle.model ?? vehicle.vehicle_model ?? vehicle.modello;
  const year = vehicle.year ?? vehicle.vehicle_year ?? vehicle.anno;
  return [make, model, year].filter(Boolean).join(" ") || "Veicolo";
}

export default function Officina() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setMessage("");
    try {
      const response = await fetch("/api/workshop/dashboard", { cache: "no-store", credentials: "include" });
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
    const bookings = data?.bookings ?? [];
    return [
      { label: "Prenotazioni oggi", value: String(bookings.filter((booking) => booking.inspection_date?.slice(0, 10) === today).length), icon: ClipboardList },
      { label: "Da completare", value: String(bookings.filter((booking) => ["requested", "assigned", "confirmed", "in_progress"].includes(booking.status)).length), icon: CalendarDays },
      { label: "Da liquidare", value: `€${bookings.filter((booking) => ["requested", "assigned", "confirmed", "in_progress"].includes(booking.status)).reduce((sum, booking) => sum + Number(booking.total ?? 0), 0).toFixed(2).replace(".", ",")}`, icon: Euro },
    ];
  }, [data]);

  async function changeStatus(id: string, toStatus: "confirmed" | "in_progress") {
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/workshop/status", {
        method: "PATCH",
        credentials: "include",
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
          <section className="workshop-hero-card">
            <div className="workshop-title-copy">
              <div className="eyebrow">Partner VeriDrive</div>
              <h1>{data?.workshop?.name ? `Officina ${data.workshop.name}` : "Officina VeriDrive"}</h1>
              <p>Dashboard operativa</p>
            </div>
            <div className="workshop-head-actions">
              {data?.isSuperAdmin && <Link className="button secondary" href="/admin"><Shield size={18} /> Admin</Link>}
              <button className="button" type="button" onClick={() => void load()}>Aggiorna</button>
            </div>
          </section>

          <nav className="workshop-nav-bar" aria-label="Navigazione officina">
            {nav.map(([label, href, Icon]) => (
              <Link key={`${label}-${href}`} href={href}>
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <section className="workshop-stats-section">
            <div className="workshop-stats-grid">
              {stats.map(({ label, value, icon: Icon }) => (
                <article className="metric workshop-stat-card" key={label}>
                  <div className="workshop-stat-label"><Icon size={20} /><span>{label}</span></div>
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
              {message && <p className="notice workshop-message">{message}</p>}
              <div className="workshop-bookings">
                {(data?.bookings ?? []).length === 0 && !message && <div className="notice">Nessuna pratica assegnata.</div>}
                {(data?.bookings ?? []).map((booking) => (
                  <article className="workshop-booking" key={booking.id}>
                    <div className="workshop-booking-main">
                      <div className="workshop-booking-title">
                        <strong>{vehicleLabel(booking.vehicle)}</strong>
                        <span className="badge">{SERVICE_NAMES[booking.service] ?? booking.service}</span>
                      </div>
                      <div className="workshop-booking-meta">
                        {booking.booking_code ? `${booking.booking_code} · ` : ""}
                        {booking.customer?.full_name || booking.customer?.email || "Cliente"} · {booking.inspection_date ? new Date(booking.inspection_date).toLocaleString("it-IT") : "Data da definire"}
                      </div>
                    </div>
                    <div className="workshop-booking-actions">
                      <span className="badge">{STATUS_LABELS[booking.status] ?? booking.status}</span>
                      {booking.status === "requested" && <button className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "confirmed")}>{busyId === booking.id ? "…" : "Conferma"}</button>}
                      {booking.status === "assigned" && <button className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "confirmed")}>{busyId === booking.id ? "…" : "Conferma"}</button>}
                      {booking.status === "confirmed" && <button className="button secondary" disabled={busyId === booking.id} onClick={() => void changeStatus(booking.id, "in_progress")}>{busyId === booking.id ? "…" : "Inizia verifica"}</button>}
                      {booking.status !== "completed" && booking.status !== "cancelled" && booking.status !== "refunded" && <Link className="button" href={`/officina/checklist?booking=${booking.id}`}>Checklist</Link>}
                      {booking.status === "completed" && <Link className="button secondary" href={`/officina/checklist?booking=${booking.id}`}>Rivedi</Link>}
                      {booking.total != null && <span className="workshop-payout">€{Number(booking.total).toFixed(2).replace(".", ",")}</span>}
                    </div>
                  </article>
                ))}
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
