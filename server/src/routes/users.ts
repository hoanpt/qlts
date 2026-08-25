import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users - Danh sách toàn bộ tài khoản người dùng (Admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        department: true
      },
      orderBy: { id: 'asc' }
    });

    const sanitizedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      departmentId: u.departmentId,
      department: u.department,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Lỗi khi tải danh sách người dùng' });
  }
});

// POST /api/users - Tạo tài khoản người dùng mới (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, role, departmentId } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ: Tên đăng nhập, Mật khẩu, Họ tên và Phân quyền' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { username: cleanUsername } });
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập này đã tồn tại trên hệ thống' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
        fullName: fullName.trim(),
        role: role,
        departmentId: departmentId ? parseInt(departmentId) : null
      },
      include: {
        department: true
      }
    });

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      departmentId: newUser.departmentId,
      department: newUser.department
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Lỗi khi tạo người dùng' });
  }
});

// PUT /api/users/:id - Cập nhật thông tin & phân quyền tài khoản (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fullName, role, departmentId, username } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (role) updateData.role = role;
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId ? parseInt(departmentId) : null;
    }
    if (username && username.trim().toLowerCase() !== user.username) {
      const existing = await prisma.user.findFirst({ where: { username: username.trim().toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'Tên đăng nhập mới đã có người sử dụng' });
      }
      updateData.username = username.trim().toLowerCase();
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { department: true }
    });

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      departmentId: updatedUser.departmentId,
      department: updatedUser.department
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật người dùng' });
  }
});

// PUT /api/users/:id/reset-password - Admin đặt lại mật khẩu cho user (Admin only)
router.put('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    res.json({ message: `Đặt lại mật khẩu cho tài khoản ${user.username} thành công!` });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Lỗi khi đặt lại mật khẩu' });
  }
});

// DELETE /api/users/:id - Xóa người dùng (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const currentUser = req.user;

    if (currentUser.id === id) {
      return res.status(400).json({ error: 'Không thể tự xóa tài khoản đang đăng nhập của chính bạn' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    if (user.username === 'admin') {
      return res.status(400).json({ error: 'Không thể xóa tài khoản Quản trị viên tối cao (admin)' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: `Đã xóa tài khoản ${user.username} thành công!` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Lỗi khi xóa người dùng' });
  }
});

export default router;
