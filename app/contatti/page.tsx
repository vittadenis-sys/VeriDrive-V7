import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function ContattiPage() {
  return <>
    <Header />
    <main className="page"><div className="shell" style={{maxWidth:860}}>
      <Link href="/" style={{display:"inline-block",marginBottom:24}}>← Torna a VeriDrive</Link>
      <div className="eyebrow">VERIDRIVE · CONTATTI</div>
      <h1>Contatti</h1>
      <p className="lead">Per informazioni sui servizi, prenotazioni o certificati, utilizza i recapiti VeriDrive.</p>
      <section className="panel" style={{marginTop:28}}><h2>Assistenza prenotazioni</h2><p><a href="mailto:prenotazioni@veridrive.it">prenotazioni@veridrive.it</a></p></section>
      <section className="panel" style={{marginTop:14}}><h2>Informazioni generali</h2><p><a href="mailto:info@veridrive.it">info@veridrive.it</a></p></section>
      <section className="panel" style={{marginTop:14}}><h2>Verifica certificato</h2><p>Per verificare un certificato VeriDrive utilizza il codice VSC o il QR sulla pagina dedicata.</p><Link href="/verifica" className="button secondary">Verifica certificato</Link></section>
    </div></main>
    <Footer />
  </>;
}
