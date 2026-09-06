import Link from "next/link";
import { Header } from "@/components/Header";
import { requireAdmin } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

export default async function Workshops() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: workshops } = await supabase
    .from("workshops")
    .select("id,name,display_name,city,address,postal_code,is_active")
    .order("display_name", { ascending: true });

  const activeWorkshops = workshops ?? [];

  return <>
    <Header />
    <main className="page"><div className="shell">
      <Link href="/admin">← Amministrazione</Link>
      <div className="eyebrow" style={{ marginTop: 24 }}>Rete partner</div>
      <h1>Gestione officine</h1>
      <p className="lead">Controlla officine attive, copertura, disponibilità e riepiloghi operativi.</p>

      <section style={{ padding: "28px 0" }}>
        <div className="cards">
          {activeWorkshops.length === 0 ? <div className="panel"><p style={{ marginBottom: 0 }}>Nessuna officina presente.</p></div> : activeWorkshops.map((workshop) => <article className="card" key={workshop.id}>
            <div className="eyebrow">{workshop.is_active === false ? "INATTIVA" : "ATTIVA"}</div>
            <h3>{workshop.display_name || workshop.name || "Officina"}</h3>
            <p>{[workshop.address, workshop.postal_code, workshop.city].filter(Boolean).join(" · ") || "Indirizzo non disponibile"}</p>
            <Link className="button secondary" href="/officina">Apri area officina</Link>
          </article>)}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 8 }}>
        <h3>Operatività</h3>
        <p style={{ marginBottom: 0 }}>Le assegnazioni vengono gestite sulle pratiche con gli slot realmente disponibili nel calendario officina.</p>
      </section>
    </div></main>
  </>;
}
