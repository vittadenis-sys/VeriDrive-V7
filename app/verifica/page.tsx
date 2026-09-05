import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const clean = String(code ?? "").trim().toUpperCase();
  if (clean) redirect(`/verifica/${encodeURIComponent(clean)}`);
  redirect("/");
}
