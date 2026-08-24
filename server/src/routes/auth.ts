import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const SECRET_KEY = 'qlts-cdc-danang-secret-key-2026';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/register', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, fullName, role, departmentId } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, fullName, role, departmentId }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Error creating user' });
  }
});

router.get('/me', requireAuth, async (req: any, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    departmentId: user.departmentId
  });
});

export default router;
