import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { createGreeting } from '@stationery/shared';
import { db, healthChecks } from '../db/client.js';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  greeting: z.string(),
  checks: z.array(
    z.object({
      id: z.number(),
      note: z.string()
    })
  )
});

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const greeting = createGreeting('from the API');

  db.insert(healthChecks).values({ note: greeting }).run();
  const checks = db.select().from(healthChecks).all();

  const payload = healthResponseSchema.parse({
    status: 'ok' as const,
    greeting,
    checks
  });

  res.json(payload);
});

export { router as healthRouter };
