/* Idempotent seed: npm run seed. Safe to re-run; existing records are left untouched. */
import { getRepos } from '../repositories';
import { ALL_PERMISSIONS, DEFAULT_ROLES, PERMISSIONS } from '@/constants/permissions';
import { PermissionModel } from '../models';
import { CATALOGUE, PDF_CONTACT } from './catalogue';
import { generateSku, slugify } from '@/utils/slug';

const PENDING = 'Content pending - to be provided by Venira Chemtrade via the Admin panel (Admin > Content > Pages).';

async function main() {
  const repos = await getRepos();

  // 1. Permissions & roles
  for (const key of ALL_PERMISSIONS) {
    await PermissionModel.updateOne({ key }, { $set: { key, description: PERMISSIONS[key], module: key.split('.')[0] } }, { upsert: true });
  }
  for (const r of DEFAULT_ROLES) await repos.roles.upsertByKey({ key: r.key, name: r.name, description: r.description, isSystem: r.isSystem, permissions: r.permissions });
  console.log(`roles: ${DEFAULT_ROLES.length}, permissions: ${ALL_PERMISSIONS.length}`);

  // 2. Store settings (only if absent) - values come from the supplied PDF/logo, all editable in Admin > Settings
  if (!(await repos.settings.get('store'))) {
    await repos.settings.set('store', {
      storeName: 'Venira Chemtrade', tagline: 'Trusted Chemical Trading Partner', contactPhone: PDF_CONTACT.phone, address: PDF_CONTACT.address, whatsapp: PDF_CONTACT.phone,
      currency: 'INR', social: {}, seo: { title: 'Venira Chemtrade | Cosmetic raw materials & ingredients', description: PDF_CONTACT.tagline },
      maintenanceMode: false, notifications: { orderEmails: true, lowStockAlerts: true },
      featureFlags: { reviews: true, wishlist: true, newsletter: true, guestCart: true },
      brandStory: undefined, hero: { eyebrow: 'Venira Chemtrade', heading: PDF_CONTACT.tagline, subheading: 'Cosmetic ingredients for skincare, haircare, sun care and more.', ctaLabel: 'Browse ingredients', ctaUrl: '/products' },
    });
    console.log('store settings created');
  }

  // 3. Shipping method placeholder (rate to be configured by admin)
  if ((await repos.shipping.list()).length === 0) {
    await repos.shipping.create({ name: 'Standard delivery', description: 'Rate pending - configure in Admin > Settings', pricePaise: 0, freeAbovePaise: null, estimatedDays: undefined, isActive: true, displayOrder: 0 });
    console.log('placeholder shipping method created (price 0, edit in admin)');
  }

  // 4. Categories + products from the PDF
  let created = 0;
  const takenSkus = new Set<string>();
  for (const [ci, cat] of CATALOGUE.entries()) {
    let category = await repos.categories.findBySlug(cat.slug);
    if (!category) category = await repos.categories.create({ name: cat.name, slug: cat.slug, description: cat.description, parentId: null, displayOrder: ci, isActive: true });
    for (const item of cat.items) {
      const slug = slugify(item.name);
      if (await repos.products.findBySlug(slug)) continue;
      const product = await repos.products.create({
        name: item.name, slug, categoryId: category.id, benefits: [], ingredients: [], specifications: [], tags: [cat.name],
        status: 'published', isFeatured: false, isBestSeller: false, isNewArrival: false, seo: {},
        sourceName: item.source, dataStatus: 'pending_admin_input',
      });
      let sku = '';
      for (let seq = 1; seq < 200; seq++) {
        sku = generateSku(item.name, 'STD', seq);
        if (!takenSkus.has(sku) && !(await repos.products.findVariantBySku(sku))) break;
      }
      takenSkus.add(sku);
      await repos.products.createVariant({ productId: product.id, sku, label: 'Standard', pricePaise: null, compareAtPricePaise: null, trackInventory: false, isActive: true, displayOrder: 0 });
      created++;
    }
  }
  console.log(`products created: ${created}`);

  // 5. Static pages - facts from the PDF only; policy text is a clearly marked placeholder (never invented legal terms)
  const pages = [
    { slug: 'about', title: 'About Us', kind: 'static' as const, content: `Venira Chemtrade - Trusted Chemical Trading Partner.\n\n${PDF_CONTACT.tagline}.\n\nWe supply cosmetic ingredients across emulsifiers, actives, surfactants, silicones, UV filters, oils, butters, extracts and speciality chemicals.\n\nBrand story: ${PENDING}` },
    { slug: 'contact', title: 'Contact Us', kind: 'static' as const, content: `Address: ${PDF_CONTACT.address}\nPhone: ${PDF_CONTACT.phone}` },
    { slug: 'faq', title: 'Frequently Asked Questions', kind: 'faq' as const, content: '', faqs: [] as { question: string; answer: string }[] },
    { slug: 'shipping-policy', title: 'Shipping Policy', kind: 'policy' as const, content: PENDING },
    { slug: 'return-refund-policy', title: 'Return and Refund Policy', kind: 'policy' as const, content: PENDING },
    { slug: 'privacy-policy', title: 'Privacy Policy', kind: 'policy' as const, content: PENDING },
    { slug: 'terms-and-conditions', title: 'Terms and Conditions', kind: 'policy' as const, content: PENDING },
  ];
  for (const p of pages) {
    const exists = await repos.pages.list({ page: 1, limit: 1, filter: { slug: p.slug } });
    if (!exists.total) await repos.pages.create({ faqs: [], isPublished: true, ...p });
  }
  console.log('pages ensured');
  console.log('seed complete');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
