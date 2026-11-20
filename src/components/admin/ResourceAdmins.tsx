'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import ResourceCrud from './ResourceCrud';
import { StatusChip } from '@/components/common/ui';
import { dateTime, money } from './ui';

const active = (r: any) => <StatusChip status={r.isActive ? 'active' : 'deactivated'} />;

export function CategoriesAdmin() {
  return (
    <ResourceCrud
      resource="categories" title="Categories" subtitle="Organise the catalogue into categories and subcategories." itemName="category" writePerm="categories.manage" imageFolder="categories"
      columns={[
        { key: 'name', label: 'Name', primary: true, render: (r) => <b>{r.name}</b> },
        { key: 'slug', label: 'Slug' },
        { key: 'parentId', label: 'Parent', hideOnMobile: true, render: (r) => (r.parentId ? <Chip size="small" label="Subcategory" /> : '—') },
        { key: 'displayOrder', label: 'Order', align: 'right' },
        { key: 'isActive', label: 'Status', render: active },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'slug', label: 'URL slug (optional)', type: 'text', helper: 'Auto-generated from the name when empty' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'parentId', label: 'Parent', type: 'categoryParent' },
        { name: 'image', label: 'Category image', type: 'image' },
        { name: 'displayOrder', label: 'Display order', type: 'number' },
        { name: 'isActive', label: 'Active (visible in store)', type: 'switch' },
      ]}
      defaults={{ name: '', slug: '', description: '', parentId: null, image: null, displayOrder: 0, isActive: true }}
    />
  );
}

export function CouponsAdmin() {
  return (
    <ResourceCrud
      resource="coupons" title="Coupons" subtitle="Discount codes with limits and restrictions." itemName="coupon" writePerm="coupons.manage"
      columns={[
        { key: 'code', label: 'Code', primary: true, render: (r) => <b>{r.code}</b> },
        { key: 'type', label: 'Discount', render: (r) => (r.type === 'percentage' ? `${r.value}%` : money(r.value)) },
        { key: 'minOrderPaise', label: 'Min. order', render: (r) => money(r.minOrderPaise), hideOnMobile: true },
        { key: 'usedCount', label: 'Used', render: (r) => `${r.usedCount}${r.usageLimit ? ` / ${r.usageLimit}` : ''}` },
        { key: 'expiresAt', label: 'Expires', render: (r) => (r.expiresAt ? dateTime(r.expiresAt) : 'Never'), hideOnMobile: true },
        { key: 'isActive', label: 'Status', render: active },
      ]}
      fields={[
        { name: 'code', label: 'Code', type: 'text', required: true, transform: 'upper', disabledOnEdit: true, helper: 'Letters, numbers, - and _' },
        { name: 'description', label: 'Description', type: 'text' },
        { name: 'type', label: 'Discount type', type: 'select', options: [{ value: 'percentage', label: 'Percentage (%)' }, { value: 'fixed', label: 'Fixed amount (₹)' }] },
        { name: 'value', label: 'Value (% or ₹ depending on type)', type: 'number', min: 0 },
        { name: 'minOrderPaise', label: 'Minimum order amount', type: 'money' },
        { name: 'maxDiscountPaise', label: 'Maximum discount (optional)', type: 'money', nullable: true },
        { name: 'usageLimit', label: 'Total usage limit (optional)', type: 'number', nullable: true },
        { name: 'perCustomerLimit', label: 'Per-customer limit (optional)', type: 'number', nullable: true },
        { name: 'startsAt', label: 'Starts at', type: 'date' },
        { name: 'expiresAt', label: 'Expires at', type: 'date' },
        { name: 'categoryIds', label: 'Categories', type: 'categoryIds' },
        { name: 'productIds', label: 'Products', type: 'productIds' },
        { name: 'isActive', label: 'Active', type: 'switch' },
      ]}
      defaults={{ code: '', description: '', type: 'percentage', value: 10, minOrderPaise: '', maxDiscountPaise: '', usageLimit: '', perCustomerLimit: '', startsAt: '', expiresAt: '', categoryIds: [], productIds: [], isActive: true }}
      mapIn={(item, form) => ({ ...form, value: item.type === 'fixed' ? item.value / 100 : item.value })}
      mapOut={(p, f) => ({ ...p, value: f.type === 'fixed' ? Math.round(Number(f.value) * 100) : Math.round(Number(f.value)) })}
    />
  );
}

export function BannersAdmin({ canBanners, canPages }: { canBanners: boolean; canPages: boolean }) {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} aria-label="Content sections">
        <Tab label="Banners" />
        <Tab label="Pages, policies & FAQ" />
      </Tabs>
      {tab === 0 && (
        <ResourceCrud
          resource="banners" title="Banners" subtitle="Hero, promotional banners and the announcement text on the storefront." itemName="banner" canWrite={canBanners} imageFolder="banners"
          columns={[
            { key: 'title', label: 'Title', primary: true, render: (r) => <b>{r.title || '(untitled)'}</b> },
            { key: 'placement', label: 'Placement', render: (r) => <Chip size="small" label={r.placement} /> },
            { key: 'displayOrder', label: 'Order', align: 'right' },
            { key: 'isActive', label: 'Status', render: active },
          ]}
          fields={[
            { name: 'placement', label: 'Placement', type: 'select', options: [{ value: 'hero', label: 'Hero (first one is used)' }, { value: 'promo', label: 'Promotional (up to 2 shown)' }, { value: 'announcement', label: 'Announcement' }] },
            { name: 'title', label: 'Title', type: 'text' },
            { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
            { name: 'ctaLabel', label: 'Button label', type: 'text' },
            { name: 'ctaUrl', label: 'Button link (e.g. /products)', type: 'text' },
            { name: 'image', label: 'Image', type: 'image' },
            { name: 'displayOrder', label: 'Display order', type: 'number' },
            { name: 'isActive', label: 'Active', type: 'switch' },
          ]}
          defaults={{ placement: 'promo', title: '', subtitle: '', ctaLabel: '', ctaUrl: '', image: null, displayOrder: 0, isActive: true }}
        />
      )}
      {tab === 1 && (
        <ResourceCrud
          resource="pages" title="Pages" subtitle="About, Contact, FAQ and legal policies. Use '## Heading' and '- bullet' for simple formatting." itemName="page" canWrite={canPages}
          columns={[
            { key: 'title', label: 'Title', primary: true, render: (r) => <b>{r.title}</b> },
            { key: 'slug', label: 'URL', render: (r) => <Typography variant="body2" component="code">/{r.slug}</Typography> },
            { key: 'kind', label: 'Type', render: (r) => <Chip size="small" label={r.kind} /> },
            { key: 'isPublished', label: 'Status', render: (r) => <StatusChip status={r.isPublished ? 'published' : 'draft'} /> },
          ]}
          fields={[
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'slug', label: 'URL slug', type: 'text', required: true, disabledOnEdit: true },
            { name: 'kind', label: 'Type', type: 'select', options: [{ value: 'static', label: 'Static page' }, { value: 'policy', label: 'Policy' }, { value: 'faq', label: 'FAQ' }] },
            { name: 'content', label: 'Content', type: 'textarea' },
            { name: 'faqs', label: 'FAQ entries', type: 'faqs' },
            { name: 'isPublished', label: 'Published', type: 'switch' },
          ]}
          defaults={{ title: '', slug: '', kind: 'static', content: '', faqs: [], isPublished: true }}
        />
      )}
    </Box>
  );
}

export function ShippingAdmin({ canWrite }: { canWrite: boolean }) {
  return (
    <ResourceCrud
      resource="shipping-methods" title="Shipping methods" subtitle="Charges are always applied by the server at checkout." itemName="shipping method" canWrite={canWrite}
      columns={[
        { key: 'name', label: 'Name', primary: true, render: (r) => <b>{r.name}</b> },
        { key: 'pricePaise', label: 'Price', render: (r) => money(r.pricePaise) },
        { key: 'freeAbovePaise', label: 'Free above', hideOnMobile: true, render: (r) => (r.freeAbovePaise ? money(r.freeAbovePaise) : '—') },
        { key: 'estimatedDays', label: 'ETA', hideOnMobile: true },
        { key: 'isActive', label: 'Status', render: active },
      ]}
      fields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'text' },
        { name: 'pricePaise', label: 'Price', type: 'money' },
        { name: 'freeAbovePaise', label: 'Free shipping above (optional)', type: 'money', nullable: true },
        { name: 'estimatedDays', label: 'Estimated days (e.g. 3-5)', type: 'text' },
        { name: 'displayOrder', label: 'Display order', type: 'number' },
        { name: 'isActive', label: 'Active', type: 'switch' },
      ]}
      defaults={{ name: '', description: '', pricePaise: '', freeAbovePaise: '', estimatedDays: '', displayOrder: 0, isActive: true }}
    />
  );
}

export function TaxAdmin({ canWrite }: { canWrite: boolean }) {
  return (
    <ResourceCrud
      resource="taxes" title="Tax configuration" subtitle="Rates are added on top of item prices (tax-exclusive pricing)." itemName="tax rate" canWrite={canWrite}
      columns={[
        { key: 'name', label: 'Name', primary: true, render: (r) => <b>{r.name}</b> },
        { key: 'ratePercent', label: 'Rate', render: (r) => `${r.ratePercent}%` },
        { key: 'appliesToShipping', label: 'On shipping', render: (r) => (r.appliesToShipping ? 'Yes' : 'No'), hideOnMobile: true },
        { key: 'isActive', label: 'Status', render: active },
      ]}
      fields={[
        { name: 'name', label: 'Name (e.g. GST)', type: 'text', required: true },
        { name: 'ratePercent', label: 'Rate (%)', type: 'number', min: 0 },
        { name: 'appliesToShipping', label: 'Also apply to shipping charges', type: 'switch' },
        { name: 'isActive', label: 'Active', type: 'switch' },
      ]}
      defaults={{ name: 'GST', ratePercent: 18, appliesToShipping: false, isActive: true }}
    />
  );
}
