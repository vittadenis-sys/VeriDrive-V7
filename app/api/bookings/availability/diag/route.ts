import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VERSION = "availability-diag-2026-09-11-v1";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const date = String(url.searchParams.get("date") ?? "").trim();
  const service = String(url.searchParams.get("service") ?? "veriscore_plus");
  const urgency = url.searchParams.get("urgency") === "true";
  const result: Record<string, unknown> = { version: VERSION, date, service, urgency };

  const workshopsQuery = await supabase.from("workshops").select("id,name,city,address").order("city", { ascending: true });
  result.workshopsError = workshopsQuery.error?.message ?? null;
  result.workshopsCode = workshopsQuery.error?.code ?? null;
  result.workshopsCount = workshopsQuery.data?.length ?? 0;
  result.workshops = workshopsQuery.data ?? [];

  if (workshopsQuery.error || !date) {
    return NextResponse.json(result, { status: workshopsQuery.error ? 400 : 200, headers: { "Cache-Control": "no-store" } });
  }

  const requested = new Date(`${date}T12:00:00`);
  const weekday = requested.getDay() || 7;
  result.weekday = weekday;

  const perWorkshop = [];
  for (const workshop of workshopsQuery.data ?? []) {
    const settingsQuery = await supabase.from("workshop_settings").select("max_daily_inspections,accepts_urgent").eq("workshop_id", workshop.id).maybeSingle();
    const closureQuery = await supabase.from("workshop_closures").select("id").eq("workshop_id", workshop.id).lte("starts_on", date).gte("ends_on", date).limit(1);
    const scheduleQuery = await supabase.from("workshop_schedule").select("slot_time").eq("workshop_id", workshop.id).eq("weekday", weekday).eq("active", true).order("slot_time");
    const bookingsQuery = await supabase.from("bookings").select("requested_slot").eq("workshop_id", workshop.id).eq("requested_date", date).in("status", ["requested", "assigned", "confirmed", "in_progress"]);
    perWorkshop.push({
      workshop,
      settings: settingsQuery.data ?? null,
      settingsError: settingsQuery.error?.message ?? null,
      closureCount: closureQuery.data?.length ?? null,
      closureError: closureQuery.error?.message ?? null,
      schedule: scheduleQuery.data ?? [],
      scheduleError: scheduleQuery.error?.message ?? null,
      bookings: bookingsQuery.data ?? [],
      bookingsError: bookingsQuery.error?.message ?? null,
    });
  }

  result.perWorkshop = perWorkshop;
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
