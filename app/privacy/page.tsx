import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return <>
    <Header />
    <main className="page"><div className="shell" style={{maxWidth:860}}>
      <Link href="/" style={{display:"inline-block",marginBottom:24}}>← Torna a VeriDrive</Link>
      <div className="eyebrow">VERIDRIVE · PRIVACY</div>
      <h1>Privacy Policy</h1>
      <p className="lead">Informazioni sintetiche sul trattamento dei dati nell'utilizzo dei servizi VeriDrive.</p>
      <section className="panel" style={{marginTop:28}}><h2>Dati trattati</h2><p>Possiamo trattare dati necessari a creare l'account, gestire prenotazioni, pagamenti, assistenza e certificazioni, oltre ai dati tecnici del veicolo forniti per l'esecuzione del servizio.</p></section>
      <section className="panel" style={{marginTop:14}}><h2>Verifica pubblica</h2><p>La pagina pubblica del certificato mostra esclusivamente i dati tecnici previsti dal servizio e utilizza mascheramento per targa e VIN. Non pubblica nome, telefono, email, indirizzo o altri dati personali del cliente.</p></section>
      <section className="panel" style={{marginTop:14}}><h2>Finalità e sicurezza</h2><p>I dati sono utilizzati per erogare i servizi richiesti, gestire la piattaforma, prevenire abusi e adempiere agli obblighi applicabili. L'accesso ai dati riservati è limitato in base ai ruoli e alle esigenze operative.</p></section>
      <section className="panel" style={{marginTop:14}}><h2>Nota legale</h2><p style={{marginBottom:0}}>Questa pagina è un'informativa sintetica. L'informativa completa dovrà essere coordinata con i trattamenti effettivamente attivati, i fornitori utilizzati e i relativi adempimenti privacy prima del go-live commerciale.</p></section>
    </div></main>
    <Footer />
  </>;
}
