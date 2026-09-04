import Link from "next/link";
import { ArrowRight, CarFront, Gauge, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function AutoPage(){return <><Header/><main>
<section className="page-hero"><div className="shell"><div className="eyebrow">LA TUA AUTO</div><h1>Controlla la tua auto prima che sia lei a sorprenderti.</h1><p className="lead">Scegli il controllo più adatto: essenziale prima di partire oppure completo con VeriScore e certificato digitale.</p><Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18}/></Link></div></section>
<section><div className="shell"><div className="journeys">
<article id="viaggio" className="card"><div className="icon"><CarFront size={24}/></div><div className="eyebrow" style={{marginTop:18}}>49 €</div><h2>Check Viaggio</h2><p>Controllo essenziale della tua auto prima di partire, per individuare le principali criticità di sicurezza.</p><Link className="button" href="/prenota?service=check_viaggio">Prenota Check Viaggio <ArrowRight size={18}/></Link></article>
<article id="checkup" className="card"><div className="icon"><Gauge size={24}/></div><div className="eyebrow" style={{marginTop:18}}>99 €</div><h2>Check-up + VeriScore</h2><p>Controllo completo con 50 verifiche, VeriScore e certificato digitale.</p><Link className="button" href="/prenota?service=veriscore">Prenota Check-up + VeriScore <ArrowRight size={18}/></Link></article>
</div></div></section>
<section className="panel-section"><div className="shell"><div className="proof-grid"><div><div className="eyebrow">COSA RICEVI</div><h2>Un controllo strutturato e leggibile.</h2></div><div className="proof-cards"><div className="mini-card"><ShieldCheck/><strong>50 controlli</strong><span>Checklist strutturata e ordinata.</span></div><div className="mini-card"><Gauge/><strong>VeriScore</strong><span>Disponibile nel Check-up + VeriScore.</span></div><div className="mini-card"><ShieldCheck/><strong>Certificato digitale</strong><span>Disponibile nel Check-up + VeriScore.</span></div></div></div></div></section>
<section><div className="shell cta-panel"><div><div className="eyebrow">PRONTO?</div><h2>Conosci meglio la tua auto.</h2></div><Link className="button" href="/prenota">Prenota <ArrowRight size={18}/></Link></div></section>
</main><Footer/></>}
