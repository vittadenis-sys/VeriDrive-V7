import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChecklistClient from "./ChecklistClient";

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const params = await searchParams;
  const bookingId = String(params.booking ?? "").trim();
  if (!bookingId) redirect("/officina");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workshop } = await supabase.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
  if (!workshop) redirect("/officina");

  const { data: booking } = await supabase.from("bookings").select("id,workshop_id").eq("id", bookingId).maybeSingle();
  if (!booking || booking.workshop_id !== workshop.id) redirect("/officina");

  return <ChecklistClient bookingId={bookingId} />;
}
