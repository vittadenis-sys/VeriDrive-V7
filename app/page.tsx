import Link from "next/link";
import { ArrowRight, CarFront, Gauge, QrCode, SearchCheck, ShieldCheck, PlaneTakeoff } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VeriScore } from "@/components/VeriScore";

const ownerServices = [
  { href: "/prenota?service=check_viaggio&path=own_car", name: "Check Viaggio", price: "49 €", description: "Controllo essenziale prima di partire." },
  { href: "/prenota?service=veriscore&path=own_car", name: "Check-up + VeriScore", price: "99 €", description: "50 controlli, VeriScore e certificato digitale." },
];

const purchaseServices = [
  { href: "/prenota?service=check_online&path=buying_used", name: "Check Online", price: "39 €", description: "Analisi dell'annuncio con risposta entro 24 ore." },
  { href: "/prenota?service=veriscore&path=buying_used", name: "Check-up + VeriScore", price: "99 €", description: "Verifica completa in officina, VeriScore e certificato.", featured: true },
  { href: "/prenota?service=veriscore_plus&path=buying_used", name: "Check-up + VeriScorePlus", price: "149 €", description: "Verifica completa + foto dei difetti e stima indicativa dei costi." },
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
              <div className="actions"><Link className="button" href="#percorsi">Scegli il percorso</Link><Link className="button secondary" href="/prenota">Prenota</Link></div>
              <div className="trust-row"><div><ShieldCheck size={18} /> Controlli indipendenti</div><div><Gauge size={18} /> VeriScore</div><div><QrCode size={18} /> Certificato verificabile</div></div>
            </div>
            <div className="hero-visual" aria-label="Anteprima controllo auto VeriDrive">
              <div className="inspection-scene"><div className="scene-glow" /><div className="inspection-car"><div className="car-roof" /><div className="car-body" /><div className="wheel wheel-a" /><div className="wheel wheel-b" /><div className="headlight" /></div><div className="inspection-card"><div className="inspection-card-top"><span>VERIDRIVE CHECK</span><span>ANTEPRIMA</span></div><VeriScore score={92} size={118} /><div className="inspection-row"><ShieldCheck size={18} /><span>Controlli</span><strong>50 punti</strong></div><div className="inspection-row"><QrCode size={18} /><span>Certificato</span><strong>QR</strong></div></div></div>
              <div className="hero-note"><span>✓</span> Metodo standardizzato · risultato chiaro · verifica online</div>
            </div>
          </div>
        </section>

        <section id="percorsi"><div className="shell"><div className="eyebrow">SCEGLI IL TUO PERCORSO</div><h2>Da dove vuoi partire?</h2><p className="lead">Scegli la situazione che ti riguarda.</p>
          <div className="journeys">
            <article className="journey card"><div className="journey-heading"><div className="icon"><CarFront size={24} /></div><div><div className="eyebrow">LA TUA AUTO</div><h3>Hai già un'auto</h3></div></div><div className="service-list">{ownerServices.map(service=><Link key={service.href} className="service-item" href={service.href}><div><strong>{service.name}</strong><span>{service.description}</span></div><div className="service-price">{service.price}<ArrowRight size={18}/></div></Link>)}</div></article>
            <article className="journey card"><div className="journey-heading"><div className="icon"><SearchCheck size={24} /></div><div><div className="eyebrow">STAI ACQUISTANDO UN'AUTO</div><h3>Devi comprarla</h3></div></div><div className="service-list">{purchaseServices.map(service=><Link key={service.href} className={`service-item ${service.featured?"featured":""}`} href={service.href}><div>{service.featured&&<span className="recommended">PIÙ SCELTA</span>}<strong>{service.name}</strong><span>{service.description}</span></div><div className="service-price">{service.price}<ArrowRight size={18}/></div></Link>)}</div></article>
          </div>
        </div></section>

        <section className="panel-section" style={{ padding: "36px 0" }}><div className="shell"><div className="journey card" style={{ display: "grid", gap: 18 }}><div className="journey-heading"><div className="icon"><PlaneTakeoff size={24} /></div><div><div className="eyebrow">PRIMA DI PARTIRE</div><h3>Check Viaggio: scopri quanto è affidabile la tua auto per il prossimo viaggio.</h3></div></div><p className="lead" style={{ marginBottom: 4 }}>Una checklist dedicata ai principali elementi di sicurezza, con un <strong>Indice Affidabilità Viaggio da 0 a 10</strong>. Non è un VeriScore: ti dice semplicemente quanto la vettura è pronta per affrontare il viaggio.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}><Link className="button" href="/prenota?service=check_viaggio&path=own_car">Prenota Check Viaggio <ArrowRight size={18}/></Link><span style={{ opacity: .72 }}>Ideale prima di ferie, weekend e lunghi viaggi.</span></div></div></div></section>

        <section className="panel-section veriscore-section"><div className="shell veriscore-showcase"><div><div className="eyebrow">VERISCORE®</div><h2>Un numero per capire subito il risultato.</h2><p className="lead">Il VeriScore sintetizza l'esito della verifica in un formato chiaro e leggibile.</p></div><div className="veriscore-demo card"><VeriScore score={92} size={176}/><div><strong>92/100</strong><span>Anteprima grafica</span><small>Il punteggio reale viene generato dalla checklist della verifica.</small></div></div></div></section>
        <section className="panel"><div className="shell cta-panel"><div><div className="eyebrow">PRONTO?</div><h2>Conosci prima. Decidi meglio.</h2><p>Seleziona il servizio più adatto alla tua situazione.</p></div><Link className="button" href="/prenota">Prenota <ArrowRight size={18}/></Link></div></section>
      </main><Footer/>
    </>
  );
}
