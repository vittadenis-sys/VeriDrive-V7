import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";

export async function GET() {
  try {
    const user = await requireAdmin();
    return NextResponse.json({ ok: true, role: "admin", email: user.email ?? null });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Non autorizzato" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}
