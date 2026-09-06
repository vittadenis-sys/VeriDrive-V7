import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");

  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("auth_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (adminError) {
    throw new Error(`Admin lookup failed: ${adminError.message}`);
  }

  if (!admin || !["admin", "super_admin"].includes(admin.role)) {
    throw new Error("Unauthorized");
  }

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
