export type TravelCheckItem = { id: number; area: string; label: string; weight: number };

export const checkViaggioChecklist: TravelCheckItem[] = [
  { id: 1, area: "Pneumatici", label: "Pneumatici: usura e pressione", weight: 1.5 },
  { id: 2, area: "Freni", label: "Freni: controllo visivo e stato generale", weight: 1.5 },
  { id: 3, area: "Batteria / avviamento", label: "Batteria e avviamento", weight: 1.0 },
  { id: 4, area: "Sterzo / sospensioni", label: "Sterzo e sospensioni", weight: 1.0 },
  { id: 5, area: "Olio motore", label: "Livello e condizioni olio motore", weight: 0.8 },
  { id: 6, area: "Refrigerante", label: "Livello liquido refrigerante", weight: 0.7 },
  { id: 7, area: "Luci / tergi / perdite", label: "Luci, tergicristalli e perdite evidenti", weight: 0.5 },
  { id: 8, area: "Spie / Diagnosi", label: "Diagnosi OBD e spie: nessun errore attivo rilevante", weight: 2.0 },
  { id: 9, area: "Altri problemi", label: "Altri problemi rilevati", weight: 1.0 },
];

export type TravelCheckResult = "ok" | "issue" | "critical" | null;

export function calculateTravelReliability(values: Record<number, TravelCheckResult>) {
  return Number(checkViaggioChecklist.reduce((sum, item) => sum + (values[item.id] === "ok" ? item.weight : 0), 0).toFixed(1));
}

export function travelReliabilityLabel(score: number) {
  if (score >= 9) return "Viaggio consigliato";
  if (score >= 7) return "Idonea con piccole attenzioni";
  if (score >= 5) return "Da controllare prima di partire";
  return "Viaggio sconsigliato";
}
