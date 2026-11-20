import { route, parseBody } from '@/lib/api';
import { getRepos } from '@/database/repositories';
import { enquirySchema } from '@/schemas';
import { sanitizeText } from '@/lib/security';

/** Contact form / "Request a quote". Stored as an admin notification (and emailed when a provider is configured). */
export const POST = route({ limit: { bucket: 'enquiry', max: 5, windowMs: 60 * 60_000 } }, async ({ req }) => {
  const b = await parseBody(req, enquirySchema);
  const repos = await getRepos();
  await repos.notifications.create({
    type: 'enquiry', audience: 'admin',
    title: b.productName ? `Quote request: ${sanitizeText(b.productName, 120)}` : 'Contact enquiry',
    body: sanitizeText(b.message, 2000),
    data: { name: sanitizeText(b.name, 100), email: b.email, phone: b.phone, productName: b.productName ? sanitizeText(b.productName, 200) : undefined },
  });
  return { message: 'Thank you. Our team will get back to you shortly.' };
});
