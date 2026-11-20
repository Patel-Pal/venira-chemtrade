import { getEnv } from '@/config/env';
import { logger } from '@/lib/logger';

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Sends through Resend's HTTP API. Without an API key (dev) the message is logged instead. Never throws to callers. */
export async function sendEmail(mail: Email): Promise<boolean> {
  const env = getEnv();
  if (!env.EMAIL_PROVIDER_API_KEY) {
    if (env.NODE_ENV !== 'production') logger.info('[email:dev] not sent (no provider key)', { to: mail.to, subject: mail.subject, text: mail.text });
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
    });
    if (!res.ok) logger.error('Email provider rejected message', { status: res.status });
    return res.ok;
  } catch (e) {
    logger.error('Email send failed', { error: String(e) });
    return false;
  }
}

function layout(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#14213d"><h2 style="color:#1f4e8c">${esc(title)}</h2>${body}<hr style="border:none;border-top:1px solid #e3e8ef;margin:24px 0"/><p style="font-size:12px;color:#6b7280">Venira Chemtrade - Trusted Chemical Trading Partner</p></div>`;
}

export const templates = {
  verifyEmail: (name: string, link: string): Omit<Email, 'to'> => ({
    subject: 'Verify your email - Venira Chemtrade',
    html: layout('Verify your email', `<p>Hi ${esc(name)},</p><p>Please confirm your email address to activate your account.</p><p><a href="${esc(link)}" style="background:#1f4e8c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Verify email</a></p><p style="font-size:12px">This link expires in 24 hours.</p>`),
    text: `Hi ${name}, verify your email: ${link} (valid 24 hours)`,
  }),
  resetPassword: (name: string, link: string) => ({
    subject: 'Reset your password - Venira Chemtrade',
    html: layout('Reset your password', `<p>Hi ${esc(name)},</p><p>Use the button below to choose a new password. If you did not ask for this, ignore this email.</p><p><a href="${esc(link)}" style="background:#1f4e8c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p><p style="font-size:12px">This link expires in 1 hour.</p>`),
    text: `Hi ${name}, reset your password: ${link} (valid 1 hour)`,
  }),
  orderConfirmation: (name: string, orderNumber: string, total: string, link: string) => ({
    subject: `Order ${orderNumber} confirmed`,
    html: layout('Thank you for your order', `<p>Hi ${esc(name)},</p><p>We have received your payment of <b>${esc(total)}</b> for order <b>${esc(orderNumber)}</b>.</p><p><a href="${esc(link)}">View your order</a></p>`),
    text: `Hi ${name}, order ${orderNumber} (${total}) is confirmed. ${link}`,
  }),
};
