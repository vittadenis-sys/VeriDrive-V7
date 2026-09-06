import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmation, sendBookingOperationalNotifications } from "@/lib/notifications";
import { getCustomerPriceCents, getService, type ServiceKey } from "@/lib/services";

const SERVICE_KEYS: ServiceKey[] = ["check_viaggio", "veriscore", "check_online", "veriscore_plus"];

function isValidDate(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function createPracticeNumber() {
  const stamp = new Date();
  const yyyy = stamp.getFullYear();
  const mm = String(stamp.getMonth() + 1).padStart(2, "0");
  const dd = String(stamp.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `VRD-${yyyy}${mm}${dd}-${suffix}`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accedi prima di prenotare." }, { status: 401 });

  const { data: customer, error: customerError } = await supabase.from("customers").select("id,full_name,phone").eq("auth_id", user.id).single();
  if (customerError || !customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 400 });

  const serviceKey = String(body.service ?? "") as ServiceKey;
  if (!SERVICE_KEYS.includes(serviceKey) || !getService(serviceKey)) return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });

  const service = getService(serviceKey)!;
  const isOnline = serviceKey === "check_online";
  const urgency = !isOnline && body.urgency === true;
  const customerPriceCents = getCustomerPriceCents(serviceKey, urgency);
  if (customerPriceCents == null) return NextResponse.json({ error: "Impossibile calcolare il prezzo." }, { status: 400 });

  const referenceType = body.referenceType === "listing" ? "listing" : "plate";
  const reference = referenceType === "plate" ? String(body.plate ?? "").trim().toUpperCase() : String(body.listingUrl ?? "").trim();
  if (!reference) return NextResponse.json({ error: referenceType === "plate" ? "Targa mancante." : "Link annuncio mancante." }, { status: 400 });

  const date = isOnline ? null : String(body.date ?? "").trim();
  const slot = isOnline ? null : String(body.slot ?? "").trim();
  const location = service.workshop ? String(body.location ?? "").trim() : null;
  if (!isOnline && !isValidDate(date)) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
  if (!isOnline && !slot) return NextResponse.json({ error: "Orario mancante." }, { status: 400 });
  if (service.workshop && !location) return NextResponse.json({ error: "Indica dove si trova l'auto." }, { status: 400 });

  let workshop: { id: string; name: string; email: string; city: string | null } | null = null;
  if (!isOnline) {
    const workshopId = String(body.workshopId ?? "").trim();
    if (!workshopId) return NextResponse.json({ error: "Seleziona un'officina." }, { status: 400 });
    const { data, error } = await supabase.from("workshops").select("id,name,email,city,is_active").eq("id", workshopId).eq("is_active", true).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Officina non disponibile." }, { status: 400 });
    workshop = data;

    const { data: booked } = await supabase
      .from("bookings")
      .select("id")
      .eq("workshop_id", workshopId)
      .eq("requested_date", date)
      .eq("requested_slot", slot)
      .in("status", ["requested", "assigned", "confirmed", "in_progress"]);
    if ((booked ?? []).length) return NextResponse.json({ error: "Lo slot selezionato non è più disponibile. Aggiorna gli orari e riprova." }, { status: 409 });
  }

  const practiceNumber = createPracticeNumber();
  const insertPayload = {
    customer_id: customer.id,
    workshop_id: workshop?.id ?? null,
    plate: referenceType === "plate" ? reference : "DA-LINK",
    vehicle_make: body.make ? String(body.make).trim() : null,
    vehicle_model: body.model ? String(body.model).trim() : null,
    requested_date: date,
    requested_slot: slot,
    location,
    listing_url: referenceType === "listing" ? reference : null,
    service_key: serviceKey,
    customer_price_cents: customerPriceCents,
    urgency,
    urgency_price_cents: urgency ? 2500 : 0,
  };

  const { data, error } = await supabase.from("bookings").insert(insertPayload).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sendBookingConfirmation(user.email ?? "", data.id);
  await sendBookingOperationalNotifications({
    id: data.id,
    plate: insertPayload.plate,
    vehicleMake: insertPayload.vehicle_make,
    vehicleModel: insertPayload.vehicle_model,
    service: service.name,
    customerEmail: user.email,
    workshopEmail: workshop?.email ?? null,
    date,
    slot,
    urgency,
  });

  return NextResponse.json({ bookingId: data.id, practiceNumber, service: service.key });
}
