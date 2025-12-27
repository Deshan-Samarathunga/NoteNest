import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const authRouter = Router();

const credsSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const JWT_SECRET = process.env.SESSION_SECRET || 'dev-secret';
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'demo';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'demo123';

authRouter.post('/login', (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }
  const { username, password } = parsed.data;
  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, expiresIn: 7200 });
});

export default authRouter;
