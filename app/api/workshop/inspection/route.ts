import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateWeightedVeriscore } from "@/lib/veriscore";
import { sendCertificateIssuedEmail } from "@/lib/notifications";
import { buildCertificatePdf } from "@/lib/certificate-pdf";

function parseOverallNotes(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}

async function getVehicle(db: ReturnType<typeof createServiceClient>, vehicleId: string | null) {
  if (!vehicleId) return {} as Record<string, unknown>;
  const { data, error } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

function getVehicleValue(vehicle: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = vehicle[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const bookingId = new URL(request.url).searchParams.get("bookingId")?.trim();
    if (!bookingId) return NextResponse.json({ error: "Pratica non trovata." }, { status: 400 });
    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const { data: booking, error: bookingError } = await db.from("bookings").select("id,workshop_id,service,overall_notes,vehicle_id").eq("id", bookingId).maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    const vehicle = await getVehicle(db, booking.vehicle_id);
    const stored = parseOverallNotes(booking.overall_notes);
    return NextResponse.json({
      booking: {
        id: booking.id,
        workshop_id: booking.workshop_id,
        service: booking.service,
        plate: String(getVehicleValue(vehicle, "plate", "registration", "license_plate", "targa") ?? ""),
        vehicle_make: getVehicleValue(vehicle, "make", "brand", "vehicle_make", "marca"),
        vehicle_model: getVehicleValue(vehicle, "model", "vehicle_model", "modello"),
        vehicle_year: getVehicleValue(vehicle, "year", "vehicle_year", "anno"),
        vin: String(getVehicleValue(vehicle, "vin", "vehicle_vin") ?? ""),
        vehicle_mileage: getVehicleValue(vehicle, "mileage", "vehicle_mileage"),
      },
      inspection: { checklist: Array.isArray(stored.checklist) ? stored.checklist : [], notes: stored.checklist_notes ?? null, passed_checks: Number(stored.passed_checks ?? 0), veriscore: Number(stored.veriscore ?? 0), completed_at: stored.completed_at ?? null },
    });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_GET_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const body = await request.json() as {
      bookingId?: string;
      checklist?: Array<{ id: number; area: string; label: string; result: "ok" | "issue" | "critical" | null }>;
      notes?: string;
      close?: boolean;
      vehicle?: { plate?: string; make?: string; model?: string; year?: number | null; vin?: string; mileage?: number | null };
    };
    const bookingId = String(body.bookingId ?? "").trim();
    const checklistResults = Array.isArray(body.checklist) ? body.checklist : [];
    if (!bookingId || checklistResults.length !== 50) return NextResponse.json({ error: "La checklist deve contenere tutti i 50 controlli." }, { status: 400 });
    const ids = new Set(checklistResults.map((item) => Number(item.id)));
    if (ids.size !== 50 || [...ids].some((id) => id < 1 || id > 50)) return NextResponse.json({ error: "Checklist non valida." }, { status: 400 });

    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id,name,email,address,city,cap").eq("owner_auth_id", user.id).maybeSingle();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const { data: booking, error: bookingError } = await db.from("bookings").select("id,booking_code,customer_id,workshop_id,status,service,service_key,overall_notes,vehicle_id,plate,vehicle_make,vehicle_model,vehicle_year,vin,vehicle_mileage").eq("id", bookingId).maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const results = Object.fromEntries(checklistResults.map((item) => [item.id, item.result ?? undefined]));
    const completedChecks = checklistResults.filter((item) => item.result !== null && item.result !== undefined).length;
    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const veriscore = calculateWeightedVeriscore(results);
    const previousNotes = parseOverallNotes(booking.overall_notes);
    if (body.close && completedChecks !== 50) return NextResponse.json({ error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." }, { status: 400 });

    const serviceKey = String(booking.service_key ?? booking.service ?? "").trim();
    const certificateService = serviceKey === "veriscore" || serviceKey === "veriscore_plus";
    const currentVehicle = await getVehicle(db, booking.vehicle_id);
    const incomingVehicle = body.vehicle ?? {};
    const nextPlate = String(incomingVehicle.plate ?? getVehicleValue(currentVehicle, "plate", "registration", "license_plate", "targa") ?? booking.plate ?? "").trim().toUpperCase();
    const nextMake = String(incomingVehicle.make ?? getVehicleValue(currentVehicle, "make", "brand", "vehicle_make", "marca") ?? booking.vehicle_make ?? "").trim();
    const nextModel = String(incomingVehicle.model ?? getVehicleValue(currentVehicle, "model", "vehicle_model", "modello") ?? booking.vehicle_model ?? "").trim();
    const nextYear = incomingVehicle.year ?? getVehicleValue(currentVehicle, "year", "vehicle_year", "anno") ?? booking.vehicle_year ?? null;
    const nextVin = String(incomingVehicle.vin ?? getVehicleValue(currentVehicle, "vin", "vehicle_vin") ?? booking.vin ?? "").trim().toUpperCase();
    const rawMileage = incomingVehicle.mileage ?? getVehicleValue(currentVehicle, "mileage", "vehicle_mileage") ?? booking.vehicle_mileage;
    const nextMileage = rawMileage === null || rawMileage === undefined || rawMileage === "" ? null : Number(rawMileage);
    if (body.close && certificateService) {
      if (!nextPlate) return NextResponse.json({ error: "Per chiudere VeriScore serve la targa." }, { status: 400 });
      if (!nextVin) return NextResponse.json({ error: "Per chiudere VeriScore serve il VIN/telaio." }, { status: 400 });
      if (nextMileage === null || !Number.isFinite(nextMileage) || nextMileage < 0) return NextResponse.json({ error: "Per chiudere VeriScore servono i chilometri." }, { status: 400 });
    }

    const completedAt = body.close ? new Date().toISOString() : previousNotes.completed_at ?? null;
    const notesPayload = { ...previousNotes, checklist: checklistResults, checklist_notes: String(body.notes ?? "").trim() || null, passed_checks: passedChecks, completed_checks: completedChecks, veriscore, completed_at: completedAt };

    if (!body.close) {
      const { error: saveError } = await db.from("bookings").update({ overall_notes: JSON.stringify(notesPayload) }).eq("id", bookingId).eq("workshop_id", workshop.id);
      if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });
      return NextResponse.json({ ok: true, completedChecks, passedChecks, veriscore, status: booking.status });
    }

    if (!certificateService) {
      const { error: saveError } = await db.from("bookings").update({ overall_notes: JSON.stringify(notesPayload), status: "completed" }).eq("id", bookingId).eq("workshop_id", workshop.id);
      if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });
      return NextResponse.json({ ok: true, completedChecks, passedChecks, veriscore, status: "completed" });
    }

    // Persist the vehicle identity required by the certificate trigger/registry before the final status transition.
    const { error: vehicleSaveError } = await db.from("bookings").update({
      plate: nextPlate,
      vehicle_make: nextMake || null,
      vehicle_model: nextModel || null,
      vehicle_year: nextYear == null || nextYear === "" ? null : Number(nextYear),
      vin: nextVin,
      vehicle_mileage: Number(nextMileage),
      overall_notes: JSON.stringify(notesPayload),
    }).eq("id", bookingId).eq("workshop_id", workshop.id);
    if (vehicleSaveError) return NextResponse.json({ error: vehicleSaveError.message }, { status: 400 });

    const { data: existingCertificate, error: existingError } = await db.from("veriscore_certificates").select("id,public_code,booking_id,inspection_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id").eq("booking_id", bookingId).maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

    // The deployed schema protects veriscore_certificates from direct table inserts.
    // Insert a completed inspection so the security-definer trigger creates the certificate atomically with the transaction.
    let certificate = existingCertificate as Record<string, unknown> | null;
    if (!certificate) {
      const { data: inspection, error: inspectionError } = await db.from("inspections").upsert({
        booking_id: bookingId,
        checklist: checklistResults,
        passed_checks: passedChecks,
        notes: String(body.notes ?? "").trim() || null,
        completed_at: completedAt,
        technician_signed_at: completedAt,
      }, { onConflict: "booking_id" }).select("id").single();
      if (inspectionError) return NextResponse.json({ error: inspectionError.message }, { status: 400 });
      const { data: createdCertificate, error: certificateError } = await db.from("veriscore_certificates").select("id,public_code,booking_id,inspection_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id").eq("booking_id", bookingId).maybeSingle();
      if (certificateError) return NextResponse.json({ error: certificateError.message }, { status: 400 });
      if (!createdCertificate) return NextResponse.json({ error: "Il certificato VeriScore non è stato generato." }, { status: 500 });
      certificate = createdCertificate as Record<string, unknown>;
      void inspection;
    }

    const { data: customer, error: customerError } = await db.from("customers").select("auth_id,full_name").eq("id", booking.customer_id).maybeSingle();
    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
    if (!customer?.auth_id) return NextResponse.json({ error: "Profilo cliente non disponibile: pratica senza cliente associato." }, { status: 500 });

    const { data: authUser, error: authUserError } = await db.auth.admin.getUserById(customer.auth_id);
    if (authUserError) return NextResponse.json({ error: `Impossibile recuperare l'email cliente: ${authUserError.message}` }, { status: 500 });
    const customerEmail = authUser.user?.email?.trim();
    if (!customerEmail) return NextResponse.json({ error: "Email cliente non disponibile." }, { status: 500 });

    const { data: workshopRecord } = await db.from("workshops").select("name").eq("id", workshop.id).maybeSingle();
    const bookingReference = String(booking.booking_code ?? booking.id);
    const pdfBytes = await buildCertificatePdf({
      publicCode: String(certificate.public_code),
      bookingId: bookingReference,
      vehiclePlate: String(certificate.vehicle_plate),
      vehicleVin: String(certificate.vehicle_vin),
      vehicleMake: certificate.vehicle_make as string | null,
      vehicleModel: certificate.vehicle_model as string | null,
      vehicleYear: certificate.vehicle_year as number | null,
      vehicleMileage: Number(certificate.vehicle_mileage),
      veriscore: Number(certificate.veriscore),
      workshopName: workshopRecord?.name ?? null,
      issuedAt: String(certificate.issued_at),
    });

    const emailResult = await sendCertificateIssuedEmail(customerEmail, {
      publicCode: String(certificate.public_code),
      bookingId: bookingReference,
      veriscore: Number(certificate.veriscore),
      vehicleMake: certificate.vehicle_make as string | null,
      vehicleModel: certificate.vehicle_model as string | null,
      pdfBytes,
    });
    if (!emailResult.sent) return NextResponse.json({ error: `Certificato creato ma email non inviata: ${emailResult.reason ?? "errore sconosciuto"}.` }, { status: 502 });

    const { error: closeError } = await db.from("bookings").update({ status: "completed", overall_notes: JSON.stringify(notesPayload) }).eq("id", bookingId).eq("workshop_id", workshop.id);
    if (closeError) return NextResponse.json({ error: closeError.message }, { status: 500 });

    return NextResponse.json({ ok: true, completedChecks, passedChecks, veriscore, status: "completed", certificate, email: emailResult, pdfGenerated: true });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_PUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
