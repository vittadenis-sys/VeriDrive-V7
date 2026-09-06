export type CheckResult = "ok" | "issue" | "critical" | undefined;

export type RoadTestResult = "not_performed" | "passed" | "issue";

export const VERISCORE_MAX = 100;
export const ROAD_TEST_BONUS = 5;
export const ROAD_TEST_PENALTY = -5;
export const MILEAGE_INTEGRITY_PENALTY = -10;
export const MILEAGE_TOLERANCE_KM = 1000;

// Definitive VeriScore V1 weights: total = 100 points.
export const VERISCORE_WEIGHTS = {
  "Freni anteriori": 4,
  "Freni posteriori": 3,
  "Pneumatici": 4,
  "Sterzo / avantreno / retrotreno": 4,
  "Sospensioni": 4,
  "Luci e stop": 2,
  "ABS / ESP": 3,
  "Airbag / cinture": 3,
  "Sicurezza ruote e fissaggi": 2,
  "Integrità elementi di sicurezza accessibili": 1,
  "Motore funzionamento": 8,
  "Cambio / frizione": 5,
  "Perdite olio/liquidi": 5,
  "Raffreddamento": 4,
  "Batteria / ricarica": 3,
  "Scarico": 3,
  "Trasmissione": 4,
  "Altri problemi / rumori": 5,
  "Avviamento": 0,
  "Funzionamento al minimo": 0,
  "Spie motore": 5,
  "Errori centraline": 5,
  "Emissioni / DPF": 5,
  "Ricarica alternatore": 5,
  "Diagnosi elettronica generale": 0,
  "Sistemi di assistenza elettronici": 0,
  "Climatizzazione / gestione elettronica": 0,
  "Sistemi di illuminazione elettronici": 0,
  "Sensori principali": 0,
  "Altre anomalie diagnostiche": 0,
  "Telaio VIN": 3,
  "Chilometri coerenti": 4,
  "Tagliandi / manutenzione": 4,
  "Dotazioni obbligatorie": 2,
  "Revisione": 0,
  "Documentazione disponibile": 0,
  "Richiami costruttore": 0,
  "Numero proprietari dichiarato": 0,
  "Chiavi disponibili": 0,
  "Corrispondenza dati veicolo": 0,
  "Carrozzeria": 0,
  "Vetri e cristalli": 0,
  "Sottoscocca": 0,
  "Porte e serrature": 0,
  "Interni": 0,
  "Sedili e cinture": 0,
  "Comandi e strumentazione": 0,
  "Bagagliaio": 0,
  "Pneumatici di scorta / kit": 0,
  "Stato generale e anomalie residue": 0,
} as const;

const WEIGHT_VALUES = Object.values(VERISCORE_WEIGHTS);
const WEIGHT_SUM = WEIGHT_VALUES.reduce((sum, weight) => sum + weight, 0);

if (WEIGHT_SUM !== 100) {
  throw new Error(`VeriScore V1 weights must total 100, got ${WEIGHT_SUM}`);
}

export function calculateVeriscore(values: CheckResult[] | boolean[]) {
  const results = values as Array<CheckResult | boolean>;
  const labels = Object.keys(VERISCORE_WEIGHTS);
  const base = results.reduce((score, value, index) => {
    const weight = VERISCORE_WEIGHTS[labels[index] as keyof typeof VERISCORE_WEIGHTS] ?? 0;
    if (value === "ok" || value === true) return score + weight;
    if (value === "issue") return score + weight / 2;
    return score;
  }, 0);
  return Math.max(0, Math.min(VERISCORE_MAX, Math.round(base)));
}

export function calculateFinalVeriscore(
  baseScore: number,
  roadTest: RoadTestResult = "not_performed",
  mileageInconsistency = false,
) {
  const roadAdjustment = roadTest === "passed" ? ROAD_TEST_BONUS : roadTest === "issue" ? ROAD_TEST_PENALTY : 0;
  const mileageAdjustment = mileageInconsistency ? MILEAGE_INTEGRITY_PENALTY : 0;
  return Math.max(0, Math.min(VERISCORE_MAX + ROAD_TEST_BONUS, Math.round(baseScore + roadAdjustment + mileageAdjustment)));
}

export function scoreLabel(score: number) {
  return score >= 90 ? "Eccellente" : score >= 75 ? "Affidabile" : score >= 55 ? "Da valutare" : "Critico";
}
