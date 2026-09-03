import Link from "next/link";
import { ArrowRight, CarFront, Gauge, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function AutoPage(){
  return <><Header/><main>
    <section className="page-hero"><div className="shell"><div className="eyebrow">AUTO PRIVATA</div><h1>Controlla la tua auto prima che sia lei a sorprenderti.</h1><p className="lead">Due verifiche semplici per sapere come sta la tua vettura e affrontare un viaggio o un check-up con informazioni chiare.</p><Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18}/></Link></div></section>
    <section><div className="shell"><div className="journeys">
      <article id="viaggio" className="card"><div className="icon"><CarFront size={24}/></div><div className="eyebrow" style={{marginTop:18}}>49 €</div><h2>Controllo Viaggio</h2><p>Controllo della tua auto prima di partire, per individuare le principali criticità di sicurezza.</p><Link className="button" href="/prenota?service=previaggio">Prenota il Controllo Viaggio <ArrowRight size={18}/></Link></article>
      <article id="checkup" className="card"><div className="icon"><Gauge size={24}/></div><div className="eyebrow" style={{marginTop:18}}>99 €</div><h2>Check-up + VeriScore</h2><p>Controllo completo del veicolo con checklist, VeriScore e certificato digitale.</p><Link className="button" href="/prenota?service=vericert">Prenota il Check-up <ArrowRight size={18}/></Link></article>
    </div></div></section>
    <section className="panel-section"><div className="shell"><div className="proof-grid"><div><div className="eyebrow">COSA RICEVI</div><h2>Un risultato chiaro, non un parere generico.</h2></div><div className="proof-cards"><div className="mini-card"><ShieldCheck/><strong>Checklist strutturata</strong><span>Lo stesso metodo di controllo applicato in modo ordinato.</span></div><div className="mini-card"><Gauge/><strong>VeriScore</strong><span>Un punteggio semplice da leggere per avere una sintesi immediata.</span></div><div className="mini-card"><ShieldCheck/><strong>Certificato digitale</strong><span>Previsto per il Check-up + VeriScore.</span></div></div></div></div></section>
    <section><div className="shell cta-panel"><div><div className="eyebrow">PRONTO?</div><h2>Porta la tua auto a un controllo.</h2></div><Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18}/></Link></div></section>
  </main><Footer/></>;
}
