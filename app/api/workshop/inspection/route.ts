import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateWeightedVeriscore } from "@/lib/veriscore";

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
      .select("id,workshop_id,service,service_key,plate,vehicle_make,vehicle_model,vehicle_year,vin,vehicle_mileage,overall_notes")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    let stored: any = {};
    try {
      stored = booking.overall_notes ? JSON.parse(String(booking.overall_notes)) : {};
    } catch {
      stored = {};
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        workshop_id: booking.workshop_id,
        service: booking.service,
        service_key: booking.service_key,
        plate: booking.plate,
        vehicle_make: booking.vehicle_make,
        vehicle_model: booking.vehicle_model,
        vehicle_year: booking.vehicle_year,
        vin: booking.vin,
        vehicle_mileage: booking.vehicle_mileage,
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
      vehicle?: {
        plate?: string;
        make?: string;
        model?: string;
        year?: number | null;
        vin?: string;
        mileage?: number | null;
      };
    };

    const bookingId = String(body.bookingId ?? "").trim();
    const checklistResults = Array.isArray(body.checklist) ? body.checklist : [];
    if (!bookingId || checklistResults.length !== 50) return NextResponse.json({ error: "La checklist deve contenere tutti i 50 controlli." }, { status: 400 });

    const ids = new Set(checklistResults.map((item) => Number(item.id)));
    if (ids.size !== 50 || [...ids].some((id) => id < 1 || id > 50)) {
      return NextResponse.json({ error: "Checklist non valida." }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,customer_id,workshop_id,status,service,service_key,plate,vehicle_make,vehicle_model,vehicle_year,vin,vehicle_mileage,overall_notes")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const results = Object.fromEntries(checklistResults.map((item) => [item.id, item.result ?? undefined]));
    const completedChecks = checklistResults.filter((item) => item.result !== null && item.result !== undefined).length;
    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const veriscore = calculateWeightedVeriscore(results);

    let previousNotes: Record<string, unknown> = {};
    try {
      previousNotes = booking.overall_notes ? JSON.parse(String(booking.overall_notes)) : {};
    } catch {
      previousNotes = {};
    }

    if (body.close && completedChecks !== 50) {
      return NextResponse.json({ error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." }, { status: 400 });
    }

    const serviceKey = String(booking.service_key ?? booking.service ?? "").trim();
    const certificateService = serviceKey === "veriscore" || serviceKey === "veriscore_plus";

    const vehicle = body.vehicle ?? {};
    const nextPlate = String(vehicle.plate ?? booking.plate ?? "").trim().toUpperCase();
    const nextMake = String(vehicle.make ?? booking.vehicle_make ?? "").trim();
    const nextModel = String(vehicle.model ?? booking.vehicle_model ?? "").trim();
    const nextYear = vehicle.year ?? booking.vehicle_year ?? null;
    const nextVin = String(vehicle.vin ?? booking.vin ?? "").trim().toUpperCase();
    const nextMileage = vehicle.mileage ?? booking.vehicle_mileage ?? null;

    if (body.close && certificateService) {
      if (!nextPlate || !nextVin || nextMileage == null || Number.isNaN(Number(nextMileage)) || Number(nextMileage) < 0) {
        return NextResponse.json({ error: "Per chiudere VeriScore servono targa, VIN e chilometraggio." }, { status: 400 });
      }
    }

    const completedAt = body.close ? new Date().toISOString() : previousNotes.completed_at ?? null;
    const notesPayload = {
      ...previousNotes,
      checklist: checklistResults,
      checklist_notes: String(body.notes ?? "").trim() || null,
      passed_checks: passedChecks,
      completed_checks: completedChecks,
      veriscore,
      completed_at: completedAt,
    };

    const bookingUpdate: Record<string, unknown> = {
      overall_notes: JSON.stringify(notesPayload),
      status: body.close ? "completed" : booking.status,
    };

    if (body.vehicle || certificateService) {
      bookingUpdate.plate = nextPlate;
      bookingUpdate.vehicle_make = nextMake || null;
      bookingUpdate.vehicle_model = nextModel || null;
      bookingUpdate.vehicle_year = nextYear == null || nextYear === "" ? null : Number(nextYear);
      bookingUpdate.vin = nextVin || null;
      bookingUpdate.vehicle_mileage = nextMileage == null || nextMileage === "" ? null : Number(nextMileage);
    }

    const { error: saveError } = await db
      .from("bookings")
      .update(bookingUpdate)
      .eq("id", bookingId)
      .eq("workshop_id", workshop.id);

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });

    let certificate: Record<string, unknown> | null = null;
    if (body.close && certificateService) {
      const { data: existingCertificate, error: existingError } = await db
        .from("veriscore_certificates")
        .select("id,public_code,booking_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

      if (existingCertificate) {
        certificate = existingCertificate as Record<string, unknown>;
      } else {
        const { data: publicCode, error: codeError } = await db.rpc("next_veriscore_certificate_code");
        if (codeError) return NextResponse.json({ error: codeError.message }, { status: 400 });

        const { data: createdCertificate, error: certificateError } = await db
          .from("veriscore_certificates")
          .insert({
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
          })
          .select("id,public_code,booking_id,veriscore,issued_at,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,workshop_id")
          .single();

        if (certificateError) return NextResponse.json({ error: certificateError.message }, { status: 400 });
        certificate = createdCertificate as Record<string, unknown>;
      }
    }

    return NextResponse.json({ ok: true, completedChecks, passedChecks, veriscore, status: body.close ? "completed" : booking.status, certificate });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_PUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
