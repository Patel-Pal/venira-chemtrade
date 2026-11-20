import { getRepos } from '@/database/repositories';

export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

const IST_OFFSET_MS = 5.5 * 3600 * 1000;

/** Start of the business day (IST) containing `d`, returned as a UTC Date. */
function startOfIstDay(d: Date): Date {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

export function resolveRange(range: RangeKey, from?: Date, to?: Date, now = new Date()): { from: Date; to: Date } {
  const today = startOfIstDay(now);
  const day = 24 * 3600 * 1000;
  switch (range) {
    case 'today': return { from: today, to: now };
    case 'yesterday': return { from: new Date(today.getTime() - day), to: new Date(today.getTime() - 1) };
    case '7d': return { from: new Date(today.getTime() - 6 * day), to: now };
    case 'month': {
      const ist = new Date(now.getTime() + IST_OFFSET_MS);
      return { from: new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_OFFSET_MS), to: now };
    }
    case 'custom': {
      const f = from ?? new Date(today.getTime() - 29 * day);
      const t = to ?? now;
      return f <= t ? { from: startOfIstDay(f), to: new Date(startOfIstDay(t).getTime() + day - 1) } : { from: startOfIstDay(t), to: new Date(startOfIstDay(f).getTime() + day - 1) };
    }
    default: return { from: new Date(today.getTime() - 29 * day), to: now };
  }
}

export async function adminDashboard(range: RangeKey, from?: Date, to?: Date) {
  const repos = await getRepos();
  const r = resolveRange(range, from, to);
  const todayRange = resolveRange('today');
  const monthRange = resolveRange('month');
  const [period, today, month, all, series, statuses, top, customers, products, inv, recent] = await Promise.all([
    repos.orders.summary(r.from, r.to),
    repos.orders.summary(todayRange.from, todayRange.to),
    repos.orders.summary(monthRange.from, monthRange.to),
    repos.orders.summary(),
    repos.orders.revenueSeries(r.from, r.to),
    repos.orders.statusBreakdown(r.from, r.to),
    repos.orders.topProducts(r.from, r.to, 5),
    repos.users.list({ page: 1, limit: 1, roleKeys: ['customer'] }),
    repos.products.list({ page: 1, limit: 1 }),
    repos.inventory.counts(),
    repos.orders.list({ page: 1, limit: 8 }),
  ]);
  return {
    range: { from: r.from.toISOString(), to: r.to.toISOString() },
    totals: { salesPaise: all.revenuePaise, todayPaise: today.revenuePaise, monthPaise: month.revenuePaise, periodPaise: period.revenuePaise },
    orders: { total: all.orders, period: period.orders, pending: all.pendingOrders, avgOrderPaise: period.avgOrderPaise },
    customers: customers.total,
    products: products.total,
    lowStock: inv.lowStock,
    outOfStock: inv.outOfStock,
    series, statuses, topProducts: top,
    recentOrders: recent.items.map((o) => ({ id: o.id, orderNumber: o.orderNumber, totalPaise: o.totalPaise, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt, customer: o.shippingAddress?.fullName ?? o.customerEmail })),
  };
}

export async function platformDashboard() {
  const repos = await getRepos();
  const r = resolveRange('30d');
  const [admins, customers, products, all, payments, series, sessionsActive] = await Promise.all([
    repos.users.countByRole(['super_admin', 'admin', 'product_manager', 'order_manager', 'inventory_manager', 'support_manager']),
    repos.users.countByRole(['customer']),
    repos.products.list({ page: 1, limit: 1 }),
    repos.orders.summary(),
    repos.payments.stats(),
    repos.orders.revenueSeries(r.from, r.to),
    repos.users.list({ page: 1, limit: 1, status: 'active' }),
  ]);
  const activity = await repos.audit.list({ page: 1, limit: 10 });
  return {
    admins, customers, products: products.total, orders: all.orders, revenuePaise: all.revenuePaise,
    successfulPayments: payments.successful, failedPayments: payments.failed, activeUsers: sessionsActive.total,
    series, activity: activity.items,
  };
}
