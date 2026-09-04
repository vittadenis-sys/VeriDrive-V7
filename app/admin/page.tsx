import Link from "next/link";
import { ArrowRight, Building2, FileText, ReceiptText, Users } from "lucide-react";
import { Header } from "@/components/Header";

const adminSections = [
  { href: "/admin/bookings", title: "Prenotazioni", text: "Controlla pratiche, assegnazioni e stati.", icon: FileText },
  { href: "/admin/workshops", title: "Officine", text: "Gestisci rete, disponibilità e riepiloghi mensili.", icon: Building2 },
  { href: "/admin/payouts", title: "Liquidazioni", text: "Controlla quanto è maturato e cosa è già stato pagato.", icon: ReceiptText },
  { href: "/admin/commercianti", title: "Commercianti", text: "Gestisci aziende e crediti per Check-up + VeriScore.", icon: Users },
];

export default function Admin() {
  return <>
    <Header />
    <main className="page">
      <div className="shell">
        <div className="eyebrow">Amministrazione VeriDrive</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 56px)" }}>Controllo operativo</h1>
        <p className="lead">Un solo pannello per ordini, officine, commercianti e liquidazioni.</p>

        <section style={{ padding: "28px 0 8px" }}>
          <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
            <div className="metric"><span>Stato incassi</span><strong>Gestiti per pratica</strong></div>
            <div className="metric"><span>Stato officine</span><strong>Da chiudere / liquidare</strong></div>
            <div className="metric"><span>Fatturazione</span><strong>Da verificare</strong></div>
          </div>
        </section>

        <section style={{ padding: "20px 0" }}>
          <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            {adminSections.map(({ href, title, text, icon: Icon }) => <Link className="card" href={href} key={href}>
              <Icon size={24} />
              <h3 style={{ marginTop: 10 }}>{title}</h3>
              <p>{text}</p>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Apri <ArrowRight size={16} /></span>
            </Link>)}
            <a className="card" href="/api/admin/export?table=bookings">
              <ReceiptText size={24} />
              <h3 style={{ marginTop: 10 }}>Esporta prenotazioni</h3>
              <p>Scarica il registro delle prenotazioni in CSV.</p>
              <span>Esporta →</span>
            </a>
          </div>
        </section>

        <div className="panel" style={{ marginTop: 8 }}>
          <h3>Regola di pagamento officina</h3>
          <p style={{ marginBottom: 0 }}>Il pagamento al partner matura solo dopo la chiusura della verifica. La liquidazione resta poi sospesa finché l'amministrazione non registra la fattura ricevuta.</p>
        </div>
      </div>
    </main>
  </>;
}
