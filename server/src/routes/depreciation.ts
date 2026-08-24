import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/:assetId', requireAuth, async (req, res) => {
  try {
    const history = await prisma.depreciation.findMany({
      where: { assetId: parseInt(req.params.assetId) },
      orderBy: { year: 'asc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/calculate', requireAuth, async (req, res) => {
  const { assetId, year } = req.body;
  try {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.originalPrice || !asset.depreciationRate || !asset.yearInUse) {
      return res.status(400).json({ error: 'Asset missing depreciation parameters' });
    }

    const currentYear = year || new Date().getFullYear();
    const yearsInUse = currentYear - asset.yearInUse + 1;
    if (yearsInUse < 1) return res.status(400).json({ error: 'Invalid year' });

    const depreciationAmount = (asset.originalPrice * asset.depreciationRate) / 100;
    let accumulatedDepreciation = depreciationAmount * yearsInUse;
    
    if (accumulatedDepreciation > asset.originalPrice) {
      accumulatedDepreciation = asset.originalPrice;
    }

    const remainingValue = asset.originalPrice - accumulatedDepreciation;

    const depreciation = await prisma.depreciation.create({
      data: {
        assetId,
        year: currentYear,
        depreciationAmount,
        accumulatedDepreciation,
        remainingValue
      }
    });

    await prisma.asset.update({
      where: { id: assetId },
      data: { currentValue: remainingValue }
    });

    res.status(201).json(depreciation);
  } catch (error) {
    res.status(400).json({ error: 'Error calculating depreciation' });
  }
});

router.post('/calculate-all', requireAuth, async (req, res) => {
  const { year } = req.body;
  const currentYear = year || new Date().getFullYear();

  try {
    const assets = await prisma.asset.findMany({
      where: {
        originalPrice: { not: null },
        depreciationRate: { not: null },
        yearInUse: { not: null },
        status: { notIn: ['DA_THANH_LY'] }
      }
    });

    const results = [];
    for (const asset of assets) {
      if (!asset.originalPrice || !asset.depreciationRate || !asset.yearInUse) continue;
      
      const yearsInUse = currentYear - asset.yearInUse + 1;
      if (yearsInUse < 1) continue;

      const depreciationAmount = (asset.originalPrice * asset.depreciationRate) / 100;
      let accumulatedDepreciation = depreciationAmount * yearsInUse;
      if (accumulatedDepreciation > asset.originalPrice) {
        accumulatedDepreciation = asset.originalPrice;
      }
      const remainingValue = asset.originalPrice - accumulatedDepreciation;

      const record = await prisma.depreciation.create({
        data: {
          assetId: asset.id,
          year: currentYear,
          depreciationAmount,
          accumulatedDepreciation,
          remainingValue
        }
      });

      await prisma.asset.update({
        where: { id: asset.id },
        data: { currentValue: remainingValue }
      });

      results.push(record);
    }
    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ error: 'Error calculating all depreciation' });
  }
});

export default router;
