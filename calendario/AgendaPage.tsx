"use client";

import { useEffect, useState } from "react";
import { AgendaClient } from "@/app/officina/calendario/AgendaClient";

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function AgendaPage() {
  const [date, setDate] = useState(todayIso());
  const [bookings, setBookings] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setMessage("");
    fetch(`/api/workshop/calendar?date=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Impossibile caricare il calendario.");
        if (active) setBookings(data.bookings ?? []);
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Errore."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  return <div className="panel" style={{ marginBottom: 24 }}>
    <div style={{ display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap",marginBottom:18 }}>
      <div><div className="eyebrow">AGENDA</div><h2 style={{marginBottom:4}}>Slot da 1 ora</h2><p style={{marginBottom:0,opacity:.72}}>Ogni appuntamento occupa un'ora intera.</p></div>
      <label style={{minWidth:180}}>Data<input type="date" value={date} onChange={(e)=>setDate(e.target.value)} /></label>
    </div>
    {loading && <div className="notice">Caricamento…</div>}
    {message && <div className="notice">{message}</div>}
    {!loading && !message && <AgendaClient bookings={bookings} date={date} />}
  </div>;
}
