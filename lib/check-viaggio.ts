export const CHECK_VIAGGIO_CHECKLIST = [
  "Pneumatici e pressione",
  "Freni e liquido freni",
  "Batteria e avviamento",
  "Livello e stato olio motore",
  "Liquido refrigerante",
  "Luci e segnalazioni",
  "Tergicristalli e lavavetri",
  "Perdite di liquidi",
  "Sospensioni e sterzo",
  "Cinture e dispositivi di sicurezza",
  "Climatizzazione/disappannamento",
  "Dotazioni di emergenza",
] as const;

export type CheckViaggioResult =
  | "recommended"
  | "attention"
  | "check_before_departure"
  | "not_recommended";

export function getCheckViaggioResult(index: number): CheckViaggioResult {
  if (index >= 9) return "recommended";
  if (index >= 7) return "attention";
  if (index >= 5) return "check_before_departure";
  return "not_recommended";
}

export function getCheckViaggioResultLabel(result: CheckViaggioResult) {
  switch (result) {
    case "recommended":
      return "Viaggio consigliato";
    case "attention":
      return "Idonea con piccole attenzioni";
    case "check_before_departure":
      return "Da controllare prima di partire";
    default:
      return "Viaggio sconsigliato";
  }
}

export function calculateCheckViaggioIndex(passed: number, total = CHECK_VIAGGIO_CHECKLIST.length) {
  const safeTotal = Math.max(1, total);
  const safePassed = Math.min(Math.max(0, passed), safeTotal);
  return Number(((safePassed / safeTotal) * 10).toFixed(1));
}
