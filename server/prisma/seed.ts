import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed for CDC Da Nang asset management...');

  const dataPath = path.join(__dirname, 'initial-seed-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`[Seed] Error: Seed data file not found at ${dataPath}`);
    return;
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  // 1. Seed Asset Categories
  console.log(`[Seed] Seeding ${data.categories.length} categories...`);
  for (const cat of data.categories) {
    await prisma.assetCategory.upsert({
      where: { id: cat.id },
      update: { code: cat.code, name: cat.name, description: cat.description },
      create: { id: cat.id, code: cat.code, name: cat.name, description: cat.description }
    });
  }

  // 2. Seed Departments
  console.log(`[Seed] Seeding ${data.departments.length} departments...`);
  for (const dept of data.departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { code: dept.code, name: dept.name, location: dept.location, description: dept.description },
      create: { id: dept.id, code: dept.code, name: dept.name, location: dept.location, description: dept.description }
    });
  }

  // 3. Seed Users
  console.log(`[Seed] Seeding ${data.users.length} users...`);
  for (const user of data.users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
        password: user.password
      },
      create: {
        username: user.username,
        password: user.password,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId
      }
    });
  }

  // 4. Seed Committee Members
  if (data.committee && data.committee.length > 0) {
    console.log(`[Seed] Seeding ${data.committee.length} committee members...`);
    for (const mem of data.committee) {
      await prisma.inventoryCommitteeMember.upsert({
        where: { id: mem.id },
        update: {
          fullName: mem.fullName,
          position: mem.position,
          role: mem.role,
          departmentId: mem.departmentId,
          scope: mem.scope,
          isActive: mem.isActive,
          displayOrder: mem.displayOrder
        },
        create: {
          id: mem.id,
          fullName: mem.fullName,
          position: mem.position,
          role: mem.role,
          departmentId: mem.departmentId,
          scope: mem.scope,
          isActive: mem.isActive,
          displayOrder: mem.displayOrder
        }
      });
    }
  }

  // 5. Seed Assets (in chunks of 100)
  console.log(`[Seed] Seeding ${data.assets.length} assets...`);
  const chunkSize = 100;
  for (let i = 0; i < data.assets.length; i += chunkSize) {
    const chunk = data.assets.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((asset: any) =>
        prisma.asset.upsert({
          where: { id: asset.id },
          update: {
            assetCode: asset.assetCode,
            name: asset.name,
            categoryId: asset.categoryId,
            departmentId: asset.departmentId,
            location: asset.location,
            locationDetail: asset.locationDetail,
            assignedTo: asset.assignedTo,
            yearInUse: asset.yearInUse,
            originalPrice: asset.originalPrice,
            currentValue: asset.currentValue,
            depreciationRate: asset.depreciationRate,
            manufacturer: asset.manufacturer,
            countryOfOrigin: asset.countryOfOrigin,
            specifications: asset.specifications,
            status: asset.status,
            managingUnit: asset.managingUnit,
            floor: asset.floor,
            buildingAsset: asset.buildingAsset,
            bookQuantity: asset.bookQuantity,
            actualQuantity: asset.actualQuantity,
            quantityDifference: asset.quantityDifference,
            source: asset.source,
            fundingSource: asset.fundingSource,
            decisionNumber: asset.decisionNumber,
            note: asset.note,
            qrCode: asset.qrCode
          },
          create: {
            id: asset.id,
            assetCode: asset.assetCode,
            name: asset.name,
            categoryId: asset.categoryId,
            departmentId: asset.departmentId,
            location: asset.location,
            locationDetail: asset.locationDetail,
            assignedTo: asset.assignedTo,
            yearInUse: asset.yearInUse,
            originalPrice: asset.originalPrice,
            currentValue: asset.currentValue,
            depreciationRate: asset.depreciationRate,
            manufacturer: asset.manufacturer,
            countryOfOrigin: asset.countryOfOrigin,
            specifications: asset.specifications,
            status: asset.status,
            managingUnit: asset.managingUnit,
            floor: asset.floor,
            buildingAsset: asset.buildingAsset,
            bookQuantity: asset.bookQuantity,
            actualQuantity: asset.actualQuantity,
            quantityDifference: asset.quantityDifference,
            source: asset.source,
            fundingSource: asset.fundingSource,
            decisionNumber: asset.decisionNumber,
            note: asset.note,
            qrCode: asset.qrCode
          }
        })
      )
    );
    if ((i + chunkSize) % 500 === 0 || i + chunkSize >= data.assets.length) {
      console.log(`[Seed] Processed ${Math.min(i + chunkSize, data.assets.length)} / ${data.assets.length} assets...`);
    }
  }

  // 6. Seed Calibrations
  if (data.calibrations && data.calibrations.length > 0) {
    console.log(`[Seed] Seeding ${data.calibrations.length} calibration records...`);
    for (const cal of data.calibrations) {
      await prisma.calibrationRecord.upsert({
        where: { id: cal.id },
        update: {
          assetId: cal.assetId,
          calibrationDate: new Date(cal.calibrationDate),
          nextCalibrationDate: cal.nextCalibrationDate ? new Date(cal.nextCalibrationDate) : null,
          performedBy: cal.performedBy,
          vendor: cal.vendor,
          result: cal.result,
          certificateNumber: cal.certificateNumber,
          note: cal.note,
          serviceType: cal.serviceType,
          servicePackage: cal.servicePackage,
          cost: cal.cost,
          decisionNumber: cal.decisionNumber,
          acceptanceMembers: cal.acceptanceMembers,
          fundingSource: cal.fundingSource,
          deviceStatusAfter: cal.deviceStatusAfter,
          departmentLocation: cal.departmentLocation
        },
        create: {
          id: cal.id,
          assetId: cal.assetId,
          calibrationDate: new Date(cal.calibrationDate),
          nextCalibrationDate: cal.nextCalibrationDate ? new Date(cal.nextCalibrationDate) : null,
          performedBy: cal.performedBy,
          vendor: cal.vendor,
          result: cal.result,
          certificateNumber: cal.certificateNumber,
          note: cal.note,
          serviceType: cal.serviceType,
          servicePackage: cal.servicePackage,
          cost: cal.cost,
          decisionNumber: cal.decisionNumber,
          acceptanceMembers: cal.acceptanceMembers,
          fundingSource: cal.fundingSource,
          deviceStatusAfter: cal.deviceStatusAfter,
          departmentLocation: cal.departmentLocation
        }
      });
    }
  }

  // 7. Seed Maintenance / Repair records
  if (data.maintenance && data.maintenance.length > 0) {
    console.log(`[Seed] Seeding ${data.maintenance.length} maintenance/repair records...`);
    for (const m of data.maintenance) {
      await prisma.maintenanceRequest.upsert({
        where: { id: m.id },
        update: {
          assetId: m.assetId,
          requestedBy: m.requestedBy,
          contactPhone: m.contactPhone,
          departmentId: m.departmentId,
          managingUnit: m.managingUnit,
          locationDetail: m.locationDetail,
          issueDescription: m.issueDescription,
          priority: m.priority,
          status: m.status,
          repairCost: m.repairCost,
          repairVendor: m.repairVendor,
          repairNote: m.repairNote,
          technicianName: m.technicianName,
          maintenanceType: m.maintenanceType,
          servicePackage: m.servicePackage,
          replacementParts: m.replacementParts,
          acceptanceMembers: m.acceptanceMembers,
          fundingSource: m.fundingSource,
          decisionNumber: m.decisionNumber,
          deviceStatusAfter: m.deviceStatusAfter,
          proposalDate: m.proposalDate ? new Date(m.proposalDate) : null,
          approvalDate: m.approvalDate ? new Date(m.approvalDate) : null,
          requestDate: m.requestDate ? new Date(m.requestDate) : new Date(),
          completedDate: m.completedDate ? new Date(m.completedDate) : null
        },
        create: {
          id: m.id,
          assetId: m.assetId,
          requestedBy: m.requestedBy,
          contactPhone: m.contactPhone,
          departmentId: m.departmentId,
          managingUnit: m.managingUnit,
          locationDetail: m.locationDetail,
          issueDescription: m.issueDescription,
          priority: m.priority,
          status: m.status,
          repairCost: m.repairCost,
          repairVendor: m.repairVendor,
          repairNote: m.repairNote,
          technicianName: m.technicianName,
          maintenanceType: m.maintenanceType,
          servicePackage: m.servicePackage,
          replacementParts: m.replacementParts,
          acceptanceMembers: m.acceptanceMembers,
          fundingSource: m.fundingSource,
          decisionNumber: m.decisionNumber,
          deviceStatusAfter: m.deviceStatusAfter,
          proposalDate: m.proposalDate ? new Date(m.proposalDate) : null,
          approvalDate: m.approvalDate ? new Date(m.approvalDate) : null,
          requestDate: m.requestDate ? new Date(m.requestDate) : new Date(),
          completedDate: m.completedDate ? new Date(m.completedDate) : null
        }
      });
    }
  }

  // 8. Seed Campaigns
  if (data.campaigns && data.campaigns.length > 0) {
    console.log(`[Seed] Seeding ${data.campaigns.length} disposal campaigns...`);
    for (const c of data.campaigns) {
      await prisma.disposalCampaign.upsert({
        where: { id: c.id },
        update: {
          title: c.title,
          campaignCode: c.campaignCode,
          startDate: new Date(c.startDate),
          endDate: c.endDate ? new Date(c.endDate) : null,
          status: c.status,
          description: c.description,
          issuedBy: c.issuedBy
        },
        create: {
          id: c.id,
          title: c.title,
          campaignCode: c.campaignCode,
          startDate: new Date(c.startDate),
          endDate: c.endDate ? new Date(c.endDate) : null,
          status: c.status,
          description: c.description,
          issuedBy: c.issuedBy
        }
      });
    }
  }

  console.log('[Seed] Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
