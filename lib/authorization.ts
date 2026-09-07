import { createClient } from "@/lib/supabase/server";

export async function getCurrentAdminRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .select("auth_id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (adminError || !admin) return null;
  return { user, role: admin.role as "admin" | "super_admin" };
}

export async function requireAdmin() {
  const current = await getCurrentAdminRole();
  if (!current) throw new Error("Unauthorized");
  return current.user;
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
