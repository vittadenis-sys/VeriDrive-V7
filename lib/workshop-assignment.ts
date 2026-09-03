import { createClient } from "@/lib/supabase/server";

export type WorkshopCandidate = {
  id: string;
  name: string;
  distanceKm: number;
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearestAvailableWorkshop(
  bookingId: string,
  latitude: number,
  longitude: number,
  requestedDate: string,
  requestedSlot: string,
  urgent = false,
): Promise<WorkshopCandidate | null> {
  const supabase = await createClient();

  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("id,name,latitude,longitude,radius_km")
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error || !workshops?.length) return null;

  const { data: schedules } = await supabase
    .from("workshop_schedule")
    .select("workshop_id,weekday,slot_time,active")
    .eq("active", true);

  const { data: closures } = await supabase
    .from("workshop_closures")
    .select("workshop_id,starts_on,ends_on");

  const { data: settings } = await supabase
    .from("workshop_settings")
    .select("workshop_id,max_daily_inspections,accepts_urgent");

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id,workshop_id,requested_date,requested_slot,status")
    .eq("requested_date", requestedDate)
    .in("status", ["assigned", "confirmed", "in_progress"]);

  const weekday = new Date(`${requestedDate}T00:00:00`).getDay() || 7;
  const candidates: WorkshopCandidate[] = [];

  for (const workshop of workshops) {
    if (workshop.latitude == null || workshop.longitude == null) continue;

    const distance = distanceKm(latitude, longitude, Number(workshop.latitude), Number(workshop.longitude));
    if (distance > Number(workshop.radius_km ?? 25)) continue;

    const isClosed = (closures ?? []).some((closure) =>
      closure.workshop_id === workshop.id &&
      requestedDate >= closure.starts_on &&
      requestedDate <= closure.ends_on,
    );
    if (isClosed) continue;

    const schedule = (schedules ?? []).some(
      (slot) => slot.workshop_id === workshop.id && slot.weekday === weekday && slot.slot_time === requestedSlot,
    );
    if (!schedule) continue;

    const setting = (settings ?? []).find((row) => row.workshop_id === workshop.id);
    if (urgent && !setting?.accepts_urgent) continue;

    const count = (existingBookings ?? []).filter(
      (booking) => booking.workshop_id === workshop.id,
    ).length;
    if (setting && count >= setting.max_daily_inspections) continue;

    const alreadyTaken = (existingBookings ?? []).some(
      (booking) => booking.workshop_id === workshop.id && booking.requested_slot === requestedSlot,
    );
    if (alreadyTaken) continue;

    candidates.push({ id: workshop.id, name: workshop.name, distanceKm: Math.round(distance * 10) / 10 });
  }

  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  if (!candidates[0]) return null;

  await supabase
    .from("bookings")
    .update({ workshop_id: candidates[0].id, status: "assigned" })
    .eq("id", bookingId);

  return candidates[0];
}
