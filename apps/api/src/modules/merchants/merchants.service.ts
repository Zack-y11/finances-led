import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateMerchant,
  CreateMerchantAlias,
  UpdateMerchant,
} from '@finance/contracts';
import { Prisma } from '@finance/database';
import { prepareMerchantName } from '@finance/rules';

import { PrismaService } from '../../infrastructure/prisma.service.js';

export type ResolvedMerchant = {
  original: string | null;
  merchant: string | null;
  merchantId: string | null;
  defaultCategoryName: string | null;
  changed: boolean;
};

const merchantInclude = {
  defaultCategory: { select: { id: true, name: true } },
  aliases: {
    select: { id: true, alias: true, normalizedKey: true },
    orderBy: { alias: 'asc' as const },
  },
  _count: { select: { ledgerEntries: true } },
};

@Injectable()
export class MerchantsService {
  private readonly userId: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.userId = config.getOrThrow<string>('DEV_USER_ID');
  }

  findAll() {
    return this.prisma.db.merchant
      .findMany({
        where: { userId: this.userId },
        include: merchantInclude,
        orderBy: { displayName: 'asc' },
      })
      .then((merchants) => merchants.map(toMerchantDto));
  }

  async create(input: CreateMerchant) {
    const prepared = prepareMerchantName(input.displayName);
    if (!prepared) {
      throw new ConflictException('Merchant name is empty after normalization');
    }
    await this.assertOwnedCategory(input.defaultCategoryId);

    if (await this.findByKey(prepared.key)) {
      throw new ConflictException(
        'A merchant or alias with that normalized name already exists',
      );
    }

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const merchant = await tx.merchant.create({
          data: {
            userId: this.userId,
            displayName: prepared.displayName,
            normalizedKey: prepared.key,
            ...(input.defaultCategoryId
              ? { defaultCategoryId: input.defaultCategoryId }
              : {}),
          },
          include: merchantInclude,
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Merchant',
            entityId: merchant.id,
            action: 'CREATE',
            reason: `Created merchant "${merchant.displayName}".`,
            metadata: {
              displayName: merchant.displayName,
              normalizedKey: merchant.normalizedKey,
            },
          },
        });

        return toMerchantDto(merchant);
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, input: UpdateMerchant) {
    const existing = await this.findOwned(id);
    await this.assertOwnedCategory(input.defaultCategoryId);

    const nextName =
      input.displayName !== undefined
        ? prepareMerchantName(input.displayName)
        : prepareMerchantName(existing.displayName);
    if (!nextName) {
      throw new ConflictException('Merchant name is empty after normalization');
    }

    if (input.displayName !== undefined) {
      const collision = await this.findByKey(nextName.key);
      if (collision && collision.id !== id) {
        throw new ConflictException(
          'A merchant or alias with that normalized name already exists',
        );
      }
    }

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const updated = await tx.merchant.update({
          where: { id },
          data: {
            ...(input.displayName !== undefined
              ? {
                  displayName: nextName.displayName,
                  normalizedKey: nextName.key,
                }
              : {}),
            ...(input.defaultCategoryId !== undefined
              ? { defaultCategoryId: input.defaultCategoryId }
              : {}),
          },
          include: merchantInclude,
        });

        if (
          input.displayName !== undefined &&
          existing.displayName !== updated.displayName
        ) {
          await tx.ledgerEntry.updateMany({
            where: { userId: this.userId, merchantId: id },
            data: { merchant: updated.displayName },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Merchant',
            entityId: id,
            action: 'UPDATE',
            reason:
              input.displayName !== undefined &&
              existing.displayName !== updated.displayName
                ? `Renamed merchant "${existing.displayName}" to "${updated.displayName}".`
                : `Updated merchant "${updated.displayName}".`,
            metadata: {
              fields: Object.keys(input).sort(),
              previousDisplayName: existing.displayName,
              displayName: updated.displayName,
            },
          },
        });

        return toMerchantDto(updated);
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async addAlias(id: string, input: CreateMerchantAlias) {
    const merchant = await this.findOwned(id);
    const prepared = prepareMerchantName(input.alias);
    if (!prepared) {
      throw new ConflictException('Alias is empty after normalization');
    }
    if (prepared.key === merchant.normalizedKey) {
      throw new ConflictException(
        'Alias must differ from the merchant normalized name',
      );
    }

    const collision = await this.findByKey(prepared.key);
    if (collision && collision.id !== id) {
      throw new ConflictException(
        `Alias collides with merchant "${collision.displayName}". Merge those merchants instead.`,
      );
    }

    try {
      await this.prisma.db.$transaction(async (tx) => {
        await tx.merchantAlias.create({
          data: {
            userId: this.userId,
            merchantId: id,
            alias: input.alias.trim(),
            normalizedKey: prepared.key,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Merchant',
            entityId: id,
            action: 'ALIAS_ADDED',
            reason: `Added merchant alias "${input.alias.trim()}".`,
            metadata: {
              alias: input.alias.trim(),
              normalizedKey: prepared.key,
            },
          },
        });
      });
      return this.findOwned(id);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async merge(targetId: string, sourceMerchantId: string) {
    if (targetId === sourceMerchantId) {
      throw new ConflictException('Cannot merge a merchant into itself');
    }
    const [target, source] = await Promise.all([
      this.findOwned(targetId),
      this.findOwned(sourceMerchantId),
    ]);

    await this.prisma.db.$transaction(async (tx) => {
      const adoptedDefaultCategoryId =
        !target.defaultCategory && source.defaultCategory
          ? source.defaultCategory.id
          : undefined;

      if (adoptedDefaultCategoryId) {
        await tx.merchant.update({
          where: { id: target.id },
          data: { defaultCategoryId: adoptedDefaultCategoryId },
        });
      }

      const aliases = await tx.merchantAlias.findMany({
        where: { merchantId: source.id, userId: this.userId },
      });

      for (const alias of aliases) {
        if (
          alias.normalizedKey === target.normalizedKey ||
          (await tx.merchantAlias.findFirst({
            where: {
              userId: this.userId,
              normalizedKey: alias.normalizedKey,
              merchantId: { not: source.id },
            },
          }))
        ) {
          await tx.merchantAlias.delete({ where: { id: alias.id } });
          continue;
        }
        await tx.merchantAlias.update({
          where: { id: alias.id },
          data: { merchantId: target.id },
        });
      }

      const sourceKeyTaken = await tx.merchantAlias.findFirst({
        where: {
          userId: this.userId,
          normalizedKey: source.normalizedKey,
        },
      });
      if (source.normalizedKey !== target.normalizedKey && !sourceKeyTaken) {
        await tx.merchantAlias.create({
          data: {
            userId: this.userId,
            merchantId: target.id,
            alias: source.displayName,
            normalizedKey: source.normalizedKey,
          },
        });
      }

      await tx.ledgerEntry.updateMany({
        where: { userId: this.userId, merchantId: source.id },
        data: {
          merchantId: target.id,
          merchant: target.displayName,
        },
      });

      await tx.merchant.delete({ where: { id: source.id } });

      await tx.auditLog.create({
        data: {
          userId: this.userId,
          entityType: 'Merchant',
          entityId: target.id,
          action: 'MERGE',
          reason: `Merged merchant "${source.displayName}" into "${target.displayName}".`,
          metadata: {
            sourceMerchantId: source.id,
            sourceDisplayName: source.displayName,
            targetDisplayName: target.displayName,
            ...(adoptedDefaultCategoryId ? { adoptedDefaultCategoryId } : {}),
          },
        },
      });
    });

    return this.findOwned(target.id);
  }

  async resolveForProposal(raw?: string): Promise<ResolvedMerchant> {
    return this.resolve(raw, false);
  }

  async resolveForWrite(raw?: string | null): Promise<ResolvedMerchant> {
    return this.resolve(raw ?? undefined, true);
  }

  private async resolve(
    raw: string | undefined,
    persist: boolean,
  ): Promise<ResolvedMerchant> {
    if (!raw?.trim()) {
      return {
        original: null,
        merchant: null,
        merchantId: null,
        defaultCategoryName: null,
        changed: false,
      };
    }

    const prepared = prepareMerchantName(raw);
    if (!prepared) {
      return {
        original: raw.trim(),
        merchant: raw.trim(),
        merchantId: null,
        defaultCategoryName: null,
        changed: false,
      };
    }

    let merchant = await this.findByKey(prepared.key);

    if (!merchant && persist) {
      merchant = await this.createFromPrepared(prepared);
    }

    const canonical = merchant?.displayName ?? prepared.displayName;
    return {
      original: prepared.original,
      merchant: canonical,
      merchantId: merchant?.id ?? null,
      defaultCategoryName: merchant?.defaultCategory?.name ?? null,
      changed: canonical !== prepared.original,
    };
  }

  private async createFromPrepared(prepared: {
    original: string;
    displayName: string;
    key: string;
  }) {
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const merchant = await tx.merchant.create({
          data: {
            userId: this.userId,
            displayName: prepared.displayName,
            normalizedKey: prepared.key,
          },
          include: {
            defaultCategory: { select: { id: true, name: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: this.userId,
            entityType: 'Merchant',
            entityId: merchant.id,
            action: 'CREATE',
            reason: `Created merchant "${merchant.displayName}" from an incoming entry.`,
            metadata: {
              displayName: merchant.displayName,
              normalizedKey: merchant.normalizedKey,
              source: 'automatic_normalization',
            },
          },
        });

        return merchant;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByKey(prepared.key);
        if (existing) return existing;
      }
      throw error;
    }
  }

  private async findByKey(normalizedKey: string) {
    const alias = await this.prisma.db.merchantAlias.findFirst({
      where: {
        userId: this.userId,
        normalizedKey,
        merchant: { is: { userId: this.userId } },
      },
      include: {
        merchant: {
          include: {
            defaultCategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (alias) return alias.merchant;

    return this.prisma.db.merchant.findFirst({
      where: { userId: this.userId, normalizedKey },
      include: {
        defaultCategory: { select: { id: true, name: true } },
      },
    });
  }

  private async findOwned(id: string) {
    const merchant = await this.prisma.db.merchant.findFirst({
      where: { id, userId: this.userId },
      include: merchantInclude,
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return toMerchantDto(merchant);
  }

  private async assertOwnedCategory(categoryId: string | null | undefined) {
    if (!categoryId) return;
    const category = await this.prisma.db.category.findFirst({
      where: { id: categoryId, userId: this.userId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Category not found');
  }

  private handleWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A merchant or alias with that normalized name already exists',
      );
    }
    throw error;
  }
}

function toMerchantDto(merchant: {
  id: string;
  displayName: string;
  normalizedKey: string;
  createdAt: Date;
  defaultCategory: { id: string; name: string } | null;
  aliases: Array<{ id: string; alias: string; normalizedKey: string }>;
  _count: { ledgerEntries: number };
}) {
  return {
    id: merchant.id,
    displayName: merchant.displayName,
    normalizedKey: merchant.normalizedKey,
    defaultCategory: merchant.defaultCategory,
    aliases: merchant.aliases,
    entryCount: merchant._count.ledgerEntries,
    createdAt: merchant.createdAt,
  };
}
