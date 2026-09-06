import Link from "next/link";

export default function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  return <VerifyForm />;
}

function VerifyForm() {
  return (
    <main className="page">
      <div className="shell" style={{ maxWidth: 720 }}>
        <div className="eyebrow">VERIDRIVE</div>
        <h1>Verifica certificato VeriScore</h1>
        <p className="lead">Inserisci il codice univoco riportato sul certificato.</p>

        <form action="/verifica" method="get" className="panel form" style={{ marginTop: 24 }}>
          <label className="full">
            Codice certificato
            <input
              name="code"
              placeholder="Es. VSC-A8F4D91B2E"
              required
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button className="button full" type="submit">Verifica certificato</button>
        </form>

        <p style={{ marginTop: 16, opacity: 0.7, fontSize: 14 }}>
          Puoi digitare il codice manualmente oppure aprire il QR presente sul certificato.
        </p>

        <Link href="/" style={{ display: "inline-block", marginTop: 20 }}>← Torna a VeriDrive</Link>
      </div>
    </main>
  );
}
