import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { AUTH_PASSWORD, AUTH_USERNAME, JWT_SECRET } from '../config';

const authRouter = Router();

const credsSchema = z.object({
  username: z.string(),
  password: z.string(),
});

authRouter.post('/login', (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_credentials' });
  }
  const { username, password } = parsed.data;
  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const token = jwt.sign({ sub: username }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '2h' });
  res.json({ token, expiresIn: 7200 });
});

export default authRouter;
