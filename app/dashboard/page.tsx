"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, FileCheck2, LogIn, Plus, ShieldCheck, Download } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const SERVICE_NAMES: Record<string, string> = {
  check_viaggio: "Check Viaggio",
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

              <section className="dashboard-section">
                <div className="section-heading">
                  <div><div className="eyebrow">PRATICHE REALI</div><h2>Le tue verifiche</h2></div>
                  <button type="button" className="button secondary" onClick={() => void load()} disabled={loading}>Aggiorna</button>
                </div>
                {loading && <div className="notice">Caricamento pratiche…</div>}
                {!loading && data && data.bookings.length === 0 && (
                  <div className="panel customer-info">
                    <div><h3>Nessuna verifica ancora</h3><p>Quando creerai la prima prenotazione comparirà qui con il suo stato.</p></div>
                    <Link className="button" href="/prenota">Prenota ora</Link>
                  </div>
                )}
                {!loading && data && data.bookings.length > 0 && (
                  <div className="customer-checks">
                    {data.bookings.map((booking) => {
                      const vehicle = [booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ") || "Veicolo";
                      const certificate = certificatesByBooking.get(booking.id);
                      return (
                        <article className="customer-check" key={booking.id}>
                          <div className="customer-check-main">
                            <div className="vehicle-icon"><CalendarDays size={20} /></div>
                            <div>
                              <strong>{vehicle}</strong><span>{booking.practice_code ?? "Pratica"}</span><span>{booking.plate}</span><span>{SERVICE_NAMES[booking.service_key] ?? booking.service_key}</span><span>{formatDate(booking.requested_date)} {booking.requested_slot ?? ""}</span>
                              {certificate && <span style={{ marginTop: 4, fontWeight: 700 }}>Certificato {certificate.public_code} · VeriScore {certificate.veriscore}/100 · {formatIssuedAt(certificate.issued_at)}</span>}
                            </div>
                          </div>
                          <div className="customer-check-score">
                            <div className="small-score"><span>Stato</span><strong>{STATUS_LABELS[booking.status] ?? booking.status}</strong><em>{booking.urgency ? "Urgenza" : money(booking.customer_price_cents)}</em></div>
                            {booking.status === "completed" && <Link className="button secondary" href={certificate ? `/verifica/${certificate.public_code}` : "/dashboard"}>Apri pratica</Link>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="dashboard-section" style={{ marginTop: 12 }}>
                <div className="section-heading"><div><div className="eyebrow">DOCUMENTI</div><h2>I miei certificati</h2></div></div>
                {loading && <div className="notice">Caricamento certificati…</div>}
                {!loading && (data?.certificates ?? []).length === 0 && (
                  <div className="panel customer-info"><ShieldCheck size={28} /><div><h3>Nessun certificato ancora</h3><p>Quando una pratica VeriScore viene chiusa, il certificato apparirà automaticamente qui.</p></div></div>
                )}
                {!loading && (data?.certificates ?? []).length > 0 && (
                  <div className="customer-checks">
                    {(data?.certificates ?? []).map((certificate) => (
                      <article className="customer-check" key={certificate.id}>
                        <div className="customer-check-main">
                          <div className="vehicle-icon"><ShieldCheck size={20} /></div>
                          <div>
                            <strong>{[certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</strong>
                            <span>Certificato {certificate.public_code}</span>
                            <span>VeriScore {certificate.veriscore}/100 · {certificate.vehicle_mileage.toLocaleString("it-IT")} km</span>
                            <span>Emesso il {formatIssuedAt(certificate.issued_at)}</span>
                          </div>
                        </div>
                        <div className="customer-check-score">
                          <img src={`/api/customer/certificates/${encodeURIComponent(certificate.id)}/qr`} alt={`QR certificato ${certificate.public_code}`} width={96} height={96} style={{ display: "block", borderRadius: 8, background: "#fff" }} />
                          <div className="small-score"><span>Targa</span><strong>{certificate.vehicle_plate}</strong><em>VIN {certificate.vehicle_vin}</em></div>
                          <Link className="button secondary" href={`/verifica/${certificate.public_code}`}><ShieldCheck size={17} /> Verifica</Link>
                          <a className="button" href={`/api/customer/certificates/${encodeURIComponent(certificate.id)}/pdf`}><Download size={17} /> Scarica PDF</a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", padding: "10px 0 28px" }}>
                <Link className="card" href="/auto"><h3>La tua auto</h3><p>Check Viaggio e Check-up + VeriScore per l'auto che utilizzi.</p></Link>
                <Link className="card" href="/acquisto-auto-usata"><h3>Stai acquistando un'auto</h3><p>Check Online, verifica in officina e VeriScorePlus per l'auto che stai valutando.</p></Link>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
