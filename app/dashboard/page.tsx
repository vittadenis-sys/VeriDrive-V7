"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileCheck2, Plus, ShieldCheck, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import styles from "./dashboard.module.css";

const SERVICE_NAMES: Record<string, string> = {
  check_viaggio: "Check-up + Check Viaggio",
  veriscore: "Check-up + VeriScore",
  check_online: "Check Online",
  veriscore_plus: "Check-up + VeriScorePlus",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Richiesta ricevuta",
  assigned: "Officina assegnata",
  confirmed: "Appuntamento confermato",
  in_progress: "Verifica in corso",
  completed: "Verifica conclusa",
  cancelled: "Annullata",
  refunded: "Rimborsata",
};

type Booking = {
  id: string;
  practice_code: string | null;
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
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
};

type Certificate = {
  id: string;
  booking_id: string;
  public_code: string;
  vehicle_plate: string;
  vehicle_vin: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_mileage: number;
  veriscore: number;
  workshop_id: string;
  issued_at: string;
};

type Payload = {
  customer: { id: string; full_name: string; phone: string | null };
  bookings: Booking[];
  certificates: Certificate[];
};

function money(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(value: string | null) {
  if (!value) return "Data da definire";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatIssuedAt(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function Dashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"verifiche" | "certificati">("verifiche");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/customer/bookings", { cache: "no-store", credentials: "include" });
      const payload = (await response.json()) as Payload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Accesso richiesto.");
      setData(payload);
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : "Accesso richiesto.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    const bookings = data?.bookings ?? [];
    return {
      total: bookings.length,
      active: bookings.filter((booking) => ["requested", "assigned", "confirmed", "in_progress"].includes(booking.status)).length,
      completed: bookings.filter((booking) => booking.status === "completed").length,
    };
  }, [data]);

  const certificatesByBooking = useMemo(() => {
    const map = new Map<string, Certificate>();
    for (const certificate of data?.certificates ?? []) map.set(certificate.booking_id, certificate);
    return map;
  }, [data]);

  return (
    <>
      <Header />
      <main className="page">
        <div className="shell">
          <div className="dashboard-hero">
            <div>
              <div className="eyebrow">AREA CLIENTE</div>
              <h1>{data?.customer.full_name ? `Ciao ${data.customer.full_name.split(" ")[0]}.` : "Le tue verifiche."}</h1>
              <p className="lead">Tieni sotto controllo appuntamenti, stato delle pratiche e documenti della tua auto.</p>
            </div>
            <Link className="button" href="/prenota"><Plus size={18} /> Nuova verifica</Link>
          </div>

          {message && (
            <section className="panel customer-info" style={{ marginTop: 28 }}>
              <div>
                <div className="eyebrow">AREA RISERVATA</div>
                <h2>{message}</h2>
                <p>La sessione è attiva, ma non è stato possibile caricare i dati cliente.</p>
              </div>
              <button type="button" className="button" onClick={() => void load()} disabled={loading}>{loading ? "Caricamento…" : "Riprova"}</button>
            </section>
          )}

          {!message && (
            <>
              <div className="customer-metrics" style={{ marginTop: 28 }}>
                <div className="metric"><FileCheck2 size={20} /><span>Pratiche totali</span><strong>{loading ? "—" : stats.total}</strong></div>
                <div className="metric"><CalendarDays size={20} /><span>Pratiche attive</span><strong>{loading ? "—" : stats.active}</strong></div>
                <div className="metric"><ShieldCheck size={20} /><span>Verifiche concluse</span><strong>{loading ? "—" : stats.completed}</strong></div>
              </div>

              <div className={styles.customerDashboardTabs} role="tablist" aria-label="Area cliente">
                <button type="button" role="tab" aria-selected={activeTab === "verifiche"} className={activeTab === "verifiche" ? styles.customerDashboardTabActive : styles.customerDashboardTab} onClick={() => setActiveTab("verifiche")}>Verifiche</button>
                <button type="button" role="tab" aria-selected={activeTab === "certificati"} className={activeTab === "certificati" ? styles.customerDashboardTabActive : styles.customerDashboardTab} onClick={() => setActiveTab("certificati")}>Certificati</button>
              </div>

              {activeTab === "verifiche" && (
                <section className="dashboard-section">
                  <div className="section-heading">
                    <div><div className="eyebrow">PRATICHE REALI</div><h2>Le tue verifiche</h2></div>
                    <button type="button" className="button secondary" onClick={() => void load()} disabled={loading}>Aggiorna</button>
                  </div>
                  {loading && <div className="notice">Caricamento pratiche…</div>}
                  {!loading && data && data.bookings.length === 0 && <div className="panel customer-info"><div><h3>Nessuna verifica ancora</h3><p>Quando creerai la prima prenotazione comparirà qui con il suo stato.</p></div><Link className="button" href="/prenota">Prenota ora</Link></div>}
                  {!loading && data && data.bookings.length > 0 && <div className={styles.customerDashboardChecks}>{data.bookings.map((booking) => {
                    const vehicle = [booking.vehicle_make, booking.vehicle_model, booking.vehicle_year].filter((value) => value !== null && value !== undefined && String(value).trim() !== "").join(" ") || "Veicolo";
                    const certificate = certificatesByBooking.get(booking.id);
                    return <article className={`${styles.customerDashboardCheck} customer-check`} key={booking.id}>
                      <div className={`${styles.customerDashboardCheckMain} customer-check-main`}>
                        <div className="vehicle-icon"><CalendarDays size={20} /></div>
                        <div>
                          <strong>{vehicle}</strong>
                          <span className={styles.customerVehiclePlate}>{booking.plate ? `Targa: ${booking.plate}` : "Targa non disponibile"}</span>
                          <span>{booking.practice_code ?? "Pratica"}</span>
                          <span>{SERVICE_NAMES[booking.service_key] ?? booking.service_key}</span>
                          <span>{formatDate(booking.requested_date)} {booking.requested_slot ?? ""}</span>
                          {certificate && <span style={{ marginTop: 8, fontWeight: 700 }}>Certificato {certificate.public_code} · VeriScore {certificate.veriscore}/100 · {formatIssuedAt(certificate.issued_at)}</span>}
                        </div>
                      </div>
                      <div className={`${styles.customerDashboardCheckScore} customer-check-score`}>
                        <div className="small-score"><span>Stato</span><strong>{STATUS_LABELS[booking.status] ?? booking.status}</strong><em>{booking.urgency ? "Urgenza" : money(booking.customer_price_cents)}</em></div>
                        {booking.status === "completed" && <Link className="button secondary" href={`/verifica/${certificate?.public_code ?? booking.id}`}>Apri pratica</Link>}
                      </div>
                    </article>;
                  })}</div>}
                </section>
              )}

              {activeTab === "certificati" && (
                <section className="dashboard-section">
                  <div className="section-heading"><div><div className="eyebrow">DOCUMENTI</div><h2>I miei certificati</h2></div></div>
                  {loading && <div className="notice">Caricamento certificati…</div>}
                  {!loading && (data?.certificates ?? []).length === 0 && <div className="panel customer-info"><ShieldCheck size={28} /><div><h3>Nessun certificato ancora</h3><p>Quando una pratica VeriScore viene chiusa, il certificato apparirà automaticamente qui.</p></div></div>}
                  {!loading && (data?.certificates ?? []).length > 0 && <div className={styles.customerDashboardChecks}>{(data?.certificates ?? []).map((certificate) => <article className={`${styles.customerDashboardCertificate} customer-check`} key={certificate.id}>
                    <div className={`${styles.customerDashboardCertificateMain} customer-check-main`}><div className="vehicle-icon"><ShieldCheck size={20} /></div><div>
                      <strong>{[certificate.vehicle_make, certificate.vehicle_model, certificate.vehicle_year].filter(Boolean).join(" ") || "Veicolo"}</strong>
                      <span>Certificato {certificate.public_code}</span>
                      <span>VeriScore {certificate.veriscore}/100 · {certificate.vehicle_mileage.toLocaleString("it-IT")} km</span>
                      <span>Emesso il {formatIssuedAt(certificate.issued_at)}</span>
                    </div></div>
                    <div className={`${styles.customerDashboardCertificateActions} customer-check-score`}>
                      <div className="small-score"><span>Targa</span><strong>{certificate.vehicle_plate}</strong><em>VIN {certificate.vehicle_vin}</em></div>
                      <Link className="button secondary" href={`/verifica/${certificate.public_code}`}><ShieldCheck size={17} /> Verifica</Link>
                      <button type="button" className="button" onClick={async () => { try { const response = await fetch(`/api/customer/certificates/${encodeURIComponent(certificate.id)}/pdf?download=1`, { credentials: "include" }); if (!response.ok) throw new Error("Impossibile scaricare il PDF."); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `VeriDrive-${certificate.public_code}.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile scaricare il PDF."); } }}><Download size={17} /> Scarica PDF</button>
                    </div>
                  </article>)}</div>}
                </section>
              )}

              <section className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", padding: "10px 0 28px" }}>
                <Link className={`card ${styles.customerDashboardBottomCard}`} href="/auto"><h3>La tua auto</h3><p>Check Viaggio e Check-up + VeriScore per l'auto che utilizzi.</p></Link>
                <Link className={`card ${styles.customerDashboardBottomCard}`} href="/acquisto-auto-usata"><h3>Stai acquistando un'auto</h3><p>Check Online, verifica in officina e VeriScorePlus per l'auto che stai valutando.</p></Link>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
