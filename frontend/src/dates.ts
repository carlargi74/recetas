export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatShort(value: string): string {
  return parseISODate(value).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function formatLong(value: string): string {
  const text = parseISODate(value).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatWeekday(value: string): string {
  const text = parseISODate(value).toLocaleDateString("es-ES", { weekday: "short" });
  return text.replace(".", "");
}

export function formatRange(start: string, end: string): string {
  if (start === end) return parseISODate(start).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const s = parseISODate(start);
  const e = parseISODate(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startText = s.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
  const endText = e.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  return `${startText} – ${endText}`;
}

export function monthLabel(date: Date): string {
  const text = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Índice de día de la semana con lunes = 0 */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Agrupa fechas ISO consecutivas en semanas (lunes a domingo) */
export function groupByWeek(dates: string[]): string[][] {
  const weeks: string[][] = [];
  let current: string[] = [];
  for (const iso of dates) {
    if (current.length > 0 && mondayIndex(parseISODate(iso)) === 0) {
      weeks.push(current);
      current = [];
    }
    current.push(iso);
  }
  if (current.length) weeks.push(current);
  return weeks;
}

/** Agrupa fechas ISO por mes (clave AAAA-MM) */
export function groupByMonth(dates: string[]): { key: string; first: Date; dates: string[] }[] {
  const map = new Map<string, string[]>();
  for (const iso of dates) {
    const key = iso.slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), iso]);
  }
  return [...map.entries()].map(([key, list]) => ({ key, first: parseISODate(list[0]), dates: list }));
}
