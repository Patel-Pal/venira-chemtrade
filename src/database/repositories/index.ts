import { connectDb } from '../connections/mongo';
import type { Repositories, BannerRecord, NotificationRecord, PageRecord } from './interfaces';
import { MongoAddressRepository, MongoRoleRepository, MongoSessionRepository, MongoUserRepository } from './mongo/user.repo';
import { MongoCategoryRepository, MongoProductRepository } from './mongo/catalog.repo';
import { MongoInventoryRepository } from './mongo/inventory.repo';
import { MongoOrderRepository } from './mongo/order.repo';
import {
  MongoAuditRepository, MongoCouponRepository, MongoCrudRepository, MongoPaymentRepository, MongoReviewRepository,
  MongoSettingsRepository, MongoShippingRepository, MongoUserDataRepository, bannerModel, notificationModel, pageModel,
} from './mongo/commerce.repo';

let repos: Repositories | null = null;

/**
 * Composition root for persistence. To migrate to MySQL, provide another factory returning
 * the same `Repositories` shape and switch here (e.g. by DATABASE_DRIVER).
 * Ensures the DB connection is open before handing repositories to a service.
 */
export async function getRepos(): Promise<Repositories> {
  await connectDb();
  if (!repos) {
    repos = {
      users: new MongoUserRepository(),
      sessions: new MongoSessionRepository(),
      roles: new MongoRoleRepository(),
      addresses: new MongoAddressRepository(),
      categories: new MongoCategoryRepository(),
      products: new MongoProductRepository(),
      inventory: new MongoInventoryRepository(),
      orders: new MongoOrderRepository(),
      payments: new MongoPaymentRepository(),
      coupons: new MongoCouponRepository(),
      reviews: new MongoReviewRepository(),
      shipping: new MongoShippingRepository(),
      settings: new MongoSettingsRepository(),
      audit: new MongoAuditRepository(),
      userData: new MongoUserDataRepository(),
      banners: new MongoCrudRepository<BannerRecord>(bannerModel, { displayOrder: 1 }),
      pages: new MongoCrudRepository<PageRecord>(pageModel, { title: 1 }),
      notifications: new MongoCrudRepository<NotificationRecord>(notificationModel, { createdAt: -1 }),
    };
  }
  return repos;
}
