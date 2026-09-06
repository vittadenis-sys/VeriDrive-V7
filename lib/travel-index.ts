export type TravelResult = "ok" | "issue" | "critical" | null | undefined;

export function calculateTravelReliability(results: TravelResult[]): number {
  const normalized = results.map((result) => result ?? "issue");
  if (!normalized.length) return 0;

  const weights = normalized.map((result) => result === "critical" ? 0 : result === "issue" ? 0.5 : 1);
  const average = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  return Math.max(0, Math.min(10, Math.round(average * 100) / 10));
}

export function travelReliabilityLabel(score: number) {
  if (score >= 9) return "Viaggio consigliato";
  if (score >= 7) return "Idonea con piccole attenzioni";
  if (score >= 5) return "Da controllare prima di partire";
  return "Viaggio sconsigliato";
}
