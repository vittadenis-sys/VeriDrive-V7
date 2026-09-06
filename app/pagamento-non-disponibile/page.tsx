import Link from "next/link";

export default function PagamentoNonDisponibilePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">VeriDrive</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Servizio momentaneamente non disponibile</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
          Il pagamento online non è ancora disponibile. Nessun importo è stato addebitato.
        </p>
        <p className="mt-5 text-sm text-slate-600">
          Per informazioni scrivi a{" "}
          <a className="font-semibold text-slate-900 underline underline-offset-4" href="mailto:info@veridrive.it">
            info@veridrive.it
          </a>
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Torna alla dashboard
        </Link>
      </div>
    </main>
  );
}
