import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/notifications";
import { getCustomerPriceCents, getService, type ServiceKey } from "@/lib/services";

const SERVICE_KEYS: ServiceKey[] = ["previaggio", "vericert", "online", "base", "plus"];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Accedi prima di prenotare." }, { status: 401 });

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 400 });
  }

  const serviceKey = String(body.service ?? "");
  if (!SERVICE_KEYS.includes(serviceKey as ServiceKey) || !getService(serviceKey)) {
    return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });
  }

  const service = getService(serviceKey)!;
  const urgency = serviceKey !== "online" && body.urgency === true;
  const customerPriceCents = getCustomerPriceCents(serviceKey, urgency);
  if (customerPriceCents == null) {
    return NextResponse.json({ error: "Impossibile calcolare il prezzo." }, { status: 400 });
  }

  const referenceType = body.referenceType === "listing" ? "listing" : "plate";
  const reference = referenceType === "plate" ? String(body.plate ?? "").trim() : String(body.listingUrl ?? "").trim();

  if (!reference) {
    return NextResponse.json({ error: referenceType === "plate" ? "Targa mancante." : "Link annuncio mancante." }, { status: 400 });
  }

  if (service.workshop && !body.location) {
    return NextResponse.json({ error: "Indica dove si trova l'auto." }, { status: 400 });
  }

  const insertPayload = {
    customer_id: customer.id,
    plate: referenceType === "plate" ? reference : "DA-LINK",
    vehicle_make: body.make ? String(body.make).trim() : null,
    vehicle_model: body.model ? String(body.model).trim() : null,
    requested_date: body.date ? String(body.date) : null,
    requested_slot: body.slot ? String(body.slot) : null,
    location: body.location ? String(body.location).trim() : null,
    listing_url: referenceType === "listing" ? reference : null,
    service_key: serviceKey,
    customer_price_cents: customerPriceCents,
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sendBookingConfirmation(user.email ?? "", data.id);
  return NextResponse.json({ bookingId: data.id });
}
