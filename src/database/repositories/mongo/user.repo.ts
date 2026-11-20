/* eslint-disable @typescript-eslint/no-explicit-any */
import { AddressModel, RoleModel, SessionModel, UserModel } from '../../models';
import type { Address, ID, Role, User } from '@/types/domain';
import type { IAddressRepository, IRoleRepository, ISessionRepository, IUserRepository, UserListQuery } from '../interfaces';
import { cleanPatch, escapeRegex, isId, mapDoc, oid, paged, skip } from './helpers';

export class MongoUserRepository implements IUserRepository {
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await UserModel.findById(id).lean();
    return d ? mapDoc<User>(d) : null;
  }
  async findByEmail(email: string, withPassword = false) {
    const q = UserModel.findOne({ email: String(email).toLowerCase() });
    if (withPassword) q.select('+passwordHash');
    const d = await q.lean();
    return d ? mapDoc<User>(d) : null;
  }
  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
    const d = await UserModel.create({ ...data, roleId: oid(data.roleId) });
    const { passwordHash: _p, ...rest } = d.toObject();
    return mapDoc<User>(rest);
  }
  async update(id: ID, patch: any) {
    if (!isId(id)) return null;
    const d = await UserModel.findByIdAndUpdate(id, { $set: cleanPatch(patch, ['roleId']) }, { new: true }).lean();
    return d ? mapDoc<User>(d) : null;
  }
  async setPasswordHash(id: ID, hash: string) {
    await UserModel.updateOne({ _id: id }, { $set: { passwordHash: hash } });
  }
  async list(q: UserListQuery) {
    const f: Record<string, any> = {};
    if (q.search) {
      const rx = new RegExp(escapeRegex(q.search), 'i');
      f.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    if (q.roleKeys?.length) f.roleKey = { $in: q.roleKeys };
    else if (q.excludeRoleKeys?.length) f.roleKey = { $nin: q.excludeRoleKeys };
    if (q.status) f.status = q.status;
    const [items, total] = await Promise.all([
      UserModel.find(f).sort({ createdAt: -1 }).skip(skip(q)).limit(q.limit).lean(),
      UserModel.countDocuments(f),
    ]);
    return paged(items.map((i) => mapDoc<User>(i)), total, q);
  }
  async countByRole(roleKeys: string[]) {
    return UserModel.countDocuments({ roleKey: { $in: roleKeys } });
  }
  async setEmailVerifyToken(id: ID, tokenHash: string, expiresAt: Date) {
    await UserModel.updateOne({ _id: id }, { $set: { emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: expiresAt } });
  }
  async consumeEmailVerifyToken(tokenHash: string) {
    const d = await UserModel.findOneAndUpdate(
      { emailVerifyTokenHash: tokenHash, emailVerifyExpiresAt: { $gt: new Date() } },
      { $set: { emailVerified: true, status: 'active' }, $unset: { emailVerifyTokenHash: '', emailVerifyExpiresAt: '' } },
      { new: true },
    ).lean();
    return d ? mapDoc<User>(d) : null;
  }
  async setResetToken(id: ID, tokenHash: string, expiresAt: Date) {
    await UserModel.updateOne({ _id: id }, { $set: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt } });
  }
  async consumeResetToken(tokenHash: string) {
    const d = await UserModel.findOneAndUpdate(
      { resetTokenHash: tokenHash, resetTokenExpiresAt: { $gt: new Date() } },
      { $unset: { resetTokenHash: '', resetTokenExpiresAt: '' } },
      { new: true },
    ).lean();
    return d ? mapDoc<User>(d) : null;
  }
  async recordLoginFailure(id: ID, lockAfter: number, lockMs: number) {
    const d = await UserModel.findByIdAndUpdate(id, { $inc: { failedLoginCount: 1 } }, { new: true }).lean();
    if (d && (d.failedLoginCount ?? 0) >= lockAfter) {
      await UserModel.updateOne({ _id: id }, { $set: { lockedUntil: new Date(Date.now() + lockMs), failedLoginCount: 0 } });
    }
  }
  async recordLoginSuccess(id: ID) {
    await UserModel.updateOne({ _id: id }, { $set: { failedLoginCount: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: '' } });
  }
  async getLockedUntil(id: ID) {
    const d = await UserModel.findById(id).select('lockedUntil').lean();
    return d?.lockedUntil ?? null;
  }
}

export class MongoSessionRepository implements ISessionRepository {
  async create(s: { userId: ID; tokenHash: string; ip?: string; userAgent?: string; expiresAt: Date }) {
    const d = await SessionModel.create({ ...s, userId: oid(s.userId) });
    return { id: String(d._id) };
  }
  async findActiveByTokenHash(tokenHash: string) {
    const d = await SessionModel.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
    return d ? { id: String(d._id), userId: String(d.userId), expiresAt: d.expiresAt } : null;
  }
  async revoke(id: ID) {
    if (isId(id)) await SessionModel.updateOne({ _id: id }, { $set: { revokedAt: new Date() } });
  }
  async revokeAllForUser(userId: ID) {
    const r = await SessionModel.updateMany({ userId: oid(userId), revokedAt: null }, { $set: { revokedAt: new Date() } });
    return r.modifiedCount;
  }
  async listActiveForUser(userId: ID) {
    const ds = await SessionModel.find({ userId: oid(userId), revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean();
    return ds.map((d) => ({ id: String(d._id), ip: d.ip ?? undefined, userAgent: d.userAgent ?? undefined, createdAt: d.createdAt as Date, expiresAt: d.expiresAt }));
  }
}

export class MongoRoleRepository implements IRoleRepository {
  async findById(id: ID) {
    if (!isId(id)) return null;
    const d = await RoleModel.findById(id).lean();
    return d ? mapDoc<Role>(d) : null;
  }
  async findByKey(key: string) {
    const d = await RoleModel.findOne({ key }).lean();
    return d ? mapDoc<Role>(d) : null;
  }
  async list() {
    return (await RoleModel.find().sort({ createdAt: 1 }).lean()).map((d) => mapDoc<Role>(d));
  }
  async create(data: Pick<Role, 'key' | 'name' | 'description' | 'isSystem' | 'permissions'>) {
    return mapDoc<Role>((await RoleModel.create(data)).toObject());
  }
  async update(id: ID, patch: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>) {
    if (!isId(id)) return null;
    const d = await RoleModel.findByIdAndUpdate(id, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<Role>(d) : null;
  }
  async delete(id: ID) {
    if (!isId(id)) return false;
    return (await RoleModel.deleteOne({ _id: id, isSystem: false })).deletedCount === 1;
  }
  async upsertByKey(data: Pick<Role, 'key' | 'name' | 'description' | 'isSystem' | 'permissions'>) {
    const d = await RoleModel.findOneAndUpdate({ key: data.key }, { $set: data }, { new: true, upsert: true }).lean();
    return mapDoc<Role>(d);
  }
}

export class MongoAddressRepository implements IAddressRepository {
  async listByUser(userId: ID) {
    return (await AddressModel.find({ userId: oid(userId) }).sort({ createdAt: -1 }).lean()).map((d) => mapDoc<Address>(d));
  }
  async findByIdForUser(id: ID, userId: ID) {
    if (!isId(id)) return null;
    const d = await AddressModel.findOne({ _id: id, userId: oid(userId) }).lean();
    return d ? mapDoc<Address>(d) : null;
  }
  async create(data: Omit<Address, 'id'>) {
    const uid = oid(data.userId);
    if (data.isDefaultShipping) await AddressModel.updateMany({ userId: uid }, { $set: { isDefaultShipping: false } });
    if (data.isDefaultBilling) await AddressModel.updateMany({ userId: uid }, { $set: { isDefaultBilling: false } });
    return mapDoc<Address>((await AddressModel.create({ ...data, userId: uid })).toObject());
  }
  async update(id: ID, userId: ID, patch: Partial<Omit<Address, 'id' | 'userId'>>) {
    if (!isId(id)) return null;
    const uid = oid(userId);
    if (patch.isDefaultShipping) await AddressModel.updateMany({ userId: uid }, { $set: { isDefaultShipping: false } });
    if (patch.isDefaultBilling) await AddressModel.updateMany({ userId: uid }, { $set: { isDefaultBilling: false } });
    const d = await AddressModel.findOneAndUpdate({ _id: id, userId: uid }, { $set: cleanPatch(patch) }, { new: true }).lean();
    return d ? mapDoc<Address>(d) : null;
  }
  async delete(id: ID, userId: ID) {
    if (!isId(id)) return false;
    return (await AddressModel.deleteOne({ _id: id, userId: oid(userId) })).deletedCount === 1;
  }
}
