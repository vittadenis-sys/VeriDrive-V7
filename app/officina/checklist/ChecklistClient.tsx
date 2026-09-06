"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { checklist } from "@/lib/checklist";
import { calculateVeriscore, scoreLabel } from "@/lib/veriscore";
import { VeriScore } from "@/components/VeriScore";

type Result = "ok" | "issue" | "critical" | undefined;
type Props = { bookingId: string };

type InspectionResponse = {
  inspection?: { checklist?: Array<{ id: number; result: Result | null }>; notes?: string | null };
  booking?: {
    service_key?: string | null;
    plate?: string | null;
    vehicle_make?: string | null;
    vehicle_model?: string | null;
    vehicle_year?: number | null;
    vin?: string | null;
    vehicle_mileage?: number | null;
  };
};

export default function ChecklistClient({ bookingId }: Props) {
  const [values, setValues] = useState<Record<number, Result>>({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState({
    plate: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    mileage: "",
    serviceKey: "",
  });

  const isCertificateService = vehicle.serviceKey === "veriscore" || vehicle.serviceKey === "veriscore_plus";
  const score = useMemo(() => calculateVeriscore(checklist.map((item) => values[item.id] === "ok")), [values]);
  const completed = Object.values(values).filter(Boolean).length;
  const canCloseChecklist = completed === checklist.length;
  const hasVehicleIdentity = !isCertificateService || Boolean(vehicle.plate.trim() && vehicle.vin.trim() && vehicle.mileage.trim() && Number(vehicle.mileage) >= 0);
  const canClose = canCloseChecklist && hasVehicleIdentity;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/workshop/inspection?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as InspectionResponse;
        const saved = data.inspection?.checklist ?? [];
        if (!active) return;
        const next: Record<number, Result> = {};
        for (const item of saved) if (item.result) next[item.id] = item.result;
        setValues(next);
        setNotes(data.inspection?.notes ?? "");
        const booking = data.booking;
        setVehicle({
          plate: booking?.plate ?? "",
          make: booking?.vehicle_make ?? "",
          model: booking?.vehicle_model ?? "",
          year: booking?.vehicle_year != null ? String(booking.vehicle_year) : "",
          vin: booking?.vin ?? "",
          mileage: booking?.vehicle_mileage != null ? String(booking.vehicle_mileage) : "",
          serviceKey: booking?.service_key ?? "",
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [bookingId]);

  function setResult(id: number, result: Exclude<Result, undefined>) {
    setValues((current) => ({ ...current, [id]: current[id] === result ? undefined : result }));
    setMessage("");
  }

  async function saveInspection(close = false) {
    if (close && !canClose) return;
    setBusy(true); setMessage("");
    try {
      const checklistResults = checklist.map((item) => ({ id: item.id, area: item.area, label: item.label, result: values[item.id] ?? null }));
      const response = await fetch("/api/workshop/inspection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          checklist: checklistResults,
          notes,
          close,
          vehicle: isCertificateService ? {
            plate: vehicle.plate.trim().toUpperCase(),
            make: vehicle.make.trim(),
            model: vehicle.model.trim(),
            year: vehicle.year ? Number(vehicle.year) : null,
            vin: vehicle.vin.trim().toUpperCase(),
            mileage: vehicle.mileage === "" ? null : Number(vehicle.mileage),
          } : undefined,
        }),
      });
      const data = await response.json() as { error?: string; veriscore?: number };
      if (!response.ok) throw new Error(data.error ?? "Salvataggio non riuscito.");
      if (close) {
        const statusResponse = await fetch("/api/workshop/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, toStatus: "completed" }),
        });
        const statusData = await statusResponse.json() as { error?: string };
        if (!statusResponse.ok) throw new Error(statusData.error ?? "Impossibile chiudere la verifica.");
      }
      setMessage(close ? "Verifica chiusa correttamente." : `Ispezione salvata. VeriScore ${data.veriscore ?? score}/100.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <Link href="/officina">← Torna alla dashboard</Link>
        <div className="eyebrow" style={{ marginTop: 24 }}>Pratica {bookingId}</div>
        <h1 style={{ fontSize: "clamp(34px, 6vw, 48px)" }}>Checklist tecnica</h1>

        {isCertificateService && (
          <section className="panel" style={{ marginTop: 18 }}>
            <div className="eyebrow">DATI VEICOLO · CERTIFICATO</div>
            <h3>Conferma i dati prima della chiusura</h3>
            <p style={{ opacity: .75 }}>Il cliente può aver lasciato il telaio o i chilometri vuoti. L'officina deve completarli prima di chiudere la pratica.</p>
            <div className="form" style={{ marginTop: 12 }}>
              <label>Targa<input value={vehicle.plate} onChange={(e) => { setVehicle((v) => ({ ...v, plate: e.target.value })); setMessage(""); }} /></label>
              <label>Marca<input value={vehicle.make} onChange={(e) => setVehicle((v) => ({ ...v, make: e.target.value }))} /></label>
              <label>Modello<input value={vehicle.model} onChange={(e) => setVehicle((v) => ({ ...v, model: e.target.value }))} /></label>
              <label>Anno<input value={vehicle.year} inputMode="numeric" onChange={(e) => setVehicle((v) => ({ ...v, year: e.target.value }))} /></label>
              <label className="full">Telaio / VIN<input value={vehicle.vin} onChange={(e) => { setVehicle((v) => ({ ...v, vin: e.target.value.toUpperCase() })); setMessage(""); }} placeholder="Inserisci il VIN completo" /></label>
              <label className="full">Chilometri<input value={vehicle.mileage} type="number" min="0" step="1" inputMode="numeric" onChange={(e) => { setVehicle((v) => ({ ...v, mileage: e.target.value })); setMessage(""); }} placeholder="Es. 48230" /></label>
            </div>
            {!hasVehicleIdentity && <p className="notice" style={{ marginTop: 12 }}>Per chiudere VeriScore o VeriScorePlus servono targa, VIN e chilometraggio.</p>}
          </section>
        )}

        <div className="panel" style={{ position: "sticky", top: 86, zIndex: 2, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 18 }}>
          <VeriScore score={score} size={92} />
          <div>
            <p style={{ marginBottom: 6 }}><b>{score}/100 · {scoreLabel(score)}</b></p>
            <p style={{ margin: 0 }}>{completed}/{checklist.length} controlli compilati</p>
            {!canCloseChecklist && <small style={{ display: "block", marginTop: 6, opacity: .7 }}>Completa tutti i controlli per chiudere la pratica.</small>}
          </div>
        </div>

        {loading && <p className="notice" style={{ marginTop: 18 }}>Caricamento della pratica…</p>}

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
          <h3>Note finali</h3>
          <textarea value={notes} onChange={(event) => { setNotes(event.target.value); setMessage(""); }} placeholder="Annotazioni del tecnico..." rows={5} style={{ width: "100%" }} />
        </section>

        <div className="actions" style={{ marginTop: 24 }}>
          <button type="button" className="button" onClick={() => void saveInspection(false)} disabled={busy || loading || !completed}>Salva ispezione</button>
          <button type="button" className="button" onClick={() => void saveInspection(true)} disabled={busy || loading || !canClose}>{isCertificateService ? "Chiudi e genera certificato" : "Chiudi verifica"}</button>
        </div>

        {message && <p className="notice" style={{ marginTop: 16 }}>{message}</p>}
      </div>
    </main>
  );
}
