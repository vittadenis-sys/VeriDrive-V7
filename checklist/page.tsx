import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import ChecklistClient from "./ChecklistClient";

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ booking?: string }> }) {
  const params = await searchParams;
  const bookingId = String(params.booking ?? "").trim();
  if (!bookingId) redirect("/officina");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createServiceClient();

  const { data: admin } = await db
    .from("admins")
    .select("role")
    .eq("auth_id", user.id)
    .maybeSingle();

  const isAdmin = !!admin && ["admin", "super_admin"].includes(admin.role);

  const { data: workshop } = isAdmin
    ? await db.from("workshops").select("id").order("name", { ascending: true }).limit(1).maybeSingle()
    : await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();

  if (!workshop) redirect("/officina");

  const { data: booking } = await db
    .from("bookings")
    .select("id,workshop_id,status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.workshop_id !== workshop.id) redirect("/officina");

  return <ChecklistClient bookingId={bookingId} />;
}
