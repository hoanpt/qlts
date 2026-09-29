import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export async function syncCnttRecords(prisma: PrismaClient, force: boolean = false) {
  console.log('[CNTT Sync] Starting resilient CNTT asset synchronization...');
  const isPg = (process.env.DATABASE_URL || '').toLowerCase().includes('postgres');

  // Check if sync is needed:
  // 1. If any CNTT asset has code starting with 'CNTT-' or 'CNTT -' or 'PC/'
  // 2. Or if force is true
  // 3. Or if total CNTT asset count is not 925
  const badAssetCount = await prisma.asset.count({
    where: {
      OR: [
        { assetCode: { startsWith: 'CNTT-' } },
        { assetCode: { startsWith: 'CNTT -' } },
        { assetCode: { startsWith: 'PC/' } }
      ]
    }
  });

  const currentCnttCount = await prisma.asset.count({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  });

  if (!force && badAssetCount === 0 && currentCnttCount === 925) {
    console.log('[CNTT Sync] CNTT assets are already clean and up-to-date (925 assets). No sync needed.');
    return { ok: true, synced: 0, message: 'Already up to date' };
  }

  console.log(`[CNTT Sync] Sync needed: badAssetCount=${badAssetCount}, currentCnttCount=${currentCnttCount}, force=${force}`);

  // Locate initial-seed-data.json
  const seedDataCandidates = [
    path.join(__dirname, '../prisma/initial-seed-data.json'),
    path.join(__dirname, '../../prisma/initial-seed-data.json'),
    path.join(process.cwd(), 'prisma/initial-seed-data.json'),
    path.join(process.cwd(), 'server/prisma/initial-seed-data.json')
  ];
  const foundSeed = seedDataCandidates.find(p => fs.existsSync(p));

  if (!foundSeed) {
    console.error('[CNTT Sync] Error: initial-seed-data.json not found!');
    return { ok: false, error: 'initial-seed-data.json not found' };
  }

  const raw = fs.readFileSync(foundSeed, 'utf-8');
  const data = JSON.parse(raw);
  const cnttAssets = data.assets.filter((a: any) => a.categoryId === 2 || a.managingUnit === 'CNTT');

  console.log(`[CNTT Sync] Found ${cnttAssets.length} clean CNTT assets in seed JSON to synchronize.`);

  // Delete old unreferenced CNTT assets
  await prisma.maintenanceRequest.deleteMany({
    where: {
      managingUnit: 'CNTT'
    }
  }).catch(() => {});

  const deleted = await prisma.asset.deleteMany({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  });
  console.log(`[CNTT Sync] Removed ${deleted.count} old CNTT records.`);

  // If PostgreSQL, reset sequence first
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
    } catch (e: any) {
      console.warn('[CNTT Sync] Notice resetting Asset sequence:', e.message);
    }
  }

  // Find max id
  const maxAsset = await prisma.asset.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  let nextId = (maxAsset?.id || 40000) + 1;

  // Insert in batches
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < cnttAssets.length; i += batchSize) {
    const batch = cnttAssets.slice(i, i + batchSize);
    for (const a of batch) {
      const assetData: any = {
        assetCode: a.assetCode,
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
        await prisma.asset.create({
          data: isPg ? assetData : { id: nextId++, ...assetData }
        });
        inserted++;
      } catch (err: any) {
        // Fallback with safe explicit ID
        const safeId = nextId++;
        await prisma.asset.create({
          data: {
            id: safeId,
            ...assetData
          }
        });
        inserted++;
      }
    }
  }

  // Final sequence reset for PostgreSQL
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

  const finalCount = await prisma.asset.count({
    where: {
      OR: [
        { categoryId: 2 },
        { managingUnit: 'CNTT' }
      ]
    }
  });

  console.log(`[CNTT Sync] Finished synchronization: inserted ${inserted} records. Total CNTT in DB: ${finalCount}`);
  return { ok: true, synced: inserted, total: finalCount };
}
