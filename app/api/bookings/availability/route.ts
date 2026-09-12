import { NextResponse } from "next/server";
import { getCustomerPriceCents, getService, type ServiceKey } from "@/lib/services";
import { createServiceClient } from "@/lib/supabase/service";

const SERVICE_KEYS: ServiceKey[] = ["check_viaggio", "veriscore", "check_online", "veriscore_plus"];
const SLOT_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

function isValidDate(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

export async function GET(request: Request) {
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

  const db = createServiceClient();
  const { data: workshops, error: workshopError } = await db
    .from("workshops")
    .select("id,name,city,address,cap,lat,lng,active")
    .eq("active", true)
    .order("city", { ascending: true });

  if (workshopError) {
    return NextResponse.json({ error: workshopError.message, code: workshopError.code }, { status: 400 });
  }

  const results = [];
  for (const workshop of workshops ?? []) {
    const { data: booked, error: bookedError } = await db
      .from("bookings")
      .select("slot")
      .eq("workshop_id", workshop.id)
      .eq("requested_date", date)
      .in("status", ["requested", "assigned", "confirmed", "in_progress"]);

    if (bookedError) {
      return NextResponse.json({ error: bookedError.message, code: bookedError.code }, { status: 400 });
    }

    const busy = new Set((booked ?? []).map((booking) => booking.slot).filter(Boolean));
    const availableSlots = SLOT_TIMES.filter((slot) => !busy.has(slot));
    if (!availableSlots.length) continue;

    results.push({
      id: workshop.id,
      name: workshop.name,
      city: workshop.city ?? null,
      address: workshop.address ?? null,
      cap: workshop.cap ?? null,
      lat: workshop.lat ?? null,
      lng: workshop.lng ?? null,
      active: workshop.active,
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
