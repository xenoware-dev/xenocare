/** Offset (ms) of `timeZone` from UTC at instant `d`. Same logic as server/src/utils/time.ts. */
function tzOffsetMs(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - d.getTime();
}

/** Wall-clock date ('2026-10-12') + time ('09:30') in the branch's `timeZone` → UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const guess = new Date(`${date}T${time.slice(0, 5)}:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
}

/** UTC range covering one calendar day in `timeZone`. */
export function dayRange(date: string, timeZone: string) {
  const start = zonedToUtc(date, '00:00', timeZone);
  return { from: start.toISOString(), to: new Date(start.getTime() + 86_400_000).toISOString() };
}

/** Today's date ('YYYY-MM-DD') in `timeZone`. */
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function timeIn(d: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, timeStyle: 'short' }).format(new Date(d));
}

export function weekdayOf(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
