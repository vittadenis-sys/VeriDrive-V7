import Link from "next/link";
import { CarFront, SearchCheck, ShieldCheck, ArrowRight, QrCode, Gauge } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ownerServices = [
  { href: "/auto#viaggio", name: "Controllo Viaggio", price: "49 €", description: "Prima di partire, controlla le principali criticità di sicurezza." },
  { href: "/auto#checkup", name: "Check-up + VeriScore", price: "99 €", description: "Checklist completa, VeriScore e certificato digitale." },
];

const purchaseServices = [
  { href: "/acquisto-auto-usata#online", name: "Verifica Online", price: "39 €", description: "Analisi manuale di annuncio e documentazione entro 3 ore lavorative." },
  { href: "/acquisto-auto-usata#base", name: "Controllo Base", price: "99 €", description: "Verifica completa in officina con VeriScore e certificato.", featured: true },
  { href: "/acquisto-auto-usata#plus", name: "Verifica Plus", price: "149 €", description: "Aggiunge foto dei soli difetti riscontrati e stima indicativa dei costi." },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">VERIDRIVE · VERIFICHE AUTO INDIPENDENTI</div>
              <h1>Conosci davvero l'auto prima di decidere.</h1>
              <p className="lead">Controlli professionali, VeriScore e certificazione digitale per comprare o usare un'auto con più informazioni e meno sorprese.</p>
              <div className="actions">
                <Link className="button" href="#percorsi">Scegli il percorso</Link>
                <Link className="button secondary" href="/prenota">Prenota una verifica</Link>
              </div>
              <div className="trust-row">
                <div><ShieldCheck size={18} /> Controlli indipendenti</div>
                <div><Gauge size={18} /> VeriScore</div>
                <div><QrCode size={18} /> Certificato verificabile</div>
              </div>
            </div>
            <div className="hero-visual" aria-label="Anteprima controllo auto VeriDrive">
              <div className="inspection-scene">
                <div className="scene-glow" />
                <div className="inspection-car"><div className="car-roof" /><div className="car-body" /><div className="wheel wheel-a" /><div className="wheel wheel-b" /><div className="headlight" /></div>
                <div className="inspection-card">
                  <div className="inspection-card-top"><span>VERIDRIVE CHECK</span><span>VERIFICATO</span></div>
                  <div className="inspection-row"><Gauge size={18} /><span>VeriScore</span><strong>92/100</strong></div>
                  <div className="inspection-row"><ShieldCheck size={18} /><span>Controlli</span><strong>48/50</strong></div>
                  <div className="inspection-row"><QrCode size={18} /><span>Certificato</span><strong>QR</strong></div>
                </div>
              </div>
              <div className="hero-note"><span>✓</span> Metodo standardizzato · risultato chiaro · verifica online</div>
            </div>
          </div>
        </section>

        <section id="percorsi">
          <div className="shell">
            <div className="eyebrow">SCEGLI IL TUO PERCORSO</div>
            <h2>Da dove vuoi partire?</h2>
            <p className="lead">Una scelta semplice ti porta direttamente al servizio giusto.</p>
            <div className="journeys">
              <article className="journey card">
                <div className="journey-heading"><div className="icon"><CarFront size={24} /></div><div><div className="eyebrow">HO GIÀ UN'AUTO</div><h3>Controlla la tua vettura</h3></div></div>
                <p>Per partire più tranquillo o avere un check-up certificato.</p>
                <div className="service-list">{ownerServices.map((service) => <Link key={service.href} className="service-item" href={service.href}><div><strong>{service.name}</strong><span>{service.description}</span></div><div className="service-price">{service.price}<ArrowRight size={18} /></div></Link>)}</div>
              </article>
              <article className="journey card">
                <div className="journey-heading"><div className="icon"><SearchCheck size={24} /></div><div><div className="eyebrow">DEVO COMPRARE UN'AUTO USATA</div><h3>Verifica prima di acquistare</h3></div></div>
                <p>Dall'annuncio alla verifica completa in officina.</p>
                <div className="service-list">{purchaseServices.map((service) => <Link key={service.href} className={`service-item ${service.featured ? "featured" : ""}`} href={service.href}><div>{service.featured && <span className="recommended">PIÙ SCELTA</span>}<strong>{service.name}</strong><span>{service.description}</span></div><div className="service-price">{service.price}<ArrowRight size={18} /></div></Link>)}</div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <div className="shell">
            <div className="proof-grid">
              <div><div className="eyebrow">PERCHÉ VERIDRIVE</div><h2>Una verifica che lascia una prova.</h2><p className="lead">Per i servizi certificati, il risultato diventa un documento digitale verificabile con VeriScore e QR pubblico.</p></div>
              <div className="proof-cards">
                <div className="mini-card"><ShieldCheck /><strong>Metodo standardizzato</strong><span>Controlli strutturati per rendere i risultati più leggibili.</span></div>
                <div className="mini-card"><Gauge /><strong>VeriScore</strong><span>Un punteggio sintetico per capire subito il risultato.</span></div>
                <div className="mini-card"><QrCode /><strong>QR verificabile</strong><span>Il certificato può essere verificato online.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="shell cta-panel">
            <div><div className="eyebrow">PRONTO A PARTIRE?</div><h2>Conosci prima. Decidi meglio.</h2><p>Inserisci i dati della vettura e scegli la verifica più adatta.</p></div>
            <Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
