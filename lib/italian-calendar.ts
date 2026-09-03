const FIXED_HOLIDAYS = [
  "01-01",
  "01-06",
  "04-25",
  "05-01",
  "06-02",
  "08-15",
  "11-01",
  "12-08",
  "12-25",
  "12-26",
] as const;

export function isItalianPublicHoliday(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const day = date.getDay();
  if (day === 0) return true;
  const monthDay = dateString.slice(5);
  if (FIXED_HOLIDAYS.includes(monthDay as (typeof FIXED_HOLIDAYS)[number])) return true;

  // Easter Monday (Pasquetta), calculated locally without an external dependency.
  const year = date.getFullYear();
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month - 1, dayOfMonth);
  easter.setDate(easter.getDate() + 1);
  return easter.toISOString().slice(0, 10) === dateString;
}
