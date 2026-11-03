import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export async function syncCnttRecords(
  prisma: PrismaClient,
  force: boolean = false,
  externalLog?: (msg: string) => void
) {
  const log = (msg: string) => {
    console.log(msg);
    if (externalLog) externalLog(msg);
  };

  log('[CNTT Sync] Starting resilient CNTT asset synchronization...');
  const isPg = (process.env.DATABASE_URL || '').toLowerCase().includes('postgres');
  log(`[CNTT Sync] DB type: ${isPg ? 'PostgreSQL' : 'SQLite'}`);

  const pkdkCnttCount = await prisma.asset.count({
    where: {
      departmentId: 1,
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  }).catch(() => -1);

  const totalCnttCount = await prisma.asset.count({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  }).catch(() => -1);

  const hasUnmergedComputers = await prisma.asset.count({
    where: {
      OR: [
        { assetCode: { startsWith: 'CPU/' } },
        { assetCode: { startsWith: 'MH/' } },
        { assetCode: { startsWith: 'CNTT' } },
        { assetCode: { startsWith: 'PC/' } }
      ]
    }
  }).catch(() => 0);

  if (!force && totalCnttCount === 675 && pkdkCnttCount === 64 && hasUnmergedComputers === 0) {
    log('[CNTT Sync] CNTT assets are already clean and up-to-date (675 assets, 64 in PKDK). No sync needed.');
    return { ok: true, synced: 0, message: 'Already up to date', total: totalCnttCount, pkdk: pkdkCnttCount };
  }

  log(`[CNTT Sync] Sync needed: totalCnttCount=${totalCnttCount}, pkdkCnttCount=${pkdkCnttCount}, hasUnmerged=${hasUnmergedComputers}, force=${force}`);

  // Locate initial-seed-data.json
  const seedDataCandidates = [
    path.join(__dirname, '../prisma/initial-seed-data.json'),
    path.join(__dirname, '../../prisma/initial-seed-data.json'),
    path.join(process.cwd(), 'prisma/initial-seed-data.json'),
    path.join(process.cwd(), 'server/prisma/initial-seed-data.json')
  ];
  const foundSeed = seedDataCandidates.find(p => fs.existsSync(p));

  if (!foundSeed) {
    log('[CNTT Sync] Error: initial-seed-data.json not found!');
    return { ok: false, error: 'initial-seed-data.json not found' };
  }

  log(`[CNTT Sync] Reading seed data from: ${foundSeed}`);
  const raw = fs.readFileSync(foundSeed, 'utf-8');
  const data = JSON.parse(raw);
  const cnttAssets = data.assets.filter((a: any) => a.categoryId === 2 || a.managingUnit === 'CNTT');
  log(`[CNTT Sync] Found ${cnttAssets.length} clean CNTT assets in seed JSON.`);

  // 1. Find all old CNTT asset IDs in database
  const oldAssets = await prisma.asset.findMany({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' },
        { assetCode: { startsWith: 'VT/' } },
        { assetCode: { startsWith: 'MI/' } },
        { assetCode: { startsWith: 'Laptop/' } },
        { assetCode: { startsWith: 'Scan/' } },
        { assetCode: { startsWith: 'CPU/' } },
        { assetCode: { startsWith: 'MH/' } }
      ]
    },
    select: { id: true }
  });
  const oldIds = oldAssets.map(a => a.id);
  log(`[CNTT Sync] Found ${oldIds.length} existing CNTT asset IDs to replace.`);

  // 2. Safely remove any child records referencing these IDs to avoid Foreign Key violations in PostgreSQL
  if (oldIds.length > 0) {
    const chunkIds = (arr: number[], size: number) => {
      const res = [];
      for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
      return res;
    };
    const idChunks = chunkIds(oldIds, 500);
    for (const chunk of idChunks) {
      await prisma.maintenanceRequest.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
      await prisma.plannedMaintenance.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
      await prisma.calibrationRecord.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
      await prisma.assetTransfer.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
      await prisma.inventoryRecord.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
      await prisma.disposal.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
      await prisma.depreciation.deleteMany({ where: { assetId: { in: chunk } } }).catch(() => {});
    }
    log('[CNTT Sync] Cleared child references in related tables.');
  }

  // Also clean any unlinked maintenance requests for CNTT
  await prisma.maintenanceRequest.deleteMany({ where: { managingUnit: 'CNTT' } }).catch(() => {});

  // 3. Delete the old CNTT assets
  const deleted = await prisma.asset.deleteMany({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' },
        { assetCode: { startsWith: 'VT/' } },
        { assetCode: { startsWith: 'MI/' } },
        { assetCode: { startsWith: 'Laptop/' } },
        { assetCode: { startsWith: 'Scan/' } },
        { assetCode: { startsWith: 'CPU/' } },
        { assetCode: { startsWith: 'MH/' } }
      ]
    }
  });
  log(`[CNTT Sync] Deleted ${deleted.count} old CNTT asset records.`);

  // 4. In PostgreSQL, reset sequences before inserting
  if (isPg) {
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        DECLARE
          seq_name TEXT;
          max_id BIGINT;
        BEGIN
          seq_name := pg_get_serial_sequence('"Asset"', 'id');
          IF seq_name IS NOT NULL THEN
            EXECUTE 'SELECT COALESCE(MAX(id), 0) FROM "Asset"' INTO max_id;
            IF max_id > 0 THEN
              PERFORM setval(seq_name, max_id, true);
            END IF;
          END IF;
        END $$;
      `);
      log('[CNTT Sync] PostgreSQL sequence reset.');
    } catch (e: any) {
      log(`[CNTT Sync] Sequence reset notice: ${e.message}`);
    }
  }

  // 5. Insert clean assets using upsert with explicit ID
  let inserted = 0;
  for (const a of cnttAssets) {
    const assetData: any = {
      assetCode: a.assetCode,
      oldAssetCode: a.oldAssetCode || null,
      name: a.name,
      categoryId: 2,
      departmentId: a.departmentId,
      location: a.location,
      locationDetail: a.locationDetail,
      assignedTo: a.assignedTo,
      yearInUse: a.yearInUse,
      originalPrice: a.originalPrice,
      currentValue: a.currentValue,
      depreciationRate: a.depreciationRate,
      manufacturer: a.manufacturer,
      countryOfOrigin: a.countryOfOrigin,
      specifications: a.specifications,
      status: a.status || 'DANG_SU_DUNG',
      managingUnit: 'CNTT',
      floor: a.floor,
      buildingAsset: a.buildingAsset || 0,
      bookQuantity: a.bookQuantity || 1,
      actualQuantity: a.actualQuantity || 1,
      quantityDifference: a.quantityDifference || 0,
      source: a.source || 'Ngân sách',
      fundingSource: a.fundingSource,
      decisionNumber: a.decisionNumber,
      note: a.note,
      qrCode: a.qrCode || `QR-CNTT-${a.assetCode.replace(/[\/\s]/g, '-')}`
    };

    try {
      await prisma.asset.upsert({
        where: { id: a.id },
        update: assetData,
        create: {
          id: a.id,
          ...assetData
        }
      });
      inserted++;
    } catch (err: any) {
      log(`[CNTT Sync] Upsert retry for ${a.assetCode} (ID ${a.id}): ${err.message}`);
      try {
        await prisma.asset.create({
          data: assetData
        });
        inserted++;
      } catch (err2: any) {
        log(`[CNTT Sync] FAILED creating ${a.assetCode}: ${err2.message}`);
      }
    }
  }

  // 6. Final PostgreSQL sequence reset to MAX(id)
  if (isPg) {
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        DECLARE
          seq_name TEXT;
          max_id BIGINT;
        BEGIN
          seq_name := pg_get_serial_sequence('"Asset"', 'id');
          IF seq_name IS NOT NULL THEN
            EXECUTE 'SELECT COALESCE(MAX(id), 0) FROM "Asset"' INTO max_id;
            IF max_id > 0 THEN
              PERFORM setval(seq_name, max_id, true);
            END IF;
          END IF;
        END $$;
      `);
    } catch {}
  }

  const finalTotal = await prisma.asset.count({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  });

  const finalPkdk = await prisma.asset.count({
    where: {
      departmentId: 1,
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  });

  log(`[CNTT Sync] Finished: Inserted ${inserted}/${cnttAssets.length} assets. Final in DB: Total CNTT = ${finalTotal}, PKDK CNTT = ${finalPkdk}`);
  return { ok: true, synced: inserted, total: finalTotal, pkdk: finalPkdk };
}
