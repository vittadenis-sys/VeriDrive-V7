import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateWeightedVeriscore } from "@/lib/veriscore";
import { sendCertificateIssuedEmail } from "@/lib/notifications";

function parseOverallNotes(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
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

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,workshop_id,service,overall_notes,vehicle_id")
      .eq("id", bookingId)
      .maybeSingle();
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
      inspection: {
        checklist: Array.isArray(stored.checklist) ? stored.checklist : [],
        notes: stored.checklist_notes ?? null,
        passed_checks: Number(stored.passed_checks ?? 0),
        veriscore: Number(stored.veriscore ?? 0),
        completed_at: stored.completed_at ?? null,
      },
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

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,customer_id,workshop_id,status,service,overall_notes,vehicle_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const results = Object.fromEntries(checklistResults.map((item) => [item.id, item.result ?? undefined]));
    const completedChecks = checklistResults.filter((item) => item.result !== null && item.result !== undefined).length;
    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const veriscore = calculateWeightedVeriscore(results);
    const previousNotes = parseOverallNotes(booking.overall_notes);

    if (body.close && completedChecks !== 50) return NextResponse.json({ error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." }, { status: 400 });

    const serviceKey = String(booking.service ?? "").trim();
    const certificateService = serviceKey === "veriscore" || serviceKey === "veriscore_plus";

    const currentVehicle = await getVehicle(db, booking.vehicle_id);
    const incomingVehicle = body.vehicle ?? {};
    const nextPlate = String(incomingVehicle.plate ?? getVehicleValue(currentVehicle, "plate", "registration", "license_plate", "targa") ?? "").trim().toUpperCase();
    const nextMake = String(incomingVehicle.make ?? getVehicleValue(currentVehicle, "make", "brand", "vehicle_make", "marca") ?? "").trim();
    const nextModel = String(incomingVehicle.model ?? getVehicleValue(currentVehicle, "model", "vehicle_model", "modello") ?? "").trim();
    const nextYear = incomingVehicle.year ?? getVehicleValue(currentVehicle, "year", "vehicle_year", "anno") ?? null;
    const nextVin = String(incomingVehicle.vin ?? getVehicleValue(currentVehicle, "vin", "vehicle_vin") ?? "").trim().toUpperCase();
    const rawMileage = incomingVehicle.mileage ?? getVehicleValue(currentVehicle, "mileage", "vehicle_mileage");
    const nextMileage = rawMileage === null || rawMileage === undefined || rawMileage === "" ? null : Number(rawMileage);

    if (body.close && certificateService) {
      if (!nextPlate) return NextResponse.json({ error: "Per chiudere VeriScore serve la targa." }, { status: 400 });
      if (!nextVin) return NextResponse.json({ error: "Per chiudere VeriScore serve il VIN/telaio." }, { status: 400 });
      if (nextMileage === null || !Number.isFinite(nextMileage) || nextMileage < 0) return NextResponse.json({ error: "Per chiudere VeriScore servono i chilometri." }, { status: 400 });
    }

    const completedAt = body.close ? new Date().toISOString() : previousNotes.completed_at ?? null;
    const updatePayload: Record<string, unknown> = {
      overall_notes: JSON.stringify({ ...previousNotes, checklist: checklistResults, checklist_notes: String(body.notes ?? "").trim() || null, passed_checks: passedChecks, completed_checks: completedChecks, veriscore, completed_at: completedAt }),
      status: body.close ? "completed" : booking.status,
    };

    const { error: saveError } = await db.from("bookings").update(updatePayload).eq("id", bookingId).eq("workshop_id", workshop.id);
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });

    let certificate: Record<string, unknown> | null = null;
    let emailResult: unknown = null;
    if (body.close && certificateService) {
      const { data: existingCertificate, error: existingError } = await db.from("veriscore_certificates").select("id,public_code,booking_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id").eq("booking_id", bookingId).maybeSingle();
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

      if (existingCertificate) {
        certificate = existingCertificate as Record<string, unknown>;
      } else {
        const { data: publicCode, error: codeError } = await db.rpc("next_veriscore_certificate_code");
        if (codeError) return NextResponse.json({ error: codeError.message }, { status: 400 });
        const { data: createdCertificate, error: certificateError } = await db.from("veriscore_certificates").insert({
          booking_id: bookingId,
          public_code: publicCode,
          vehicle_plate: nextPlate,
          vehicle_vin: nextVin,
          vehicle_make: nextMake || null,
          vehicle_model: nextModel || null,
          vehicle_year: nextYear == null || nextYear === "" ? null : Number(nextYear),
          vehicle_mileage: Number(nextMileage),
          veriscore,
          workshop_id: workshop.id,
          issued_at: completedAt,
        }).select("id,public_code,booking_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id").single();
        if (certificateError) return NextResponse.json({ error: certificateError.message }, { status: 400 });
        certificate = createdCertificate as Record<string, unknown>;
      }

      if (certificate) {
        const { data: customer } = await db.from("customers").select("auth_id,full_name").eq("id", booking.customer_id).maybeSingle();
        if (customer?.auth_id) {
          const { data: authUser, error: authUserError } = await db.auth.admin.getUserById(customer.auth_id);
          if (!authUserError && authUser.user?.email) {
            emailResult = await sendCertificateIssuedEmail(authUser.user.email, {
              publicCode: String(certificate.public_code),
              bookingId: String(booking.booking_code ?? bookingId),
              veriscore,
              vehicleMake: certificate.vehicle_make as string | null,
              vehicleModel: certificate.vehicle_model as string | null,
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, completedChecks, passedChecks, veriscore, status: body.close ? "completed" : booking.status, certificate, email: emailResult });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_PUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
