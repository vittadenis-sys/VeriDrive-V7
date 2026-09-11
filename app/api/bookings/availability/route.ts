import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerPriceCents, getService, type ServiceKey } from "@/lib/services";

const SERVICE_KEYS: ServiceKey[] = ["check_viaggio", "veriscore", "check_online", "veriscore_plus"];
const SLOT_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

function isValidDate(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const serviceKey = String(url.searchParams.get("service") ?? "") as ServiceKey;
  const date = String(url.searchParams.get("date") ?? "").trim();
  const urgency = url.searchParams.get("urgency") === "true";

  if (!SERVICE_KEYS.includes(serviceKey) || !getService(serviceKey)) {
    return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });
  }

  const service = getService(serviceKey)!;
  if (!service.workshop) {
    return NextResponse.json({ online: true, workshops: [], priceCents: service.priceCents });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Data non valida." }, { status: 400 });
  }

  const requested = new Date(`${date}T12:00:00`);
  const minAdvanceHours = urgency ? 24 : 48;
  if (requested.getTime() - Date.now() < minAdvanceHours * 60 * 60 * 1000) {
    return NextResponse.json({
      error: urgency
        ? "L'urgenza richiede almeno 24 ore di preavviso."
        : "Gli appuntamenti standard richiedono almeno 48 ore di preavviso.",
    }, { status: 400 });
  }

  const { data: workshops, error: workshopError } = await supabase
    .from("workshops")
    .select("id,name,city,address,cap,lat,lng,active")
    .eq("active", true)
    .order("city", { ascending: true });

  if (workshopError) {
    return NextResponse.json({ error: workshopError.message }, { status: 400 });
  }

  const results = [];
  for (const workshop of workshops ?? []) {
    const { data: booked, error: bookedError } = await supabase
      .from("bookings")
      .select("requested_slot")
      .eq("workshop_id", workshop.id)
      .eq("requested_date", date)
      .in("status", ["requested", "assigned", "confirmed", "in_progress"]);

    if (bookedError) {
      return NextResponse.json({ error: bookedError.message }, { status: 400 });
    }

    const busy = new Set((booked ?? []).map((booking) => booking.requested_slot).filter(Boolean));
    const availableSlots = SLOT_TIMES.filter((slot) => !busy.has(slot));
    if (!availableSlots.length) continue;

    results.push({
      ...workshop,
      display_name: workshop.city
        ? `VeriDrive ${workshop.city} — ${workshop.name}`
        : `VeriDrive — ${workshop.name}`,
      availableSlots,
      latitude: workshop.lat ?? null,
      longitude: workshop.lng ?? null,
      postal_code: workshop.cap ?? null,
    });
  }

  return NextResponse.json({
    online: false,
    urgency,
    workshops: results,
    priceCents: getCustomerPriceCents(serviceKey, urgency),
  });
}
