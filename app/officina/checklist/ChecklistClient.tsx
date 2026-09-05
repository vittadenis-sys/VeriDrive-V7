"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { checklist } from "@/lib/checklist";
import { calculateVeriscore, scoreLabel } from "@/lib/veriscore";
import { VeriScore } from "@/components/VeriScore";

const PHOTO_POLICY = "Per la Verifica Plus, carica foto solo dei difetti riscontrati.";

type Result = "ok" | "issue" | "critical" | undefined;

type Props = { bookingId: string };

export default function ChecklistClient({ bookingId }: Props) {
  const [values, setValues] = useState<Record<number, Result>>({});
  const [notes, setNotes] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const score = useMemo(() => calculateVeriscore(checklist.map((item) => values[item.id] === "ok")), [values]);
  const completed = Object.values(values).filter(Boolean).length;
  const canClose = completed === checklist.length;

  function setResult(id: number, result: Exclude<Result, undefined>) {
    setValues((current) => ({ ...current, [id]: current[id] === result ? undefined : result }));
    setMessage("");
  }

  async function saveInspection(close = false) {
    setBusy(true); setMessage("");
    try {
      const checklistResults = checklist.map((item) => ({ id: item.id, area: item.area, label: item.label, result: values[item.id] ?? null }));
      const response = await fetch("/api/workshop/inspection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, checklist: checklistResults, passedChecks: values ? checklistResults.filter((item) => item.result === "ok").length : 0, notes, close }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Salvataggio non riuscito.");
      if (close) {
        const statusResponse = await fetch("/api/workshop/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, toStatus: "completed" }) });
        const statusData = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusData.error ?? "Impossibile chiudere la verifica.");
      }
      setMessage(close ? "Verifica chiusa correttamente." : "Ispezione salvata.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally { setBusy(false); }
  }

  return (
    <main className="page">
      <div className="shell">
        <Link href="/officina">← Torna alla dashboard</Link>
        <div className="eyebrow" style={{ marginTop: 24 }}>Pratica {bookingId}</div>
        <h1 style={{ fontSize: "clamp(34px, 6vw, 48px)" }}>Checklist tecnica</h1>

        <div className="panel" style={{ position: "sticky", top: 86, zIndex: 2, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <VeriScore score={score} size={92} />
          <div>
            <p style={{ marginBottom: 6 }}><b>{score}/100 · {scoreLabel(score)}</b></p>
            <p style={{ margin: 0 }}>{completed}/{checklist.length} controlli compilati</p>
            {!canClose && <small style={{ display: "block", marginTop: 6, opacity: .7 }}>Completa tutti i controlli per chiudere la pratica.</small>}
          </div>
        </div>

        <div className="checklist" style={{ marginTop: 24 }}>
          {checklist.map((item) => (
            <div className="check" key={item.id} style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ minWidth: 220, flex: "1 1 260px" }}><small>{item.id}. {item.area}</small><br /><b>{item.label}</b></span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button type="button" className={`button ${values[item.id] === "ok" ? "" : "secondary"}`} onClick={() => setResult(item.id, "ok")}>OK</button>
                  <button type="button" className={`button ${values[item.id] === "issue" ? "" : "secondary"}`} onClick={() => setResult(item.id, "issue")}>Problema</button>
                  <button type="button" className={`button ${values[item.id] === "critical" ? "" : "secondary"}`} onClick={() => setResult(item.id, "critical")}>Critico</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="panel" style={{ marginTop: 24 }}>
          <h3>Foto dei difetti</h3>
          <p>{PHOTO_POLICY}</p>
          <input type="file" accept="image/*" multiple onChange={(event) => setPhotoCount(event.target.files?.length ?? 0)} />
          <p style={{ marginTop: 8, marginBottom: 0 }}>{photoCount ? `${photoCount} foto selezionate.` : "Nessuna foto selezionata."}</p>
        </section>

        <section className="panel" style={{ marginTop: 24 }}>
          <h3>Note finali</h3>
          <textarea value={notes} onChange={(event) => { setNotes(event.target.value); setMessage(""); }} placeholder="Annotazioni del tecnico..." rows={5} style={{ width: "100%" }} />
        </section>

        <div className="actions" style={{ marginTop: 24 }}>
          <button type="button" className="button" onClick={() => void saveInspection(false)} disabled={busy || !completed}>Salva ispezione</button>
          {canClose && <button type="button" className="button" onClick={() => void saveInspection(true)} disabled={busy}>Chiudi verifica</button>}
        </div>

        {message && <p className="notice" style={{ marginTop: 16 }}>{message}</p>}
      </div>
    </main>
  );
}
