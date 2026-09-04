"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

type Workshop = { id: string; display_name: string; city: string | null; address: string | null; postal_code: string | null; availableSlots: string[] };
type Booking = { id: string; plate: string; vehicle_make: string | null; vehicle_model: string | null; requested_date: string | null; requested_slot: string | null; status: string; service_key: string; urgency: boolean; workshop_id: string | null };

const SERVICE_NAMES: Record<string,string> = { check_viaggio: "Check Viaggio", veriscore: "Check-up + VeriScore", check_online: "Check Online", veriscore_plus: "Check-up + VeriScorePlus" };

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedBooking, setSelectedBooking] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [bookingResponse, workshopResponse] = await Promise.all([
      fetch("/api/admin/bookings", { cache: "no-store" }),
      fetch("/api/admin/workshops/overview", { cache: "no-store" }),
    ]);
    const bookingData = await bookingResponse.json();
    const workshopData = await workshopResponse.json();
    if (bookingResponse.ok) setBookings(bookingData.bookings ?? []);
    else setMessage(bookingData.error ?? "Impossibile caricare le pratiche.");
    if (workshopResponse.ok) setWorkshops((workshopData.workshops ?? []).map((w: Workshop) => ({ ...w, availableSlots: [] })));
    else setMessage(workshopData.error ?? "Impossibile caricare le officine.");
  }

  useEffect(() => { void load(); }, []);

  async function loadSlots(booking: Booking, workshopList: Workshop[]) {
    if (!booking.requested_date) return;
    const updated = await Promise.all(workshopList.map(async (workshop) => {
      const response = await fetch(`/api/bookings/availability?service=${encodeURIComponent(booking.service_key)}&date=${encodeURIComponent(booking.requested_date!)}&urgency=${booking.urgency}`);
      if (!response.ok) return workshop;
      const data = await response.json();
      const found = (data.workshops ?? []).find((item: Workshop) => item.id === workshop.id);
      return { ...workshop, availableSlots: found?.availableSlots ?? [] };
    }));
    setWorkshops(updated);
  }

  async function assign(workshopId: string, slot: string) {
    if (!selectedBooking) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking}/assign`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workshopId, slot }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assegnazione non riuscita.");
      setMessage("Officina assegnata e slot riservato.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Assegnazione non riuscita."); }
    finally { setBusy(false); }
  }

  const current = bookings.find((b) => b.id === selectedBooking) ?? null;

  useEffect(() => { if (current) void loadSlots(current, workshops); }, [selectedBooking]);

  return <><Header/><main className="page"><div className="shell">
    <Link href="/admin">← Amministrazione</Link>
    <div className="eyebrow" style={{ marginTop: 24 }}>Gestione pratiche</div>
    <h1 style={{ fontSize: "clamp(38px,6vw,54px)" }}>Assegnazione officina</h1>
    <p className="lead">Scegli una pratica e assegna un'officina attiva mostrando solo gli slot disponibili.</p>
    {message && <p className="notice">{message}</p>}
    <section className="panel" style={{ marginTop: 24 }}>
      <label>Pratica<select value={selectedBooking} onChange={(e)=>setSelectedBooking(e.target.value)}><option value="">Seleziona una pratica</option>{bookings.filter(b=>b.status !== "completed" && b.status !== "cancelled").map((b)=><option key={b.id} value={b.id}>{b.id} · {b.plate} · {SERVICE_NAMES[b.service_key] ?? b.service_key}</option>)}</select></label>
      {current && <div style={{ marginTop: 18 }}><div className="card"><strong>{[current.vehicle_make,current.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</strong><p style={{ marginBottom: 4 }}>{current.plate} · {current.requested_date ?? "Data non impostata"} {current.requested_slot ?? ""}</p><span className="badge">{current.urgency ? "Urgenza" : "Standard"}</span><div style={{ marginTop:8,fontSize:13,opacity:.75 }}>Stato: {current.status} · {current.workshop_id ? "Officina già assegnata" : "In attesa di assegnazione"}</div></div></div>}
    </section>
    <section style={{ padding: "28px 0" }}>
      <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        {workshops.map((workshop)=><article className="card" key={workshop.id}><div className="eyebrow">OFFICINA</div><h3 style={{ margin: "7px 0" }}>{workshop.display_name}</h3><p style={{ marginBottom: 8 }}>{[workshop.address,workshop.postal_code,workshop.city].filter(Boolean).join(" · ") || "Indirizzo non disponibile"}</p>{current ? <div style={{ display:"grid", gap:8 }}>{workshop.availableSlots.length ? workshop.availableSlots.map((slot)=><button key={slot} type="button" className="button secondary" disabled={busy} onClick={()=>assign(workshop.id,slot)}>Assegna {slot}</button>) : <span className="notice" style={{marginTop:0}}>Nessuno slot disponibile per questa data.</span>}</div> : <span>Seleziona prima una pratica.</span>}</article>)}
      </div>
    </section>
  </div></main></>;
}
