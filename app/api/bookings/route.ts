import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmation, sendBookingOperationalNotifications } from "@/lib/notifications";
import { getCustomerPriceCents, getService, type ServiceKey } from "@/lib/services";
import { createServiceClient } from "@/lib/supabase/service";

const SERVICE_KEYS: ServiceKey[] = ["check_viaggio", "veriscore", "check_online", "veriscore_plus"];
const ACTIVE_BOOKING_STATUSES = ["requested", "assigned", "confirmed", "in_progress"];

function isValidDate(value: unknown) {
  if (typeof value !== "string" || !value) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function normalizeSlot(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accedi prima di prenotare." }, { status: 401 });

  const db = createServiceClient();
  const { data: customer, error: customerError } = await db
    .from("customers")
    .select("id,full_name,phone")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
  if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 400 });

  const serviceKey = String(body.service ?? body.service_key ?? "") as ServiceKey;
  if (!SERVICE_KEYS.includes(serviceKey) || !getService(serviceKey)) return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });

  const service = getService(serviceKey)!;
  const isOnline = serviceKey === "check_online";
  const urgency = !isOnline && body.urgency === true;
  const requestedFreeBooking = body.useFreeBooking === true;
  const customerPriceCents = getCustomerPriceCents(serviceKey, urgency);
  if (customerPriceCents == null) return NextResponse.json({ error: "Impossibile calcolare il prezzo." }, { status: 400 });

  const date = isOnline ? null : String(body.date ?? "").trim();
  const rawSlot = isOnline ? null : String(body.slot ?? "").trim();
  const slot = rawSlot ? normalizeSlot(rawSlot) : null;
  if (!isOnline && !isValidDate(date)) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
  if (!isOnline && !slot) return NextResponse.json({ error: "Orario non valido." }, { status: 400 });

  let workshop: { id: string; name: string; email: string | null; city: string | null } | null = null;
  if (!isOnline) {
    const workshopId = String(body.workshopId ?? "").trim();
    if (!workshopId) return NextResponse.json({ error: "Seleziona un'officina." }, { status: 400 });

    const { data, error } = await db
      .from("workshops")
      .select("id,name,email,city,active")
      .eq("id", workshopId)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Officina non disponibile." }, { status: 400 });
    workshop = data;

    if (requestedFreeBooking && !workshop.name.toLowerCase().includes("autogerma")) {
      return NextResponse.json({ error: "La prenotazione gratuita è disponibile solo presso Autogerma." }, { status: 400 });
    }

    // Prevent booking the same workshop/date/time twice. Use the actual
    // inspection_date stored by VeriDrive rather than legacy requested_* columns.
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59.999`;
    const { data: booked, error: bookedError } = await db
      .from("bookings")
      .select("id,inspection_date")
      .eq("workshop_id", workshopId)
      .gte("inspection_date", dayStart)
      .lte("inspection_date", dayEnd)
      .in("status", ACTIVE_BOOKING_STATUSES);

    if (bookedError) return NextResponse.json({ error: bookedError.message }, { status: 400 });

    const conflict = (booked ?? []).some((booking) => {
      if (!booking.inspection_date || !slot) return false;
      return String(booking.inspection_date).slice(11, 16) === slot;
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Lo slot selezionato non è più disponibile. Scegli un altro orario." },
        { status: 409 }
      );
    }
  }

  const wantsFreeBooking = requestedFreeBooking && Boolean(workshop) && workshop!.name.toLowerCase().includes("autogerma");

  if (wantsFreeBooking) {
    const { data: bonus, error: bonusError } = await db
      .from("customer_bonus")
      .select("free_bookings")
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (bonusError) return NextResponse.json({ error: "Impossibile verificare il bonus gratuito." }, { status: 500 });

    const freeBookings = Number(bonus?.free_bookings ?? 0);
    if (freeBookings < 1) return NextResponse.json({ error: "Il bonus per la prenotazione gratuita non è più disponibile." }, { status: 409 });

    const { data: updatedBonus, error: updateBonusError } = await db
      .from("customer_bonus")
      .update({ free_bookings: freeBookings - 1, updated_at: new Date().toISOString() })
      .eq("customer_id", customer.id)
      .eq("free_bookings", freeBookings)
      .select("free_bookings")
      .maybeSingle();
    if (updateBonusError || !updatedBonus) return NextResponse.json({ error: "Il bonus per la prenotazione gratuita è stato usato da un'altra richiesta. Riprova." }, { status: 409 });
  }

  const inspectionDate = isOnline ? null : `${date}T${slot}:00`;
  const insertPayload = {
    customer_id: customer.id,
    workshop_id: workshop?.id ?? null,
    vehicle_id: null,
    service: serviceKey,
    status: "requested",
    inspection_date: inspectionDate,
    total: wantsFreeBooking ? 0 : customerPriceCents,
    travel_km: 0,
    overall_notes: null,
  };

  const { data, error } = await db
    .from("bookings")
    .insert(insertPayload)
    .select("id,booking_code")
    .single();

  if (error) {
    if (wantsFreeBooking) {
      await db
        .from("customer_bonus")
        .update({ free_bookings: 1, updated_at: new Date().toISOString() })
        .eq("customer_id", customer.id)
        .eq("free_bookings", 0);
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await sendBookingConfirmation(user.email ?? "", data.id);
  await sendBookingOperationalNotifications({
    id: data.id,
    plate: "",
    vehicleMake: null,
    vehicleModel: null,
    service: service.name,
    customerEmail: user.email,
    workshopEmail: workshop?.email ?? null,
    date,
    slot,
    urgency,
  });

  return NextResponse.json({
    bookingId: data.id,
    practiceNumber: data.booking_code ?? null,
    service: service.key,
    freeBooking: wantsFreeBooking,
  });
}
