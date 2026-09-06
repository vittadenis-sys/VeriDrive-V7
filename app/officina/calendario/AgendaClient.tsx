"use client";

import { useMemo } from "react";

type Booking = { id: string; plate: string; vehicle_make: string | null; vehicle_model: string | null; requested_date: string | null; requested_slot: string | null; status: string; service_key: string };
type Props = { bookings: Booking[]; date: string };

const SERVICE_NAMES: Record<string,string> = { check_viaggio: "Check Viaggio", veriscore: "Check-up + VeriScore", check_online: "Check Online", veriscore_plus: "Check-up + VeriScorePlus" };

export function AgendaClient({ bookings, date }: Props) {
  const slots = useMemo(() => {
    const result: string[] = [];
    for (let hour = 8; hour < 19; hour += 1) {
      for (const minute of [30]) {
        if (hour === 18 && minute > 30) continue;
        result.push(`${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`);
      }
    }
    return result;
  }, []);

  const bySlot = new Map(bookings.filter((b) => b.requested_date === date).map((b) => [b.requested_slot ?? "", b]));

  return <div style={{ display: "grid", gap: 10 }}>
    {slots.map((slot) => {
      const booking = bySlot.get(slot);
      return <div key={slot} className="card" style={{ display:"grid", gridTemplateColumns:"90px minmax(0,1fr)", gap:14, alignItems:"center", borderRadius:18 }}>
        <strong>{slot}</strong>
        {booking ? <div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><strong>{[booking.vehicle_make,booking.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</strong><span className="badge">{SERVICE_NAMES[booking.service_key] ?? booking.service_key}</span></div><div style={{fontSize:14,opacity:.72,marginTop:4}}>{booking.plate} · {booking.status}</div></div> : <span style={{opacity:.7}}>Libero</span>}
      </div>;
    })}
  </div>;
}
