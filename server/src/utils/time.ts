/** Offset (ms) of `timeZone` from UTC at instant `d`. */
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

/** Converts a wall-clock date ('2026-10-12') + time ('09:30') in `timeZone` to a UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const guess = new Date(`${date}T${time.slice(0, 5)}:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone));
}

/** Iterates 'YYYY-MM-DD' dates from start to end inclusive. */
export function* eachDate(start: string, end: string): Generator<{ iso: string; weekday: number }> {
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    yield { iso: d.toISOString().slice(0, 10), weekday: d.getUTCDay() };
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

export function formatInZone(d: Date | string, timeZone: string) {
  const date = new Date(d);
  return {
    date: new Intl.DateTimeFormat('en-GB', { timeZone, dateStyle: 'medium' }).format(date),
    time: new Intl.DateTimeFormat('en-GB', { timeZone, timeStyle: 'short' }).format(date),
  };
}
