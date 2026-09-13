export type CheckResult = "ok" | "issue" | "critical" | undefined;

export type WeightedCheck = {
  id: number;
  area: string;
  label: string;
  weight: number;
};

const CRITICAL_LABELS = new Set([
  "Motore funzionamento",
  "Raffreddamento",
  "Cambio / frizione",
  "ABS / ESP",
  "Diagnosi elettronica generale",
]);

const DEFAULT_WEIGHT = 75 / 45;

const baseChecks: Array<{ id: number; area: string; label: string }> = [
  { id: 1, area: "Sicurezza", label: "Freni anteriori" },
  { id: 2, area: "Sicurezza", label: "Freni posteriori" },
  { id: 3, area: "Sicurezza", label: "Pneumatici" },
  { id: 4, area: "Sicurezza", label: "Sterzo / avantreno / retrotreno" },
  { id: 5, area: "Sicurezza", label: "Sospensioni" },
  { id: 6, area: "Sicurezza", label: "Luci e stop" },
  { id: 7, area: "Sicurezza", label: "ABS / ESP" },
  { id: 8, area: "Sicurezza", label: "Airbag / cinture" },
  { id: 9, area: "Sicurezza", label: "Sicurezza ruote e fissaggi" },
  { id: 10, area: "Sicurezza", label: "Integrità elementi di sicurezza accessibili" },
  { id: 11, area: "Meccanica", label: "Motore funzionamento" },
  { id: 12, area: "Meccanica", label: "Cambio / frizione" },
  { id: 13, area: "Meccanica", label: "Perdite olio/liquidi" },
  { id: 14, area: "Meccanica", label: "Raffreddamento" },
  { id: 15, area: "Meccanica", label: "Batteria / ricarica" },
  { id: 16, area: "Meccanica", label: "Scarico" },
  { id: 17, area: "Meccanica", label: "Trasmissione" },
  { id: 18, area: "Meccanica", label: "Altri problemi / rumori" },
  { id: 19, area: "Meccanica", label: "Avviamento" },
  { id: 20, area: "Meccanica", label: "Funzionamento al minimo" },
  { id: 21, area: "Diagnosi", label: "Spie motore" },
  { id: 22, area: "Diagnosi", label: "Errori centraline" },
  { id: 23, area: "Diagnosi", label: "Emissioni / DPF" },
  { id: 24, area: "Diagnosi", label: "Ricarica alternatore" },
  { id: 25, area: "Diagnosi", label: "Diagnosi elettronica generale" },
  { id: 26, area: "Diagnosi", label: "Sistemi di assistenza elettronici" },
  { id: 27, area: "Diagnosi", label: "Climatizzazione / gestione elettronica" },
  { id: 28, area: "Diagnosi", label: "Sistemi di illuminazione elettronici" },
  { id: 29, area: "Diagnosi", label: "Sensori principali" },
  { id: 30, area: "Diagnosi", label: "Altre anomalie diagnostiche" },
  { id: 31, area: "Documentazione", label: "Telaio VIN" },
  { id: 32, area: "Documentazione", label: "Chilometri coerenti" },
  { id: 33, area: "Documentazione", label: "Tagliandi / manutenzione" },
  { id: 34, area: "Documentazione", label: "Dotazioni obbligatorie" },
  { id: 35, area: "Documentazione", label: "Revisione" },
  { id: 36, area: "Documentazione", label: "Documentazione disponibile" },
  { id: 37, area: "Documentazione", label: "Richiami costruttore" },
  { id: 38, area: "Documentazione", label: "Numero proprietari dichiarato" },
  { id: 39, area: "Documentazione", label: "Chiavi disponibili" },
  { id: 40, area: "Documentazione", label: "Corrispondenza dati veicolo" },
  { id: 41, area: "Condizioni generali", label: "Carrozzeria" },
  { id: 42, area: "Condizioni generali", label: "Vetri e cristalli" },
  { id: 43, area: "Condizioni generali", label: "Sottoscocca" },
  { id: 44, area: "Condizioni generali", label: "Porte e serrature" },
  { id: 45, area: "Condizioni generali", label: "Interni" },
  { id: 46, area: "Condizioni generali", label: "Sedili e cinture" },
  { id: 47, area: "Condizioni generali", label: "Comandi e strumentazione" },
  { id: 48, area: "Condizioni generali", label: "Bagagliaio" },
  { id: 49, area: "Condizioni generali", label: "Pneumatici di scorta / kit" },
  { id: 50, area: "Condizioni generali", label: "Stato generale e anomalie residue" },
];

export const VERISCORE_CHECKS: WeightedCheck[] = baseChecks.map((item) => ({
  ...item,
  weight: CRITICAL_LABELS.has(item.label) ? 5 : DEFAULT_WEIGHT,
}));

export const TOTAL_VERISCORE_POINTS = 100;

export function calculateWeightedVeriscore(results: Record<number, CheckResult>) {
  const points = VERISCORE_CHECKS.reduce((total, item) => {
    const result = results[item.id];
    if (result === "ok") return total + item.weight;
    if (result === "issue") return total + item.weight / 2;
    return total;
  }, 0);
  return Math.round(Math.max(0, Math.min(TOTAL_VERISCORE_POINTS, points)));
}

export function calculateVeriscore(values: CheckResult[] | boolean[]) {
  const results: Record<number, CheckResult> = {};
  values.forEach((value, index) => {
    results[index + 1] = value === true ? "ok" : value === false ? "critical" : value;
  });
  return calculateWeightedVeriscore(results);
}

export function scoreLabel(score: number) {
  return score >= 90 ? "Eccellente" : score >= 75 ? "Affidabile" : score >= 55 ? "Da valutare" : "Critico";
}

export const VERISCORE_WEIGHTS = {
  Sicurezza: 30,
  Meccanica: 37,
  Diagnosi: 20,
  Documentazione: 13,
} as const;
