"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { checklist } from "@/lib/checklist";
import { calculateVeriscore, scoreLabel } from "@/lib/veriscore";

const PHOTO_POLICY = "Per la Verifica Plus, carica foto solo dei difetti riscontrati.";

export default function Checklist() {
  const [values, setValues] = useState<Record<number, "ok" | "issue" | "critical" | undefined>>({});
  const [notes, setNotes] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const score = useMemo(() => {
    return calculateVeriscore(checklist.map((item) => values[item.id] === "ok"));
  }, [values]);

  const completed = Object.keys(values).filter((key) => values[Number(key)]).length;

  function setResult(id: number, result: "ok" | "issue" | "critical") {
    setValues((current) => ({ ...current, [id]: current[id] === result ? undefined : result }));
    setSaved(false);
  }

  return (
    <main className="page">
      <div className="shell">
        <Link href="/officina">← Torna alla dashboard</Link>
        <div className="eyebrow" style={{ marginTop: 24 }}>Verifica #VD-2026-0042 · Verifica Plus</div>
        <h1 style={{ fontSize: 42 }}>Checklist Volkswagen Golf</h1>

        <div className="panel" style={{ position: "sticky", top: 16, zIndex: 2 }}>
          <p style={{ marginBottom: 6 }}><b>VERISCORE live: {score}/100</b> · {scoreLabel(score)}</p>
          <p style={{ marginBottom: 0 }}>{completed}/50 controlli compilati</p>
        </div>

        <div className="checklist" style={{ marginTop: 24 }}>
          {checklist.map((item) => (
            <div className="check" key={item.id} style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <span>
                  <small>{item.id}. {item.area}</small><br />
                  <b>{item.label}</b>
                </span>
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
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setPhotoCount(event.target.files?.length ?? 0)}
          />
          <p style={{ marginTop: 8, marginBottom: 0 }}>{photoCount ? `${photoCount} foto selezionate.` : "Nessuna foto selezionata."}</p>
        </section>

        <section className="panel" style={{ marginTop: 24 }}>
          <h3>Note finali</h3>
          <textarea
            value={notes}
            onChange={(event) => { setNotes(event.target.value); setSaved(false); }}
            placeholder="Annotazioni del tecnico..."
            rows={5}
            style={{ width: "100%" }}
          />
        </section>

        <div className="actions" style={{ marginTop: 24 }}>
          <button type="button" className="button" onClick={() => setSaved(true)}>Salva ispezione</button>
          <Link className="button secondary" href="/report/demo">Anteprima report</Link>
        </div>

        {saved && <p className="notice" style={{ marginTop: 16 }}>Ispezione salvata. Pronta per la chiusura e la generazione del report.</p>}
      </div>
    </main>
  );
}
