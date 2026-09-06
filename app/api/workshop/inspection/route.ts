import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PUT(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const body = await request.json() as {
      bookingId?: string;
      checklist?: Array<{ id: number; area: string; label: string; result: "ok" | "issue" | "critical" | null }>;
      notes?: string;
      close?: boolean;
      vehicle?: {
        plate?: string | null;
        make?: string | null;
        model?: string | null;
        year?: number | null;
        vin?: string | null;
        mileage?: number | null;
      };
    };

    const bookingId = String(body.bookingId ?? "").trim();
    const checklistResults = Array.isArray(body.checklist) ? body.checklist : [];
    if (!bookingId || checklistResults.length !== 50) {
      return NextResponse.json({ error: "La checklist deve contenere tutti i 50 controlli." }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).single();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: booking } = await db
      .from("bookings")
      .select("id,workshop_id,status,service_key,plate,vehicle_make,vehicle_model,vehicle_year,vin,vehicle_mileage")
      .eq("id", bookingId)
      .single();
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const isCertificateService = ["veriscore", "veriscore_plus"].includes(booking.service_key);
    const vehicle = body.vehicle ?? {};
    const nextPlate = isCertificateService && typeof vehicle.plate === "string" ? vehicle.plate.trim().toUpperCase() : booking.plate;
    const nextMake = isCertificateService && typeof vehicle.make === "string" ? vehicle.make.trim() || null : booking.vehicle_make;
    const nextModel = isCertificateService && typeof vehicle.model === "string" ? vehicle.model.trim() || null : booking.vehicle_model;
    const nextYear = isCertificateService && vehicle.year != null ? Number(vehicle.year) : booking.vehicle_year;
    const nextVin = isCertificateService && typeof vehicle.vin === "string" ? vehicle.vin.trim().toUpperCase() || null : booking.vin;
    const nextMileage = isCertificateService && vehicle.mileage != null ? Number(vehicle.mileage) : booking.vehicle_mileage;

    if (body.close && isCertificateService) {
      if (!nextPlate) return NextResponse.json({ error: "Per chiudere la pratica serve la targa." }, { status: 400 });
      if (!nextVin) return NextResponse.json({ error: "Per chiudere la pratica serve il VIN/telaio." }, { status: 400 });
      if (nextMileage == null || Number.isNaN(nextMileage) || nextMileage < 0) return NextResponse.json({ error: "Per chiudere la pratica servono i chilometri." }, { status: 400 });
    }

    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const veriscore = Math.round((passedChecks / 50) * 100);
    const { data: existing } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();

    if (isCertificateService) {
      const { error: vehicleError } = await db.from("bookings").update({
        plate: nextPlate,
        vehicle_make: nextMake,
        vehicle_model: nextModel,
        vehicle_year: nextYear,
        vin: nextVin,
        vehicle_mileage: nextMileage,
      }).eq("id", bookingId);
      if (vehicleError) return NextResponse.json({ error: vehicleError.message }, { status: 400 });
    }

    const payload = {
      booking_id: bookingId,
      checklist: checklistResults,
      passed_checks: passedChecks,
      veriscore,
      notes: String(body.notes ?? "").trim() || null,
      completed_at: body.close ? new Date().toISOString() : existing ? undefined : null,
    };

    const query = existing
      ? db.from("inspections").update(payload).eq("id", existing.id)
      : db.from("inspections").insert(payload);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, passedChecks, veriscore });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
