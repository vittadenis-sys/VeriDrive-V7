import Link from "next/link";
import { CarFront, SearchCheck, ShieldCheck, ArrowRight, ClipboardCheck, FileCheck2, QrCode, Wrench } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ownerServices = [
  {
    href: "/prenota?service=previaggio",
    name: "Controllo Viaggio",
    price: "49 €",
    description: "Controllo della tua auto prima di partire, per individuare le principali criticità di sicurezza.",
  },
  {
    href: "/prenota?service=vericert",
    name: "Check-up + VeriScore",
    price: "99 €",
    description: "Controllo completo del veicolo con checklist, VeriScore e certificato digitale.",
  },
];

const purchaseServices = [
  {
    key: "online",
    name: "Verifica Online",
    price: "39 €",
    description: "Analisi manuale di annuncio e documentazione da parte di un tecnico qualificato, entro 3 ore lavorative.",
  },
  {
    key: "base",
    name: "Controllo Base",
    price: "99 €",
    description: "Lo stesso controllo completo della verifica in officina, con VeriScore e certificato digitale.",
    featured: true,
  },
  {
    key: "plus",
    name: "Verifica Plus",
    price: "149 €",
    description: "Come il Controllo Base, con foto esclusivamente dei difetti riscontrati.",
  },
];

const steps = [
  { icon: ClipboardCheck, title: "Prenoti", text: "Inserisci targa o link dell'annuncio, posizione e momento della verifica." },
  { icon: Wrench, title: "Verifichiamo", text: "Quando serve l'officina, la pratica viene affidata automaticamente alla partner più vicina disponibile." },
  { icon: FileCheck2, title: "Ricevi il certificato", text: "Per i servizi previsti ottieni checklist, VeriScore e certificato digitale con QR." },
  { icon: QrCode, title: "Verifichi online", text: "Il QR pubblico permette di controllare l'autenticità del certificato." },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="shell">
            <div className="eyebrow">VERIDRIVE · VERIFICHE INDIPENDENTI</div>
            <h1>Controlla. Compra. Vendi.<br />Con più sicurezza.</h1>
            <p className="lead">
              Verifiche auto semplici, professionali e tracciabili. Scegli il servizio giusto e lascia che VeriDrive gestisca il resto.
            </p>
            <div className="actions">
              <Link className="button" href="#percorsi">Scopri le verifiche</Link>
              <Link className="button secondary" href="/prenota">Prenota una verifica</Link>
            </div>
            <div className="trust-row">
              <div><ShieldCheck size={18} /> Controlli indipendenti</div>
              <div><ShieldCheck size={18} /> VeriScore</div>
              <div><ShieldCheck size={18} /> QR di verifica</div>
            </div>
          </div>
        </section>

        <section id="percorsi">
          <div className="shell">
            <div className="eyebrow">SCEGLI IL TUO PERCORSO</div>
            <h2>Di cosa hai bisogno?</h2>
            <p className="lead">Due percorsi chiari, con servizi pensati per chi possiede già un'auto e per chi sta per comprarne una usata.</p>

            <div className="journeys">
              <article className="journey card">
                <div className="journey-heading">
                  <div className="icon"><CarFront size={24} /></div>
                  <div>
                    <div className="eyebrow">HO GIÀ UN'AUTO</div>
                    <h3>Voglio controllare la mia auto</h3>
                  </div>
                </div>
                <p>Controllala prima di un viaggio oppure fai un check-up completo con certificazione e VeriScore.</p>
                <div className="service-list">
                  {ownerServices.map((service) => (
                    <Link key={service.href} className="service-item" href={service.href}>
                      <div>
                        <strong>{service.name}</strong>
                        <span>{service.description}</span>
                      </div>
                      <div className="service-price">{service.price}<ArrowRight size={18} /></div>
                    </Link>
                  ))}
                </div>
              </article>

              <article className="journey card">
                <div className="journey-heading">
                  <div className="icon"><SearchCheck size={24} /></div>
                  <div>
                    <div className="eyebrow">DEVO COMPRARE UN'AUTO USATA</div>
                    <h3>Voglio verificare un usato</h3>
                  </div>
                </div>
                <p>Scegli tra una verifica completamente online e due livelli di controllo in officina.</p>
                <div className="service-list">
                  {purchaseServices.map((service) => (
                    <Link key={service.key} className={`service-item ${service.featured ? "featured" : ""}`} href={`/prenota?service=${service.key}`}>
                      <div>
                        {service.featured && <span className="recommended">CONSIGLIATA</span>}
                        <strong>{service.name}</strong>
                        <span>{service.description}</span>
                      </div>
                      <div className="service-price">{service.price}<ArrowRight size={18} /></div>
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <div className="shell">
            <div className="eyebrow">COME FUNZIONA</div>
            <h2>Tu scegli il servizio. VeriDrive organizza il controllo.</h2>
            <div className="steps">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <div className="step" key={title}>
                  <div className="step-number">0{index + 1}</div>
                  <div className="step-icon"><Icon size={22} /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="shell">
            <div className="proof-grid">
              <div>
                <div className="eyebrow">PERCHÉ VERIDRIVE</div>
                <h2>Una verifica deve lasciare una traccia.</h2>
                <p className="lead">Per i servizi certificati il risultato diventa un documento digitale verificabile, con VeriScore e QR pubblico.</p>
              </div>
              <div className="proof-cards">
                <div className="mini-card"><ShieldCheck /><strong>VeriScore</strong><span>Un punteggio chiaro per leggere rapidamente il risultato della verifica.</span></div>
                <div className="mini-card"><QrCode /><strong>QR verificabile</strong><span>Il certificato può essere controllato online tramite il suo codice pubblico.</span></div>
                <div className="mini-card"><FileCheck2 /><strong>Certificato digitale</strong><span>Checklist e risultato restano raccolti in un documento condivisibile.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="shell cta-panel">
            <div>
              <div className="eyebrow">PRONTO A PARTIRE?</div>
              <h2>Fai verificare l'auto prima di decidere.</h2>
              <p>Inserisci i dati della vettura e scegli il servizio più adatto.</p>
            </div>
            <Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
