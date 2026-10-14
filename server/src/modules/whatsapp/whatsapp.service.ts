import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import type { TablesUpdate } from '../../types/database.types.js';
import { unwrap } from '../../utils/AppError.js';
import { sendTemplateMessage } from './whatsapp.client.js';

export type MessagePurpose =
  | 'appointment_reminder'
  | 'appointment_change'
  | 'payment_reminder'
  | 'absence_notice'
  | 'report_ready'
  | 'general';

type RelatedType = 'appointment' | 'invoice' | 'progress_report' | 'attendance' | 'other';

interface Template {
  id: string;
  provider_template_name: string;
  language: string;
  variables: string[];
}

interface Recipient {
  parent_id: string;
  full_name: string;
  whatsapp_number: string;
}

async function getTemplate(purpose: MessagePurpose): Promise<Template | null> {
  const { data } = await supabaseAdmin
    .from('message_templates')
    .select('id, provider_template_name, language, variables')
    .eq('purpose', purpose)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return (data as Template | null) ?? null;
}

/** Parents of a student who have a WhatsApp number and have opted in. */
export async function getRecipients(studentId: string): Promise<Recipient[]> {
  const rows = unwrap(
    await supabaseAdmin
      .from('student_parents')
      .select('receives_whatsapp, parents!inner(id, full_name, whatsapp_number, whatsapp_opt_in, deleted_at)')
      .eq('student_id', studentId)
      .eq('receives_whatsapp', true),
  ) as unknown as {
    parents: { id: string; full_name: string; whatsapp_number: string | null; whatsapp_opt_in: boolean; deleted_at: string | null };
  }[];

  return rows
    .map((r) => r.parents)
    .filter((p) => p.whatsapp_number && p.whatsapp_opt_in && !p.deleted_at)
    .map((p) => ({ parent_id: p.id, full_name: p.full_name, whatsapp_number: p.whatsapp_number! }));
}

/** Sends one queued message and records the outcome. */
export async function dispatch(messageId: string) {
  const msg = unwrap(
    await supabaseAdmin
      .from('whatsapp_messages')
      .select('id, to_number, payload, message_templates(provider_template_name, language, variables)')
      .eq('id', messageId)
      .single(),
  ) as unknown as {
    id: string;
    to_number: string;
    payload: Record<string, string>;
    message_templates: { provider_template_name: string; language: string; variables: string[] } | null;
  };

  if (!msg.message_templates) {
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'failed', error_message: 'Template missing', failed_at: new Date().toISOString() })
      .eq('id', messageId);
    return false;
  }

  const t = msg.message_templates;
  try {
    const providerId = await sendTemplateMessage({
      to: msg.to_number,
      templateName: t.provider_template_name,
      language: t.language,
      params: t.variables.map((name) => String(msg.payload[name] ?? '')),
    });
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'sent', provider_message_id: providerId, sent_at: new Date().toISOString(), error_message: null })
      .eq('id', messageId);
    return true;
  } catch (err) {
    logger.warn({ err, messageId }, 'WhatsApp send failed');
    await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status: 'failed', error_message: (err as Error).message, failed_at: new Date().toISOString() })
      .eq('id', messageId);
    return false;
  }
}

/**
 * Queues a templated message to every opted-in parent of a student and sends it.
 * `variables` are template values; `parent_name` is filled in per recipient.
 */
export async function notifyParents(opts: {
  branchId: string;
  studentId: string;
  purpose: MessagePurpose;
  variables: Record<string, string>;
  relatedType?: RelatedType;
  relatedId?: string;
  sentBy?: string | null;
}) {
  const template = await getTemplate(opts.purpose);
  if (!template) return { sent: 0, failed: 0, reason: `No active template for ${opts.purpose}` };

  const recipients = await getRecipients(opts.studentId);
  if (!recipients.length) return { sent: 0, failed: 0, reason: 'No opted-in parent with a WhatsApp number' };

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const row = unwrap(
      await supabaseAdmin
        .from('whatsapp_messages')
        .insert({
          branch_id: opts.branchId,
          parent_id: r.parent_id,
          student_id: opts.studentId,
          to_number: r.whatsapp_number,
          template_id: template.id,
          purpose: opts.purpose,
          related_type: opts.relatedType ?? null,
          related_id: opts.relatedId ?? null,
          payload: { ...opts.variables, parent_name: r.full_name },
          sent_by: opts.sentBy ?? null,
        })
        .select('id')
        .single(),
    ) as { id: string };
    if (await dispatch(row.id)) sent++;
    else failed++;
  }
  return { sent, failed };
}

/** Sends messages admins queued from the UI (status = 'queued'). */
export async function processQueue(limit = 50) {
  const rows = unwrap(
    await supabaseAdmin
      .from('whatsapp_messages')
      .select('id')
      .eq('status', 'queued')
      .order('queued_at')
      .limit(limit),
  ) as { id: string }[];
  for (const r of rows) await dispatch(r.id);
  return rows.length;
}

/** Applies delivery status callbacks from the WhatsApp webhook. */
export async function applyStatusWebhook(body: unknown) {
  type Status = { id: string; status: string; timestamp: string; errors?: { title?: string; message?: string }[] };
  const entries = (body as { entry?: { changes?: { value?: { statuses?: Status[] } }[] }[] })?.entry ?? [];
  const statuses = entries.flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.statuses ?? []);

  for (const s of statuses) {
    const at = new Date(Number(s.timestamp) * 1000).toISOString();
    let patch: TablesUpdate<'whatsapp_messages'>;
    if (s.status === 'delivered') patch = { status: 'delivered', delivered_at: at };
    else if (s.status === 'read') patch = { status: 'read', read_at: at };
    else if (s.status === 'failed')
      patch = {
        status: 'failed',
        failed_at: at,
        error_message: s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? 'Delivery failed',
      };
    else continue;

    await supabaseAdmin.from('whatsapp_messages').update(patch).eq('provider_message_id', s.id);
  }
  return statuses.length;
}
