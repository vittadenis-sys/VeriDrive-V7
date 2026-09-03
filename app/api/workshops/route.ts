import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("id,name,display_name,address,city,postal_code,is_active,is_primary,radius_km")
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("city", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ workshops: workshops ?? [] });
}
