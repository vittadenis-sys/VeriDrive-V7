import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, FileText, ReceiptText, Users, UserRoundCheck, Wrench, LogOut } from "lucide-react";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/authorization";

const adminSections = [
  { href: "/admin/bookings", title: "Prenotazioni", text: "Controlla pratiche, assegnazioni e stati.", icon: FileText },
  { href: "/admin/clienti", title: "Clienti", text: "Ricerca e gestione separata dei clienti B2C.", icon: UserRoundCheck },
  { href: "/admin/commercianti", title: "Commercianti", text: "Ricerca e gestione separata delle aziende e dei crediti.", icon: Users },
  { href: "/admin/workshops", title: "Officine", text: "Gestisci rete, disponibilità e riepiloghi mensili.", icon: Building2 },
  { href: "/admin/payouts", title: "Liquidazioni", text: "Controlla quanto è maturato e cosa è già stato pagato.", icon: ReceiptText },
];

export default async function Admin() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  async function logout() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return <>
    <Header />
    <main className="page">
      <div className="shell">
        <div className="eyebrow">AMMINISTRAZIONE VERIDRIVE</div>
        <div className="dashboard-hero">
          <div>
            <h1>Controllo operativo</h1>
            <p className="lead">Ordini, clienti, commercianti, officine e liquidazioni in un solo pannello.</p>
          </div>
          <div className="actions">
            <form action={logout}>
              <button className="button secondary" type="submit"><LogOut size={18} /> Esci</button>
            </form>
            <Link className="button" href="/officina"><Wrench size={18} /> La mia officina</Link>
          </div>
        </div>

        <section style={{ padding: "28px 0 12px" }}>
          <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
            <div className="metric"><span>Incassi cliente</span><strong>Gestiti per pratica</strong></div>
            <div className="metric"><span>Compensi officina</span><strong>Solo a verifica chiusa</strong></div>
            <div className="metric"><span>Fatture officina</span><strong>Da ricevere / registrare</strong></div>
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
          </div>
        </section>

        <section className="panel" style={{ marginTop: 8 }}>
          <div className="eyebrow">TUA OFFICINA</div>
          <h3>VeriDrive Faloppio — Autogerma</h3>
          <p style={{ marginBottom: 12 }}>La tua officina utilizza la stessa dashboard operativa prevista per tutti i partner: calendario, pratiche, checklist e liquidazioni.</p>
          <Link href="/officina">Apri dashboard officina →</Link>
        </section>

        <section className="panel" style={{ marginTop: 18 }}>
          <h3>Regola di pagamento officina</h3>
          <p style={{ marginBottom: 0 }}>Il compenso matura solo dopo la chiusura della verifica. La liquidazione resta sospesa finché l'amministrazione non registra la fattura ricevuta.</p>
        </section>
      </div>
    </main>
  </>;
}
