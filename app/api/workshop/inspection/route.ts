import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateWeightedVeriscore } from "@/lib/veriscore";
import { sendCertificateIssuedEmail } from "@/lib/notifications";

function parseOverallNotes(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {}; }
  catch { return {}; }
}

async function getWorkshop(db: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await db.from("workshops").select("id").eq("owner_auth_id", userId).maybeSingle();
  return data;
}

export async function GET(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const bookingId = new URL(request.url).searchParams.get("bookingId")?.trim();
    if (!bookingId) return NextResponse.json({ error: "Pratica non trovata." }, { status: 400 });
    const db = createServiceClient();
    const workshop = await getWorkshop(db, user.id);
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: booking, error: bookingError } = await db.from("bookings").select("id,workshop_id,service,overall_notes,vehicle_id").eq("id", bookingId).maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    let vehicle: Record<string, unknown> | null = null;
    if (booking.vehicle_id) {
      const { data: vehicleData, error: vehicleError } = await db.from("vehicles").select("*").eq("id", booking.vehicle_id).maybeSingle();
      if (vehicleError) return NextResponse.json({ error: vehicleError.message }, { status: 500 });
      vehicle = vehicleData;
    }
    const stored = parseOverallNotes(booking.overall_notes);
    const { data: inspection } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();
    return NextResponse.json({
      booking: {
        id: booking.id, workshop_id: booking.workshop_id, service: booking.service,
        plate: String(vehicle?.plate ?? vehicle?.registration ?? vehicle?.license_plate ?? stored.plate ?? ""),
        vehicle_make: String(vehicle?.make ?? vehicle?.brand ?? vehicle?.vehicle_make ?? stored.vehicle_make ?? "") || null,
        vehicle_model: String(vehicle?.model ?? vehicle?.vehicle_model ?? stored.vehicle_model ?? "") || null,
        vehicle_year: vehicle?.year ?? vehicle?.vehicle_year ?? stored.vehicle_year ?? null,
        vin: String(vehicle?.vin ?? vehicle?.vehicle_vin ?? stored.vin ?? "") || null,
        vehicle_mileage: vehicle?.mileage ?? vehicle?.vehicle_mileage ?? stored.vehicle_mileage ?? null,
      },
      inspection: {
        id: inspection?.id ?? null,
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
    const ids = new Set(checklistResults.map(item => Number(item.id)));
    if (ids.size !== 50 || [...ids].some(id => id < 1 || id > 50)) return NextResponse.json({ error: "Checklist non valida." }, { status: 400 });
    const db = createServiceClient();
    const workshop = await getWorkshop(db, user.id);
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const { data: booking, error: bookingError } = await db.from("bookings").select("id,customer_id,workshop_id,status,service,overall_notes,vehicle_id").eq("id", bookingId).maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    const results = Object.fromEntries(checklistResults.map(item => [item.id, item.result ?? undefined]));
    const completedChecks = checklistResults.filter(item => item.result !== null && item.result !== undefined).length;
    const passedChecks = checklistResults.filter(item => item.result === "ok").length;
    const veriscore = calculateWeightedVeriscore(results);
    const previousNotes = parseOverallNotes(booking.overall_notes);
    if (body.close && completedChecks !== 50) return NextResponse.json({ error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." }, { status: 400 });
    const serviceKey = String(booking.service ?? "").trim();
    const certificateService = serviceKey === "veriscore" || serviceKey === "veriscore_plus";
    let currentVehicle: Record<string, unknown> = {};
    if (booking.vehicle_id) {
      const { data: vehicleData, error: vehicleError } = await db.from("vehicles").select("*").eq("id", booking.vehicle_id).maybeSingle();
      if (vehicleError) return NextResponse.json({ error: vehicleError.message }, { status: 500 });
      currentVehicle = vehicleData ?? {};
    }
    const incomingVehicle = body.vehicle ?? {};
    const nextPlate = String(incomingVehicle.plate ?? currentVehicle.plate ?? currentVehicle.registration ?? currentVehicle.license_plate ?? previousNotes.plate ?? "").trim().toUpperCase();
    const nextMake = String(incomingVehicle.make ?? currentVehicle.make ?? currentVehicle.brand ?? currentVehicle.vehicle_make ?? previousNotes.vehicle_make ?? "").trim();
    const nextModel = String(incomingVehicle.model ?? currentVehicle.model ?? currentVehicle.vehicle_model ?? previousNotes.vehicle_model ?? "").trim();
    const nextYear = incomingVehicle.year ?? currentVehicle.year ?? currentVehicle.vehicle_year ?? previousNotes.vehicle_year ?? null;
    const nextVin = String(incomingVehicle.vin ?? currentVehicle.vin ?? currentVehicle.vehicle_vin ?? previousNotes.vin ?? "").trim().toUpperCase();
    const rawMileage = incomingVehicle.mileage ?? currentVehicle.mileage ?? currentVehicle.vehicle_mileage ?? previousNotes.vehicle_mileage ?? null;
    const nextMileage = rawMileage === null || rawMileage === undefined || rawMileage === "" ? null : Number(rawMileage);
    if (body.close && certificateService) {
      if (!nextPlate) return NextResponse.json({ error: "Per chiudere VeriScore serve la targa." }, { status: 400 });
      if (!nextVin) return NextResponse.json({ error: "Per chiudere VeriScore serve il VIN/telaio." }, { status: 400 });
      if (nextMileage === null || !Number.isFinite(nextMileage) || nextMileage < 0) return NextResponse.json({ error: "Per chiudere VeriScore servono i chilometri." }, { status: 400 });
    }
    const completedAt = body.close ? new Date().toISOString() : previousNotes.completed_at ?? null;
    const notesPayload = JSON.stringify({ ...previousNotes, checklist: checklistResults, checklist_notes: String(body.notes ?? "").trim() || null, passed_checks: passedChecks, completed_checks: completedChecks, veriscore, completed_at: completedAt, plate: nextPlate || null, vehicle_make: nextMake || null, vehicle_model: nextModel || null, vehicle_year: nextYear == null || nextYear === "" ? null : Number(nextYear), vin: nextVin || null, vehicle_mileage: nextMileage });
    let inspectionId: string | null = null;
    if (certificateService) {
      const { data: existingInspection } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();
      if (existingInspection?.id) inspectionId = existingInspection.id;
      if (!inspectionId) {
        const { data: createdInspection, error: inspectionError } = await db.from("inspections").insert({ booking_id: bookingId, inspector_auth_id: user.id, checklist: checklistResults, passed_checks: passedChecks, veriscore, notes: String(body.notes ?? "").trim() || null, completed_at: body.close ? completedAt : null }).select("id").single();
        if (inspectionError) return NextResponse.json({ error: inspectionError.message }, { status: 400 });
        inspectionId = createdInspection.id;
      } else {
        const { error: inspectionUpdateError } = await db.from("inspections").update({ inspector_auth_id: user.id, checklist: checklistResults, passed_checks: passedChecks, veriscore, notes: String(body.notes ?? "").trim() || null, completed_at: body.close ? completedAt : null, updated_at: new Date().toISOString() }).eq("id", inspectionId);
        if (inspectionUpdateError) return NextResponse.json({ error: inspectionUpdateError.message }, { status: 400 });
      }
    }
    const { error: saveError } = await db.from("bookings").update({ overall_notes: notesPayload, status: body.close ? "completed" : booking.status }).eq("id", bookingId).eq("workshop_id", workshop.id);
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });
    let certificate: Record<string, unknown> | null = null;
    if (body.close && certificateService) {
      const { data: existingCertificate, error: existingError } = await db.from("veriscore_certificates").select("id,public_code,booking_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id").eq("booking_id", bookingId).maybeSingle();
      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });
      if (existingCertificate) certificate = existingCertificate as Record<string, unknown>;
      else {
        const { data: publicCode, error: codeError } = await db.rpc("next_veriscore_certificate_code");
        if (codeError) return NextResponse.json({ error: codeError.message }, { status: 400 });
        const { data: createdCertificate, error: certificateError } = await db.from("veriscore_certificates").insert({ booking_id: bookingId, inspection_id: inspectionId, public_code: publicCode, vehicle_plate: nextPlate, vehicle_vin: nextVin, vehicle_make: nextMake || null, vehicle_model: nextModel || null, vehicle_year: nextYear == null || nextYear === "" ? null : Number(nextYear), vehicle_mileage: Number(nextMileage), veriscore, workshop_id: workshop.id, issued_at: completedAt }).select("id,public_code,booking_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id").single();
        if (certificateError) return NextResponse.json({ error: certificateError.message }, { status: 400 });
        certificate = createdCertificate as Record<string, unknown>;
      }
      let customerEmail: string | null = null;
      if (booking.customer_id) {
        const { data: customer } = await db.from("customers").select("auth_id").eq("id", booking.customer_id).maybeSingle();
        if (customer?.auth_id) {
          const { data: authUser } = await db.auth.admin.getUserById(customer.auth_id);
          customerEmail = authUser.user?.email ?? null;
        }
      }
      if (customerEmail && certificate) {
        const emailResult = await sendCertificateIssuedEmail(customerEmail, { publicCode: String(certificate.public_code), bookingId, veriscore: Number(certificate.veriscore), vehicleMake: certificate.vehicle_make as string | null, vehicleModel: certificate.vehicle_model as string | null });
        if (!emailResult.sent) return NextResponse.json({ error: emailResult.reason ?? "Invio email non riuscito.", certificate }, { status: 502 });
      }
    }
    return NextResponse.json({ ok: true, completedChecks, passedChecks, veriscore, status: body.close ? "completed" : booking.status, certificate });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_PUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
