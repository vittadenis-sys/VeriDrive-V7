"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BookingForm } from "@/components/BookingForm";

export default function Prenota() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="shell">
          <div className="eyebrow">Prenotazione</div>
          <h1 style={{ fontSize: 48 }}>Prenota la tua verifica</h1>
          <p className="lead">
            Completa i passaggi guidati e paga online. Per la V1 la verifica disponibile in questa pagina è quella da €99.
          </p>
          <div className="panel" style={{ margin: "24px 0" }}>
            <p style={{ marginBottom: 8 }}><b>Pagamento anticipato: €99</b></p>
            <p style={{ marginBottom: 0 }}>
              Appuntamento modificabile gratuitamente una sola volta fino a 24 ore prima.
            </p>
          </div>
          <p>
            Hai già un account? <Link href="/login">Accedi</Link>. Nuovo qui? <Link href="/registrati">Crea il tuo account</Link>.
          </p>
          <BookingForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
