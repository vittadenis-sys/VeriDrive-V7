export type CheckResult = "ok" | "issue" | "critical" | undefined;

export type WeightedCheck = {
  id: number;
  area: string;
  label: string;
  weight: number;
};

export const VERISCORE_CHECKS: WeightedCheck[] = [
  { id: 1, area: "Sicurezza", label: "Freni anteriori", weight: 4 },
  { id: 2, area: "Sicurezza", label: "Freni posteriori", weight: 3 },
  { id: 3, area: "Sicurezza", label: "Pneumatici", weight: 4 },
  { id: 4, area: "Sicurezza", label: "Sterzo / avantreno / retrotreno", weight: 4 },
  { id: 5, area: "Sicurezza", label: "Sospensioni", weight: 4 },
  { id: 6, area: "Sicurezza", label: "Luci e stop", weight: 2 },
  { id: 7, area: "Sicurezza", label: "ABS / ESP", weight: 3 },
  { id: 8, area: "Sicurezza", label: "Airbag / cinture", weight: 3 },
  { id: 9, area: "Meccanica", label: "Motore funzionamento", weight: 8 },
  { id: 10, area: "Meccanica", label: "Cambio / frizione", weight: 5 },
  { id: 11, area: "Meccanica", label: "Perdite olio/liquidi", weight: 5 },
  { id: 12, area: "Meccanica", label: "Raffreddamento", weight: 4 },
  { id: 13, area: "Meccanica", label: "Batteria / ricarica", weight: 3 },
  { id: 14, area: "Meccanica", label: "Scarico", weight: 3 },
  { id: 15, area: "Meccanica", label: "Trasmissione", weight: 4 },
  { id: 16, area: "Meccanica", label: "Altri problemi / rumori", weight: 5 },
  { id: 17, area: "Diagnosi", label: "Spie motore", weight: 5 },
  { id: 18, area: "Diagnosi", label: "Errori centraline", weight: 5 },
  { id: 19, area: "Diagnosi", label: "Emissioni / DPF", weight: 5 },
  { id: 20, area: "Diagnosi", label: "Ricarica alternatore", weight: 5 },
  { id: 21, area: "Documentazione", label: "Telaio VIN", weight: 3 },
  { id: 22, area: "Documentazione", label: "Chilometri coerenti", weight: 4 },
  { id: 23, area: "Documentazione", label: "Tagliandi / manutenzione", weight: 4 },
  { id: 24, area: "Documentazione", label: "Dotazioni obbligatorie", weight: 2 },
];

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
    results[index + 1] =
      value === true ? "ok" :
      value === false ? "critical" :
      value;
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
