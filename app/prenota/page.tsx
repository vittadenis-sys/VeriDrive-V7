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
            Scegli il servizio e completa i dati richiesti. La Verifica Online è un servizio digitale senza appuntamento; gli altri servizi in officina richiedono una data e uno slot disponibili.
          </p>

          <div className="panel" style={{ margin: "24px 0" }}>
            <p style={{ marginBottom: 8 }}><b>Come funziona il servizio scelto</b></p>
            <p style={{ marginBottom: 0 }}>
              Per i servizi in officina il primo appuntamento standard è disponibile da 48 ore in avanti. L'opzione Urgenza, quando disponibile, permette di cercare uno slot da almeno 24 ore di preavviso. La Verifica Online non è un appuntamento e non è soggetta a queste regole.
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
