import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const VERIFICATION_PRICE_CENTS = 7900;

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
  }

  const { bookingId } = await request.json();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId mancante" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Accedi prima di pagare." }, { status: 401 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 400 });
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, plate, vehicle_make, vehicle_model, customer_price_cents, stripe_checkout_session_id")
    .eq("id", bookingId)
    .eq("customer_id", customer.id)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
  }

  if (booking.stripe_checkout_session_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const existing = await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
    if (existing.url) return NextResponse.json({ url: existing.url });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const label = [booking.vehicle_make, booking.vehicle_model, booking.plate]
    .filter(Boolean)
    .join(" · ");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Verifica VeriDrive",
            description: label || "Verifica veicolo usato",
          },
          unit_amount: booking.customer_price_cents ?? VERIFICATION_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    customer_email: user.email ?? undefined,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?paid=${booking.id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/prenota?cancelled=${booking.id}`,
    metadata: { bookingId: booking.id },
  });

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", booking.id)
    .eq("customer_id", customer.id);

  if (updateError) {
    return NextResponse.json({ error: "Impossibile collegare il pagamento alla prenotazione." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
