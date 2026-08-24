import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create Categories
  const categories = [
    { code: 'TBVP', name: 'Trang thiết bị văn phòng / Y tế' },
    { code: 'CNTT', name: 'Thiết bị Công nghệ thông tin' },
    { code: 'DUOC', name: 'Thiết bị Dược - Vật tư y tế' }
  ];
  for (const cat of categories) {
    await prisma.assetCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  // Create Departments
  const departments = [
    { code: 'PKDK', name: 'Phòng Khám Đa Khoa', location: 'Cơ sở 1' },
    { code: 'XN', name: 'Khoa Xét Nghiệm - CĐHA - TDCN', location: 'Cơ sở 1' },
    { code: 'BNN', name: 'Khoa Bệnh Nghề Nghiệp', location: 'Cơ sở 1' },
    { code: 'DD', name: 'Khoa Dinh Dưỡng', location: 'Cơ sở 1' },
    { code: 'SKMT', name: 'Khoa Sức Khỏe Môi Trường', location: 'Cơ sở 1' },
    { code: 'SKSS', name: 'Khoa Sức Khỏe Sinh Sản', location: 'Cơ sở 1' },
    { code: 'KHNV', name: 'Phòng Kế Hoạch Nghiệp Vụ', location: 'Cơ sở 1' },
    { code: 'TTGDSK', name: 'Khoa Truyền Thông Giáo Dục Sức Khỏe', location: 'Cơ sở 1' },
    { code: 'KSTCT', name: 'Khoa Ký Sinh Trùng Côn Trùng', location: 'Cơ sở 1' },
    { code: 'PCBKLN', name: 'Khoa Phòng Chống Bệnh Không Lây Nhiễm', location: 'Cơ sở 1' },
    { code: 'DVTYT', name: 'Khoa Dược - Vật Tư Y Tế', location: 'Cơ sở 1' },
    { code: 'HIV', name: 'Khoa HIV/AIDS và QLĐTNC', location: 'Cơ sở 1' },
    { code: 'PCBTN', name: 'Khoa Phòng Chống Bệnh Truyền Nhiễm', location: 'Cơ sở 2' },
    { code: 'TCKT', name: 'Phòng Tài Chính - Kế Toán', location: 'Cơ sở 1' },
    { code: 'TCHC', name: 'Phòng Tổ Chức Hành Chính', location: 'Cơ sở 1' },
    { code: 'KDYTQT', name: 'Khoa Kiểm Dịch Y Tế Quốc Tế', location: 'Cơ sở 1' }
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      fullName: 'Administrator',
      role: 'ADMIN'
    }
  });

  // Create Department Users
  for (const dept of departments) {
    const deptRecord = await prisma.department.findUnique({ where: { code: dept.code } });
    if (deptRecord) {
      const username = dept.code.toLowerCase();
      const password = await bcrypt.hash('123456', 10);
      await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          username,
          password,
          fullName: dept.name,
          role: 'DEPARTMENT',
          departmentId: deptRecord.id
        }
      });
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
