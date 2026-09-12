import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized");

  const db = createServiceClient();

  // The live workshops table now contains owner_auth_id. Do not rely on
  // is_active here: the owner relationship is enough for authorization and
  // keeps this guard compatible with the current production schema.
  const { data: workshop, error } = await db
    .from("workshops")
    .select("id,owner_auth_id")
    .eq("owner_auth_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Workshop lookup failed: ${error.message}`);
  }

  if (!workshop) {
    throw new Error("Workshop owner required");
  }

  return user;
}
