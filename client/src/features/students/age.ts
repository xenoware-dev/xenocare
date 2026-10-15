/** Whole years since `dob` ('YYYY-MM-DD'), or null. */
export function ageOf(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years--;
  return years;
}
