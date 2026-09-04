import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) throw new Error("Unauthorized");
  return user;
}

export async function requireWorkshopOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: workshop, error } = await supabase
    .from("workshops")
    .select("id")
    .eq("owner_auth_id", user.id)
    .single();
  if (error || !workshop) throw new Error("Workshop owner required");
  return user;
}
