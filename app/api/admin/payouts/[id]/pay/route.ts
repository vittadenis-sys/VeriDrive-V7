import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = createServiceClient();

    const { data: payout, error: payoutError } = await db
      .from("payouts")
      .select("id,status,workshop_id,amount_cents")
      .eq("id", id)
      .single();
    if (payoutError || !payout) return NextResponse.json({ error: "Liquidazione non trovata." }, { status: 404 });
    if (payout.status !== "approved") return NextResponse.json({ error: "La liquidazione deve essere approvata prima del pagamento." }, { status: 400 });

    const { data: invoice, error: invoiceError } = await db
      .from("workshop_invoice_records")
      .select("id,invoice_status,total_due_cents")
      .eq("workshop_id", payout.workshop_id)
      .order("period_month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 400 });
    if (!invoice || invoice.invoice_status !== "received") {
      return NextResponse.json({ error: "Pagamento bloccato: manca la fattura dell'officina." }, { status: 400 });
    }
    if (Number(invoice.total_due_cents ?? 0) > 0 && Number(invoice.total_due_cents) !== Number(payout.amount_cents ?? 0)) {
      return NextResponse.json({ error: "Importo fattura e liquidazione non coincidono." }, { status: 400 });
    }

    const { error } = await db
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    await db.from("workshop_invoice_records").update({ invoice_status: "paid", paid_at: new Date().toISOString() }).eq("id", invoice.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
