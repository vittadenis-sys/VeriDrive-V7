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
          <div className="eyebrow">PRENOTAZIONE VERIDRIVE</div>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 56px)", marginBottom: 12 }}>Prenota la tua verifica</h1>
          <p className="lead">
            Scegli il servizio, indicaci dove si trova l'auto e quando vuoi effettuare il controllo. Il riepilogo finale mostra il totale prima del pagamento.
          </p>

          <div className="panel" style={{ margin: "24px 0" }}>
            <p style={{ marginBottom: 8 }}><b>Servizio e prezzo</b></p>
            <p style={{ marginBottom: 0 }}>
              Il servizio selezionato viene mostrato direttamente nel modulo. Per gli appuntamenti in officina puoi spostare l'appuntamento una sola volta, gratuitamente, almeno 24 ore prima.
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
