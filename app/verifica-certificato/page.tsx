import Link from "next/link";

export default function VerificaCertificatoPage() {
  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: 720 }}>
        <div className="eyebrow">VERIDRIVE</div>
        <h1>Verifica certificato VeriScore</h1>
        <p className="lead">Inserisci il codice riportato sul certificato oppure usa il QR.</p>

        <form action="/api/public/veriscore-certificate" method="get" className="panel form">
          <label className="full">
            Codice certificato
            <input name="code" placeholder="Es. VSC-1A2B3C4D5E" required autoCapitalize="characters" />
          </label>
          <button className="button full" type="submit">Verifica certificato</button>
        </form>

        <section className="panel" style={{ marginTop: 18 }}>
          <h3>Nota</h3>
          <p style={{ marginBottom: 0 }}>I certificati VeriScore sono emessi al termine di una pratica officina completata e sono registrati come documenti immutabili.</p>
        </section>

        <Link href="/" style={{ display: "inline-block", marginTop: 18 }}>← Torna a VeriDrive</Link>
      </div>
    </main>
  );
}
