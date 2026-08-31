import { NextResponse } from "next/server"; import Stripe from "stripe";
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
  const { bookingId = "demo" } = await request.json();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment", payment_method_types: ["card"],
    line_items: [{ price_data: { currency: "eur", product_data: { name: "Verifica VeriDrive" }, unit_amount: 9900 }, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard?paid=${bookingId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/prenota`,
    metadata: { bookingId }
  });
  return NextResponse.json({ url: session.url });
}