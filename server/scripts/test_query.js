const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const count = await prisma.asset.count();
    console.log('Total asset count in DB:', count);

    const user = await prisma.user.findFirst();
    console.log('Sample user:', user);

    const assets = await prisma.asset.findMany({
      take: 5,
      include: {
        category: true,
        department: true
      }
    });
    console.log('Fetched assets successfully. First asset:', assets[0]?.name, assets[0]?.assetCode);
  } catch (err) {
    console.error('ERROR during Prisma test:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
