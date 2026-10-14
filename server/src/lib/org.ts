import { supabaseAdmin } from './supabase.js';

let cached: { currency: string; timezone: string } | null = null;

/** Organization currency/timezone (cached for the process lifetime). */
export async function getOrgSettings() {
  if (cached) return cached;
  const { data } = await supabaseAdmin
    .from('organization_settings')
    .select('currency, default_timezone')
    .maybeSingle();
  cached = { currency: data?.currency ?? 'INR', timezone: data?.default_timezone ?? 'Asia/Kolkata' };
  return cached;
}

export async function formatMoney(amount: number) {
  const { currency } = await getOrgSettings();
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}
