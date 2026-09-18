import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBookingConfirmation, sendBookingOperationalNotifications } from "@/lib/notifications";

const ALLOWED_SERVICES = new Set(["check_viaggio", "veriscore", "veriscore_plus"]);

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeTime(value: unknown) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isValidDate(value: unknown) {
  const date = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

async function findAuthUserByEmail(db: ReturnType<typeof createServiceClient>, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const found = (data.users ?? []).find((item) => item.email?.toLowerCase() === email);
    if (found) return found;
    if ((data.users ?? []).length < 1000) break;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db.from("admins").select("role").eq("auth_id", user.id).maybeSingle();
    if (adminError) return NextResponse.json({ error: adminError.message }, { status: 500 });
    if (!admin || !["admin", "super_admin"].includes(admin.role) || user.email?.toLowerCase() !== "admin@veridrive.it") {
      return NextResponse.json({ error: "Prenotazione istantanea non autorizzata." }, { status: 403 });
    }

    const { data: workshop, error: workshopError } = await db
      .from("workshops")
      .select("id,name,email,address,city,owner_auth_id")
      .eq("owner_auth_id", user.id)
      .maybeSingle();
    if (workshopError) return NextResponse.json({ error: workshopError.message }, { status: 500 });
    if (!workshop || !workshop.name.toLowerCase().includes("autogerma")) {
      return NextResponse.json({ error: "La prenotazione istantanea è disponibile solo per Autogerma." }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;
    const customerEmailInput = normalizeEmail(body.customerEmail);
    const service = String(body.service ?? "").trim();
    const plate = String(body.plate ?? "").trim().toUpperCase();
    const make = String(body.make ?? "").trim();
    const model = String(body.model ?? "").trim();
    const location = String(body.location ?? "").trim() || [workshop.address, workshop.city].filter(Boolean).join(", ");
    const date = String(body.date ?? "").trim();
    const time = normalizeTime(body.time);

    if (!ALLOWED_SERVICES.has(service)) return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });
    if (!plate) return NextResponse.json({ error: "Inserisci la targa." }, { status: 400 });
    if (!isValidDate(date)) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
    if (!time) return NextResponse.json({ error: "Orario non valido." }, { status: 400 });

    const targetEmail = customerEmailInput || "admin@veridrive.it";
    let authUser = customerEmailInput ? await findAuthUserByEmail(db, customerEmailInput) : user;
    let customerCreated = false;

    if (!authUser) {
      const randomPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}!`;
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: customerEmailInput,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: customerEmailInput.split("@")[0] },
      });
      if (createError || !created.user) return NextResponse.json({ error: createError?.message ?? "Impossibile creare il cliente." }, { status: 400 });
      authUser = created.user;
      customerCreated = true;
    }

    let { data: customer, error: customerError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });

    if (!customer) {
      const fullName = String(authUser.user_metadata?.full_name ?? authUser.email?.split("@")[0] ?? "Cliente").trim() || "Cliente";
      const { data: createdCustomer, error: createCustomerError } = await db
        .from("customers")
        .insert({ auth_id: authUser.id, full_name: fullName })
        .select("id")
        .single();
      if (createCustomerError || !createdCustomer) return NextResponse.json({ error: createCustomerError?.message ?? "Impossibile creare il profilo cliente." }, { status: 400 });
      customer = createdCustomer;
    }

    const inspectionDate = `${date}T${time}:00`;
    const overallNotes = JSON.stringify({
      instant_booking: true,
      instant_booking_customer_email: customerEmailInput || null,
      reference_type: "plate",
      plate,
      vehicle_make: make || null,
      vehicle_model: model || null,
      vehicle_year: null,
      vin: null,
      vehicle_mileage: null,
      location,
    });

    const { data: booking, error: bookingError } = await db.from("bookings").insert({
      customer_id: customer.id,
      workshop_id: workshop.id,
      vehicle_id: null,
      service,
      status: "confirmed",
      inspection_date: inspectionDate,
      total: 0,
      travel_km: 0,
      overall_notes: overallNotes,
    }).select("id,booking_code").single();

    if (bookingError || !booking) return NextResponse.json({ error: bookingError?.message ?? "Impossibile creare la pratica." }, { status: 400 });

    if (customerEmailInput && customerCreated) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it";
        await db.auth.resetPasswordForEmail(customerEmailInput, {
          redirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
        });
      } catch (resetError) {
        console.error("WORKSHOP_INSTANT_BOOKING_RESET_EMAIL_ERROR", resetError);
      }
    }

    if (customerEmailInput) {
      await sendBookingConfirmation(customerEmailInput, booking.id);
    }

    await sendBookingOperationalNotifications({
      id: booking.id,
      plate,
      vehicleMake: make || null,
      vehicleModel: model || null,
      service,
      customerEmail: null,
      workshopEmail: workshop.email || null,
      date,
      slot: time,
      urgency: false,
    });

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      practiceNumber: booking.booking_code ?? null,
      customerCreated,
      customerEmail: targetEmail,
      status: "confirmed",
      total: 0,
    });
  } catch (error) {
    console.error("WORKSHOP_INSTANT_BOOKING_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
