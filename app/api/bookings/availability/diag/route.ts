import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const VERSION = "availability-diag-2026-09-12-v2";
const SLOT_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

export async function GET(request: Request) {
  const db = createServiceClient();
  const url = new URL(request.url);
  const date = String(url.searchParams.get("date") ?? "").trim();
  const service = String(url.searchParams.get("service") ?? "veriscore_plus");
  const urgency = url.searchParams.get("urgency") === "true";
  const result: Record<string, unknown> = { version: VERSION, date, service, urgency };

  const workshopsQuery = await db
    .from("workshops")
    .select("id,name,city,address,cap,lat,lng,active")
    .eq("active", true)
    .order("city", { ascending: true });

  result.workshopsError = workshopsQuery.error?.message ?? null;
  result.workshopsCode = workshopsQuery.error?.code ?? null;
  result.workshopsCount = workshopsQuery.data?.length ?? 0;
  result.workshops = workshopsQuery.data ?? [];

  if (workshopsQuery.error || !date) {
    return NextResponse.json(result, {
      status: workshopsQuery.error ? 400 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const perWorkshop = [];
  for (const workshop of workshopsQuery.data ?? []) {
    const bookingsQuery = await db
      .from("bookings")
      .select("slot")
      .eq("workshop_id", workshop.id)
      .eq("requested_date", date)
      .in("status", ["requested", "assigned", "confirmed", "in_progress"]);

    const busy = new Set((bookingsQuery.data ?? []).map((booking) => booking.slot).filter(Boolean));
    const availableSlots = SLOT_TIMES.filter((slot) => !busy.has(slot));

    perWorkshop.push({
      workshop,
      bookings: bookingsQuery.data ?? [],
      bookingsError: bookingsQuery.error?.message ?? null,
      availableSlots,
    });
  }

  result.perWorkshop = perWorkshop;
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
