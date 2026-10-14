const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export const formatMoney = (n: number | string | null | undefined) => currency.format(Number(n ?? 0));

export const formatDate = (d: string | Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(d)) : '-';

export const formatTime = (d: string | Date) =>
  new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(d));

export const formatMonth = (d: string) =>
  new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(d));
