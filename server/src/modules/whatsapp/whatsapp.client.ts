import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

/** Thin wrapper around the WhatsApp Cloud API (template messages). */
export async function sendTemplateMessage(opts: {
  to: string;              // E.164, e.g. +919876543210
  templateName: string;
  language: string;
  params: string[];
}): Promise<string> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new AppError(503, 'WhatsApp is not configured', 'whatsapp_not_configured');
  }

  const res = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: opts.to.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: opts.templateName,
          language: { code: opts.language },
          components: opts.params.length
            ? [{ type: 'body', parameters: opts.params.map((text) => ({ type: 'text', text })) }]
            : [],
        },
      }),
    },
  );

  const body = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message?: string };
  };
  if (!res.ok || !body.messages?.[0]?.id) {
    throw new Error(body.error?.message ?? `WhatsApp API error ${res.status}`);
  }
  return body.messages[0].id;
}

/** Validates the X-Hub-Signature-256 header of webhook calls. */
export function verifyWebhookSignature(rawBody: Buffer | undefined, header: string | undefined) {
  if (!env.WHATSAPP_APP_SECRET) return true; // not configured (local dev)
  if (!rawBody || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex');
  const given = header.slice(7);
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
