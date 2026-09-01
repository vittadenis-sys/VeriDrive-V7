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
          <div className="eyebrow">Verifica Plus</div>
          <h1 style={{ fontSize: 48 }}>Prenota la tua verifica</h1>
          <p className="lead">
            Indica l'auto, scegli dove si trova e quando vuoi effettuare il controllo. Il pagamento di €99 avviene online prima della conferma.
          </p>

          <div className="panel" style={{ margin: "24px 0" }}>
            <p style={{ marginBottom: 8 }}><b>Verifica Plus · €99</b></p>
            <p style={{ marginBottom: 0 }}>
              <b>Puoi spostare l'appuntamento una sola volta, gratuitamente, almeno 24 ore prima.</b>
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
