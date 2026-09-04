import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json() as { workshopId?: string; slot?: string };
    const workshopId = String(body.workshopId ?? "").trim();
    const slot = String(body.slot ?? "").trim();
    if (!workshopId) return NextResponse.json({ error: "Officina mancante." }, { status: 400 });
    if (!slot) return NextResponse.json({ error: "Orario mancante." }, { status: 400 });

    const response = await fetch(new URL("/api/bookings/assign", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-veridrive-admin": "1" },
      body: JSON.stringify({ bookingId: id, workshopId, slot }),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
