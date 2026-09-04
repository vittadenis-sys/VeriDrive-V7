"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, Euro, Home, UserRound, Settings, Clock3 } from "lucide-react";
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

export default function Officina() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
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

  return (
    <>
      <Header />
      <div className="dashboard">
        <aside className="side" style={{ paddingBottom: 96 }}>
          <div style={{ marginBottom: 24 }}>
            <div className="eyebrow">Partner VeriDrive</div>
            <h2 style={{ marginBottom: 4 }}>{data?.workshop ? `VeriDrive ${data.workshop.city ?? ""} — ${data.workshop.name}` : "Officina VeriDrive"}</h2>
            <p style={{ margin: 0, opacity: .7, fontSize: 14 }}>Dashboard operativa</p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {nav.map(([label, href, Icon]) => <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}><Icon size={19} />{label}</Link>)}
          </div>
          <div className="panel" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Settings size={18} /><b>Operatività</b></div>
            <p style={{ margin: "10px 0 6px", fontSize: 14 }}>Gestisci disponibilità e chiusure dal calendario.</p>
            <Link href="/officina/calendario" style={{ fontSize: 14 }}>Apri calendario</Link>
          </div>
        </aside>

        <main className="main" style={{ paddingBottom: 96 }}>
          <div className="eyebrow">Panoramica officina</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "clamp(34px, 5vw, 52px)", marginBottom: 8 }}>Le tue prenotazioni</h1>
              <p className="lead" style={{ marginBottom: 0 }}>Lavora sulle pratiche assegnate e chiudi ogni verifica direttamente da qui.</p>
            </div>
            <Link className="button" href="/officina">Aggiorna</Link>
          </div>

          <section style={{ padding: "28px 0 8px" }}>
            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {stats.map(({ label, value, icon: Icon }) => <div className="metric" key={label} style={{ minHeight: 132 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={20} />{label}</div><strong style={{ marginTop: 12, fontSize: 34 }}>{value}</strong></div>)}
            </div>
          </section>

          <section style={{ padding: "28px 0" }}>
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div><div className="eyebrow">Pratiche</div><h3 style={{ marginBottom: 4 }}>Elenco vetture</h3><p style={{ marginBottom: 0, opacity: .76 }}>Visualizzi solo auto e orari necessari per eseguire il servizio.</p></div>
                <span className="badge">{data?.bookings.length ?? 0} pratiche</span>
              </div>
              {message && <p className="notice">{message}</p>}
              <div style={{ display: "grid", gap: 12 }}>
                {(data?.bookings ?? []).length === 0 && <div className="notice">Nessuna pratica assegnata.</div>}
                {(data?.bookings ?? []).map((booking) => {
                  const vehicle = [booking.vehicle_make, booking.vehicle_model, booking.vehicle_year].filter(Boolean).join(" ");
                  const payout = booking.payout ? `€${(booking.payout.amount_cents / 100).toFixed(2).replace('.', ',')}` : "—";
                  return <div key={booking.id} style={{ border: "1px solid rgba(127,127,127,.18)", borderRadius: 18, padding: 16, display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}><strong>{vehicle || "Veicolo"}</strong><span className="badge">{SERVICE_NAMES[booking.service_key] ?? booking.service_key}</span>{booking.urgency && <span className="badge">Urgenza</span>}</div>
                      <div style={{ fontSize: 14, opacity: .72 }}>{booking.id} · {booking.plate} · {booking.requested_date ?? "Data da definire"} {booking.requested_slot ?? ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}><span style={{ fontWeight: 700 }}>{payout}</span><span className="badge">{booking.status}</span><Link className="button secondary" href={`/officina/checklist?booking=${booking.id}`}>Apri</Link></div>
                  </div>;
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
