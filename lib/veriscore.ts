export function calculateVeriscore(values: Array<"ok" | "issue" | "critical" | undefined>, weights?: number[]) {
  const defaultWeights = [20, 18, 18, 15, 10, 8, 4, 7];
  const itemWeights = weights && weights.length === values.length ? weights : values.map((_, index) => defaultWeights[Math.min(Math.floor(index / 6.25), defaultWeights.length - 1)] ?? 1);
  let total = 0;
  let possible = 0;
  values.forEach((value, index) => {
    const weight = itemWeights[index] ?? 1;
    possible += weight;
    total += value === "ok" ? weight : value === "issue" ? weight * 0.5 : 0;
  });
  if (!possible) return 0;
  return Math.round((total / possible) * 100);
}

export function scoreLabel(score:number){return score>=90?"Eccellente":score>=75?"Affidabile":score>=55?"Da valutare":"Critico";}
