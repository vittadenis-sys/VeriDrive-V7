"use client";

import { useEffect, useMemo, useState } from "react";

const checks = [
  ["runtime", "/api/diag/auth"],
  ["session", "/api/debug/session"],
  ["bootstrap", "/api/customer/bootstrap"],
  ["runtimeBindings", "/api/runtime-test"],
] as const;

type Result = {
  url: string;
  status: number | null;
  ok: boolean | null;
  data: unknown;
  error?: string;
  durationMs?: number;
};

export default function DiagnosticaLoginPage() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const ordered = useMemo(
    () => checks.map(([name]) => [name, results[name]] as const),
    [results]
  );

  async function run() {
    setRunning(true);
    setStartedAt(new Date().toISOString());
    setResults({});

    for (const [name, path] of checks) {
      const url = `${path}${path.includes("?") ? "&" : "?"}diag=${Date.now()}`;
      const started = performance.now();
      try {
        const response = await fetch(url, {
          method: path.includes("bootstrap") ? "POST" : "GET",
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        let data: unknown;
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        setResults((prev) => ({
          ...prev,
          [name]: {
            url: path,
            status: response.status,
            ok: response.ok,
            data,
            durationMs: Math.round(performance.now() - started),
          },
        }));
      } catch (error) {
        setResults((prev) => ({
          ...prev,
          [name]: {
            url: path,
            status: null,
            ok: false,
            data: null,
            error: error instanceof Error ? error.message : String(error),
            durationMs: Math.round(performance.now() - started),
          },
        }));
      }
    }

    setRunning(false);
  }

  useEffect(() => {
    void run();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Diagnostica completa login</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Esegue i test nello stesso browser e con gli stessi cookie della sessione reale.
      </p>

      <button
        onClick={run}
        disabled={running}
        style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #bbb", background: running ? "#eee" : "white", cursor: running ? "wait" : "pointer", marginBottom: 20 }}
      >
        {running ? "Diagnosi in corso…" : "Ripeti diagnosi"}
      </button>

      <div style={{ marginBottom: 20, padding: 14, background: "#f6f6f6", borderRadius: 10 }}>
        <div><strong>Avvio:</strong> {startedAt ?? "—"}</div>
        <div><strong>Cookie browser visibili via fetch:</strong> credenziali incluse</div>
      </div>

      {ordered.map(([name, result]) => (
        <section key={name} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{name}</h2>
            {result ? (
              <span style={{ fontWeight: 700 }}>{result.ok ? "OK" : "ERRORE"} {result.status ?? ""}</span>
            ) : (
              <span>in attesa…</span>
            )}
          </div>
          {result && (
            <>
              <div style={{ marginTop: 8, color: "#666" }}>{result.url} · {typeof result.durationMs === "number" ? result.durationMs : "?"} ms</div>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 12, background: "#111", color: "#eee", padding: 14, borderRadius: 8, overflowX: "auto" }}>
                {JSON.stringify(result.error ? { error: result.error } : result.data, null, 2)}
              </pre>
            </>
          )}
        </section>
      ))}

      <section style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "#fff7db", border: "1px solid #ead27c" }}>
        <h2 style={{ marginTop: 0 }}>Come leggere il risultato</h2>
        <p style={{ marginBottom: 6 }}>1. <strong>runtime</strong>: confronta binding Worker, process.env e cookie.</p>
        <p style={{ marginBottom: 6 }}>2. <strong>session</strong>: dice se il server riconosce l'utente autenticato.</p>
        <p style={{ marginBottom: 6 }}>3. <strong>bootstrap</strong>: verifica lookup e creazione della riga in <code>customers</code>, mostrando codice/dettagli/hint.</p>
        <p style={{ marginBottom: 0 }}>4. <strong>runtimeBindings</strong>: mostra quali binding arrivano direttamente dal Worker.</p>
      </section>
    </main>
  );
}
