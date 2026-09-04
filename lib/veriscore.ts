const TOTAL_CHECKS = 50;

export type CheckResult = "ok" | "issue" | "critical" | undefined;

export function calculateVeriscore(values: CheckResult[] | boolean[]) {
  const normalized = values.map((value) => value === true || value === "ok");
  const criticalCount = values.filter((value) => value === "critical").length;
  const issueCount = values.filter((value) => value === "issue").length;
  const passed = normalized.filter(Boolean).length;
  const base = Math.round((passed / TOTAL_CHECKS) * 100);
  return Math.max(0, Math.min(100, base - criticalCount * 8 - issueCount * 2));
}

export function scoreLabel(score: number) {
  return score >= 90 ? "Eccellente" : score >= 75 ? "Affidabile" : score >= 55 ? "Da valutare" : "Critico";
}

export const VERISCORE_WEIGHTS = {
  "Documenti e identità": 8,
  "Motore e trasmissione": 22,
  Sicurezza: 20,
  "Carrozzeria e telaio": 22,
  "Interni e comfort": 8,
  "Prova e comportamento": 20,
} as const;
