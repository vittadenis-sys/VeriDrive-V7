import Link from "next/link";
import { CarFront, SearchCheck, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const usedCarServices = [
  {
    key: "online",
    name: "Verifica Online",
    description: "Verifica documentale e informativa gestita direttamente da VeriDrive, senza intervento dell'officina.",
    price: "39 €",
  },
  {
    key: "base",
    name: "Verifica Base",
    description: "Controllo completo del veicolo con checklist, VeriScore e report digitale.",
    price: "99 €",
    featured: true,
  },
  {
    key: "plus",
    name: "Verifica Plus",
    description: "Controllo più approfondito con foto dei soli difetti riscontrati, oltre a VeriScore e report.",
    price: "139 €",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="shell">
            <div className="eyebrow">VeriDrive · controlli indipendenti</div>
            <h1>Verifiche indipendenti. Scelte più sicure.</h1>
            <p className="lead">
              Controlla la tua auto oppure verifica un usato prima di acquistarlo, con un servizio chiaro, professionale e tracciabile.
            </p>
          </div>
        </section>

        <section id="servizi">
          <div className="shell">
            <div className="eyebrow">Scegli la tua esigenza</div>
            <h2>Come possiamo aiutarti?</h2>

            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "stretch" }}>
              <article className="card">
                <div className="icon"><CarFront /></div>
                <h3>Ho già un'auto</h3>
                <p>Controlla lo stato della tua vettura prima di partire oppure certificala con VeriCert.</p>

                <div className="cards" style={{ marginTop: 24, gridTemplateColumns: "1fr" }}>
                  <Link className="card" href="/servizi/pre-viaggio" style={{ display: "block" }}>
                    <h4>Controllo Pre Viaggio</h4>
                    <div className="score" style={{ fontSize: "2rem", margin: "12px 0" }}>49 €</div>
                    <p>Controllo mirato prima di un viaggio.</p>
                    <span className="actions" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>Scopri il servizio <ArrowRight size={16} /></span>
                  </Link>
                  <Link className="card" href="/servizi/vericert" style={{ display: "block" }}>
                    <h4>VeriCert</h4>
                    <div className="score" style={{ fontSize: "2rem", margin: "12px 0" }}>99 €</div>
                    <p>Lo stesso controllo completo della Verifica Base.</p>
                    <span className="actions" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>Scopri il servizio <ArrowRight size={16} /></span>
                  </Link>
                </div>
              </article>

              <article className="card">
                <div className="icon"><SearchCheck /></div>
                <h3>Devo acquistare un'auto usata</h3>
                <p>Scegli il livello di verifica più adatto alla tua esigenza.</p>

                <div className="cards" style={{ marginTop: 24, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  {usedCarServices.map((service) => (
                    <Link
                      key={service.key}
                      className="card"
                      href={`/prenota?service=${service.key}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: service.featured ? "2px solid #2563EB" : undefined,
                      }}
                    >
                      <div>
                        {service.featured && <div className="eyebrow">Consigliata</div>}
                        <h4>{service.name}</h4>
                        <div className="score" style={{ fontSize: "2rem", margin: "12px 0" }}>{service.price}</div>
                        <p>{service.description}</p>
                      </div>
                      <span className="actions" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>Scopri <ArrowRight size={16} /></span>
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="shell">
            <h2>Hai già scelto il servizio?</h2>
            <p>Inizia la prenotazione e segui i passaggi guidati.</p>
            <Link className="button" href="/prenota">Prenota una verifica</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
