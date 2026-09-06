import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const { bookingId } = await request.json();
  if (!bookingId) return NextResponse.json({ error: "bookingId mancante" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accedi prima di pagare." }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id,demo_access,autogerma_free_booking_bonus")
    .eq("auth_id", user.id)
    .single();
  if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 400 });

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id,customer_id,customer_price_cents,service_key,workshop_id,paid_with_autogerma_bonus")
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .single();

  if (bookingError || !booking) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });

  if (customer.demo_access) {
    const db = createServiceClient();
    const { error } = await db
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", booking.id)
      .eq("customer_id", customer.id);
    if (error) return NextResponse.json({ error: "Impossibile confermare la prenotazione demo." }, { status: 500 });
    return NextResponse.json({ demo: true, bookingId: booking.id, url: null });
  }

  return NextResponse.json({
    unavailable: true,
    bookingId: booking.id,
    url: null,
    message: "Il servizio di pagamento online è momentaneamente non disponibile. Nessun importo è stato addebitato. Per informazioni contattaci a info@veridrive.it.",
  });
}
