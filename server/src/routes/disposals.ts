import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// List all disposal campaigns / notices
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const campaigns: any = await prisma.$queryRaw`
      SELECT * FROM DisposalCampaign ORDER BY startDate DESC
    `;
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching disposal campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new disposal campaign / notice
router.post('/campaigns', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { title, campaignCode, startDate, endDate, description, issuedBy } = req.body;
    const now = new Date().toISOString();
    await prisma.$executeRaw`
      INSERT INTO DisposalCampaign (title, campaignCode, startDate, endDate, status, description, issuedBy, createdAt, updatedAt)
      VALUES (${title}, ${campaignCode || `TB-TL-${Date.now()}`}, ${startDate || now}, ${endDate || null}, 'OPEN', ${description || ''}, ${issuedBy || 'Ban Giám Đốc CDC Đà Nẵng'}, ${now}, ${now})
    `;
    res.status(201).json({ message: 'Tạo thông báo đợt thanh lý thành công' });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(400).json({ error: 'Error creating campaign' });
  }
});

// List all disposal proposals with filtering
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const { status, managingUnit, departmentId } = req.query;
    const disposals = await prisma.disposal.findMany({
      include: {
        asset: { 
          include: { 
            department: true,
            category: true
          } 
        }
      },
      orderBy: { proposedDate: 'desc' }
    });

    let enforcedUnit = managingUnit;
    let enforcedDept = departmentId;

    if (req.user?.role === 'MANAGER_CNTT') {
      enforcedUnit = 'CNTT';
    } else if (req.user?.role === 'MANAGER_DUOC') {
      enforcedUnit = 'DUOC';
    } else if (req.user?.role === 'MANAGER_TCHC') {
      enforcedUnit = 'TCHC';
    } else if (req.user?.role === 'DEPARTMENT' && req.user.departmentId) {
      enforcedDept = req.user.departmentId.toString();
    }

    let filtered = disposals;
    if (status && status !== 'ALL') {
      filtered = filtered.filter(d => d.status === status);
    }
    if (enforcedUnit && enforcedUnit !== 'ALL') {
      filtered = filtered.filter(d => (d.asset as any)?.managingUnit === enforcedUnit);
    }
    if (enforcedDept && enforcedDept !== 'ALL') {
      filtered = filtered.filter(d => d.asset?.departmentId === parseInt(enforcedDept as string));
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching disposals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create disposal proposal(s) (submitted by Department / Khoa phòng - supports single or multiple assets)
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const { assetId, assetIds, reason, proposedBy, campaignName, departmentId } = req.body;
    
    let ids: number[] = [];
    if (Array.isArray(assetIds) && assetIds.length > 0) {
      ids = assetIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
    } else if (assetId && !isNaN(parseInt(assetId))) {
      ids = [parseInt(assetId)];
    }

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một thiết bị cần gửi đề xuất thanh lý' });
    }

    const proposer = proposedBy || req.user?.fullName || req.user?.username || 'Cán bộ Khoa/Phòng';
    const dept = departmentId ? parseInt(departmentId) : (req.user?.departmentId || 1);
    const defaultReason = reason || 'Hư hỏng không thể phục hồi, chi phí sửa chữa không hiệu quả kinh tế';
    const campaign = campaignName || 'Đợt 1/2026 - Rà soát & Thanh lý tài sản đầu năm';

    const createdDisposals: any[] = [];

    for (const id of ids) {
      // Create disposal record
      const disposal = await prisma.disposal.create({
        data: {
          assetId: id,
          reason: defaultReason,
          proposedBy: proposer,
          status: 'PROPOSED',
          proposedDate: new Date()
        }
      });

      // Update asset status to CHO_THANH_LY
      await prisma.asset.update({
        where: { id },
        data: { status: 'CHO_THANH_LY' }
      });

      // Update campaignName and departmentId
      await prisma.$executeRaw`
        UPDATE Disposal 
        SET campaignName = ${campaign},
            departmentId = ${dept}
        WHERE id = ${disposal.id}
      `;

      createdDisposals.push(disposal);
    }

    res.status(201).json({
      message: `Đã gửi đề xuất thanh lý thành công cho ${createdDisposals.length} thiết bị`,
      count: createdDisposals.length,
      disposals: createdDisposals
    });
  } catch (error) {
    console.error('Error proposing disposal:', error);
    res.status(400).json({ error: 'Lỗi khi gửi đề xuất thanh lý' });
  }
});

// Technical Inspection: Record inspection result & assessment by managing unit (Dược / CNTT / TCHC)
router.put('/:id/inspect', requireAuth, async (req: any, res) => {
  try {
    const disposalId = parseInt(req.params.id);
    const { technicalAssessment, technicalInspector, disposalMethod, disposalPrice, note, decisionNumber, fundingSource } = req.body;
    const now = new Date().toISOString();

    await prisma.$executeRaw`
      UPDATE Disposal
      SET technicalAssessment = ${technicalAssessment || 'Hỏng nặng không thể phục hồi, chi phí sửa chữa không hiệu quả'},
          technicalInspector = ${technicalInspector || req.user?.fullName || 'Cán bộ kỹ thuật chuyên trách'},
          inspectionDate = ${now},
          disposalMethod = ${disposalMethod || 'Bán phế liệu'},
          disposalPrice = ${disposalPrice ? parseFloat(disposalPrice) : null},
          decisionNumber = ${decisionNumber || 'QĐ số 45/QĐ-TTKSBT'},
          fundingSource = ${fundingSource || 'Nộp NSNN / Quỹ PTHĐSN'},
          note = ${note || null},
          status = 'INSPECTED',
          updatedAt = ${now}
      WHERE id = ${disposalId}
    `;

    res.json({ message: 'Đã lập biên bản kiểm tra kỹ thuật thành công' });
  } catch (error) {
    console.error('Error inspecting disposal:', error);
    res.status(400).json({ error: 'Lỗi khi lưu kết quả kiểm tra kỹ thuật' });
  }
});

// Approve disposal by Board (Hội đồng thanh lý duyệt)
router.put('/:id/approve', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const disposal = await prisma.disposal.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        status: 'APPROVED',
        approvedBy: req.body.approvedBy || 'Ông. Nguyễn Đại Vĩnh - Giám đốc',
        approvalDate: new Date()
      }
    });
    res.json(disposal);
  } catch (error) {
    res.status(400).json({ error: 'Error approving disposal' });
  }
});

// Complete disposal: Mark asset as DA_THANH_LY
router.put('/:id/complete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const disposalId = parseInt(req.params.id);
    const disposal = await prisma.disposal.findUnique({ where: { id: disposalId } });
    if (!disposal) return res.status(404).json({ error: 'Not found' });

    const result = await prisma.$transaction([
      prisma.disposal.update({
        where: { id: disposalId },
        data: { status: 'COMPLETED', disposalDate: new Date() }
      }),
      prisma.asset.update({
        where: { id: disposal.assetId },
        data: { status: 'DA_THANH_LY' }
      })
    ]);
    res.json(result[0]);
  } catch (error) {
    res.status(400).json({ error: 'Error completing disposal' });
  }
});

// Reject disposal proposal
router.put('/:id/reject', requireAuth, async (req: any, res) => {
  try {
    const disposalId = parseInt(req.params.id);
    const disposal = await prisma.disposal.findUnique({ where: { id: disposalId } });
    if (!disposal) return res.status(404).json({ error: 'Not found' });

    await prisma.$transaction([
      prisma.disposal.update({
        where: { id: disposalId },
        data: { status: 'REJECTED', note: req.body.reason || 'Từ chối thanh lý, chuyển phương án sửa chữa' }
      }),
      prisma.asset.update({
        where: { id: disposal.assetId },
        data: { status: 'BAO_TRI' }
      })
    ]);
    res.json({ message: 'Đã từ chối đề xuất thanh lý' });
  } catch (error) {
    res.status(400).json({ error: 'Error rejecting disposal' });
  }
});

export default router;
