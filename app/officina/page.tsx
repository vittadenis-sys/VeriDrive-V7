"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, UserRound, Clock3, Shield, Download, Zap } from "lucide-react";
import { Header } from "@/components/Header";
import styles from "./officina.module.css";

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
  overall_notes?: string | null;
  vehicle?: Record<string, unknown> | null;
  customer?: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
  certificate_id?: string | null;
  certificate_code?: string | null;
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

function bookingSnapshot(booking: Booking) {
  if (typeof booking.vehicle === "object" && booking.vehicle) return booking.vehicle;
  if (typeof booking.overall_notes !== "string" || !booking.overall_notes.trim()) return null;
  try {
    const parsed = JSON.parse(booking.overall_notes);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getStored(booking: Booking, ...keys: string[]) {
  const snapshot = bookingSnapshot(booking);
  for (const key of keys) {
    const value = snapshot?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function vehicleLabel(booking: Booking) {
  const make = getStored(booking, "make", "vehicle_make", "brand", "marca");
  const model = getStored(booking, "model", "vehicle_model", "modello");
  const year = getStored(booking, "year", "vehicle_year", "anno");
  return [make, model, year].filter(Boolean).join(" ") || "Veicolo";
}

function vehiclePlate(booking: Booking) {
  const plate = getStored(booking, "plate", "registration", "license_plate", "targa");
  return typeof plate === "string" && plate.trim() ? plate.trim().toUpperCase() : null;
}

export default function Officina() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"active" | "completed">("active");
  const [instantOpen, setInstantOpen] = useState(false);
  const [instantBusy, setInstantBusy] = useState(false);
  const [instantMessage, setInstantMessage] = useState("");

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

  const canInstantBook = data?.isSuperAdmin === true && data?.workshop?.name?.toLowerCase().includes("autogerma");

  async function submitInstantBooking(form: FormData) {
    setInstantBusy(true);
    setInstantMessage("");
    try {
      const response = await fetch("/api/workshop/instant-booking", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: String(form.get("customerEmail") ?? "").trim(),
          service: String(form.get("service") ?? "").trim(),
          plate: String(form.get("plate") ?? "").trim(),
          make: String(form.get("make") ?? "").trim(),
          model: String(form.get("model") ?? "").trim(),
          location: String(form.get("location") ?? "").trim(),
          date: String(form.get("date") ?? "").trim(),
          time: String(form.get("time") ?? "").trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Impossibile creare la prenotazione istantanea.");
      setInstantMessage(payload.customerCreated ? `Prenotazione ${payload.practiceNumber ?? payload.bookingId} creata. Account cliente creato e email inviata.` : `Prenotazione ${payload.practiceNumber ?? payload.bookingId} creata.`);
      setInstantOpen(false);
      await load();
    } catch (error) {
      setInstantMessage(error instanceof Error ? error.message : "Impossibile creare la prenotazione istantanea.");
    } finally {
      setInstantBusy(false);
    }
  }

  const filteredBookings = useMemo(() => {
    const bookings = data?.bookings ?? [];
    if (activeFilter === "completed") return bookings.filter((booking) => ["completed", "cancelled", "refunded"].includes(booking.status));
    return bookings.filter((booking) => !["completed", "cancelled", "refunded"].includes(booking.status));
  }, [activeFilter, data]);

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
      const response = await fetch("/api/workshop/status", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: id, toStatus }) });
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
            <div className="workshop-title-copy"><div className="eyebrow">Partner VeriDrive</div><h1>{data?.workshop?.name ? `Officina ${data.workshop.name}` : "Officina VeriDrive"}</h1><p>Dashboard operativa</p></div>
            <div className="workshop-head-actions">{data?.isSuperAdmin && <Link className="button secondary" href="/admin"><Shield size={18} /> Admin</Link>}<button className="button" type="button" onClick={() => void load()}>Aggiorna</button></div>
          </section>

          <nav className={`workshop-nav-bar ${styles.workshopMobileNav}`} aria-label="Navigazione officina">
            {nav.map(([label, href, Icon]) => <Link key={`${label}-${href}`} href={href}><Icon size={19} /><span>{label}</span></Link>)}
          </nav>

          <section className="workshop-stats-section"><div className="workshop-stats-grid">{stats.map(({ label, value, icon: Icon }) => <article className="metric workshop-stat-card" key={label}><div className="workshop-stat-label"><Icon size={20} /><span>{label}</span></div><strong>{value}</strong></article>)}</div></section>

          {canInstantBook && <div className={styles.instantBookingBar}>
            <button type="button" className="button" onClick={() => { setInstantMessage(""); setInstantOpen(true); }}><Zap size={18} /> Prenotazione istantanea</button>
            {instantMessage && <p className="notice" style={{ margin: 0 }}>{instantMessage}</p>}
          </div>}

          {instantOpen && canInstantBook && <div className={styles.instantOverlay} role="dialog" aria-modal="true" aria-label="Prenotazione istantanea">
            <form className={styles.instantModal} action={submitInstantBooking}>
              <div className={styles.instantModalHead}><div><div className="eyebrow">AUTOGERMA</div><h2>Prenotazione istantanea</h2><p>La pratica viene creata direttamente in officina e parte come confermata.</p></div><button type="button" className="button secondary" onClick={() => setInstantOpen(false)}>Chiudi</button></div>
              <div className="form">
                <label className="full">Email cliente <span style={{ opacity: .7 }}>(facoltativa)</span><input name="customerEmail" type="email" placeholder="lascia vuoto per admin@veridrive.it" /></label>
                <label>Servizio<select name="service" defaultValue="veriscore"><option value="check_viaggio">Check Viaggio</option><option value="veriscore">Check-up + VeriScore</option><option value="veriscore_plus">Check-up + VeriScorePlus</option></select></label>
                <label>Targa<input name="plate" required placeholder="AB123CD" autoCapitalize="characters" /></label>
                <label>Marca <span style={{ opacity: .7 }}>(facoltativa)</span><input name="make" placeholder="Es. Volkswagen" /></label>
                <label>Modello <span style={{ opacity: .7 }}>(facoltativo)</span><input name="model" placeholder="Es. Golf 1.5 TSI" /></label>
                <label className="full">Dove si trova l'auto?<input name="location" defaultValue={data?.workshop?.address ?? ""} placeholder="Indirizzo, CAP o città" /></label>
                <label>Data<input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
                <label>Ora<input name="time" type="time" defaultValue={new Date().toTimeString().slice(0, 5)} required /></label>
              </div>
              {instantMessage && <p className="notice">{instantMessage}</p>}
              <div className={styles.instantModalActions}><button type="button" className="button secondary" onClick={() => setInstantOpen(false)}>Annulla</button><button type="submit" className="button" disabled={instantBusy}>{instantBusy ? "Creazione…" : "Crea prenotazione gratuita"}</button></div>
            </form>
          </div>}

          <section className="workshop-practices-section">
            <div className="panel workshop-practices-panel">
              <div className="workshop-section-head"><div><div className="eyebrow">Pratiche</div><h2>Elenco vetture</h2><p>Solo pratiche assegnate a questa officina.</p></div><span className="badge">{data?.bookings.length ?? 0} pratiche</span></div>
              <div className={styles.workshopFilters} role="tablist" aria-label="Filtro pratiche">
                <button type="button" className={activeFilter === "active" ? styles.workshopFilterActive : styles.workshopFilter} onClick={() => setActiveFilter("active")}>Attive</button>
                <button type="button" className={activeFilter === "completed" ? styles.workshopFilterActive : styles.workshopFilter} onClick={() => setActiveFilter("completed")}>Concluse / Storico</button>
              </div>
              {message && <p className="notice workshop-message">{message}</p>}
              <div className="workshop-bookings">
                {filteredBookings.length === 0 && !message && <div className="notice">Nessuna pratica in questa sezione.</div>}
                {filteredBookings.map((booking) => {
                  const label = vehicleLabel(booking);
                  const plate = vehiclePlate(booking);
                  return <article className={`workshop-booking ${styles.workshopBooking}`} key={booking.id}>
                    <div className="workshop-booking-main">
                      <div className="workshop-booking-title"><strong>{label}</strong><span className="badge">{SERVICE_NAMES[booking.service] ?? booking.service}</span></div>
                      <div className={styles.workshopVehicleDetails}>{plate && <span><strong>Targa:</strong> {plate}</span>}</div>
                      <div className="workshop-booking-meta">{booking.booking_code ? `${booking.booking_code} · ` : ""}{booking.customer?.full_name || booking.customer?.email || "Cliente"} · {booking.inspection_date ? new Date(booking.inspection_date).toLocaleString("it-IT") : "Data da definire"}</div>
                    </div>
                    <div className="workshop-booking-actions">
                      <span className="badge">{STATUS_LABELS[booking.status] ?? booking.status}</span>
                      {(booking.status === "requested" || booking.status === "assigned") && <button type="button" className="button secondary" disabled={busyId === booking.id} onClick={(e) => { e.preventDefault(); void changeStatus(booking.id, "confirmed"); }}>{busyId === booking.id ? "…" : "Conferma"}</button>}
                      {booking.status === "confirmed" && <button type="button" className="button secondary" disabled={busyId === booking.id} onClick={(e) => { e.preventDefault(); void changeStatus(booking.id, "in_progress"); }}>{busyId === booking.id ? "…" : "Inizia verifica"}</button>}
                      {booking.status !== "completed" && booking.status !== "cancelled" && booking.status !== "refunded" && <Link className="button" href={`/officina/checklist?booking=${booking.id}`}>Checklist</Link>}
                      {booking.status === "completed" && <Link className="button secondary" href={`/officina/checklist?booking=${booking.id}`}>Rivedi</Link>}
                      {booking.status === "completed" && booking.certificate_id && <button type="button" className="button" onClick={async () => { try { const response = await fetch(`/api/workshop/certificates/${encodeURIComponent(booking.certificate_id!)}/pdf?download=1`, { credentials: "include" }); if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error || "Impossibile scaricare il PDF."); } const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `VeriDrive-${booking.certificate_code ?? booking.certificate_id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile scaricare il PDF."); } }}><Download size={17} /> PDF</button>}
                      {booking.total != null && <span className="workshop-payout">€{Number(booking.total).toFixed(2).replace(".", ",")}</span>}
                    </div>
                  </article>;
                })}
              </div>
            </div>
          </section>

          <section className="workshop-bottom">
            <Link className={`card workshop-bottom-card ${styles.workshopBottomCard}`} href="/officina/calendario"><Clock3 size={22} /><div><h3>Disponibilità</h3><p>Imposta gli slot prenotabili, capacità giornaliera e chiusure.</p></div></Link>
            <Link className={`card workshop-bottom-card ${styles.workshopBottomCard}`} href="/officina/guadagni"><Euro size={22} /><div><h3>Guadagni</h3><p>Vedi pratiche concluse e compensi ancora da liquidare.</p></div></Link>
          </section>
        </div>
      </main>
    </>
  );
}
