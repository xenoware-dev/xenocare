import { formatMoney } from '../../lib/org.js';
import { supabaseAdmin, type DbClient } from '../../lib/supabase.js';
import { AppError, unwrap } from '../../utils/AppError.js';
import { notifyParents } from '../whatsapp/whatsapp.service.js';

interface InvoiceForReminder {
  id: string;
  invoice_no: string;
  branch_id: string;
  student_id: string;
  balance: number;
  due_date: string | null;
  status: string;
  reminder_count: number;
  students: { first_name: string; last_name: string | null };
}

/** Loads an invoice through the caller's client, so RLS decides access. */
async function loadInvoice(db: DbClient, id: string) {
  const inv = unwrap(
    await db
      .from('invoices')
      .select('id, invoice_no, branch_id, student_id, balance, due_date, status, reminder_count, students(first_name, last_name)')
      .eq('id', id)
      .maybeSingle(),
  ) as unknown as InvoiceForReminder | null;
  if (!inv) throw AppError.notFound('Invoice not found');
  return inv;
}

export async function sendPaymentReminder(invoice: InvoiceForReminder, sentBy: string | null) {
  if (!['unpaid', 'partial'].includes(invoice.status) || Number(invoice.balance) <= 0) {
    throw AppError.badRequest('Invoice has no outstanding balance');
  }

  const result = await notifyParents({
    branchId: invoice.branch_id,
    studentId: invoice.student_id,
    purpose: 'payment_reminder',
    relatedType: 'invoice',
    relatedId: invoice.id,
    sentBy,
    variables: {
      student_name: [invoice.students.first_name, invoice.students.last_name].filter(Boolean).join(' '),
      invoice_no: invoice.invoice_no,
      amount: await formatMoney(Number(invoice.balance)),
      due_date: invoice.due_date ?? '-',
    },
  });

  if (result.sent > 0) {
    await supabaseAdmin
      .from('invoices')
      .update({ last_reminder_at: new Date().toISOString(), reminder_count: invoice.reminder_count + 1 })
      .eq('id', invoice.id);
  }
  return result;
}

export async function remindInvoice(db: DbClient, invoiceId: string, sentBy: string) {
  return sendPaymentReminder(await loadInvoice(db, invoiceId), sentBy);
}

/** Recalculate totals/status (e.g. after un-voiding an invoice). */
export async function refreshInvoice(db: DbClient, invoiceId: string) {
  await loadInvoice(db, invoiceId); // access check
  unwrap(await supabaseAdmin.rpc('refresh_invoice', { p_invoice_id: invoiceId }));
  return loadInvoice(db, invoiceId);
}

export type { InvoiceForReminder };
