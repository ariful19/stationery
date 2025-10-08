import { healthCheckSchema } from '@stationery/shared';
import { sql } from 'drizzle-orm';
import { Router } from 'express';

import { db, healthChecks } from '../db/client.js';
import { ApiError } from '../errors.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler((_req, res) => {
    let dbHealthy = true;

    try {
      db.select({ count: sql<number>`count(*)` })
        .from(healthChecks)
        .get();
    } catch (error) {
      console.error('Health check database probe failed', error);
      dbHealthy = false;
    }

    if (!dbHealthy) {
      throw new ApiError(503, 'service_unavailable', 'Database probe failed', {
        component: 'database',
      });
    }

    const payload = healthCheckSchema.parse({
      status: 'ok' as const,
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: [
        {
          name: 'database',
          status: 'pass' as const,
        },
      ],
    });

    res.json(payload);
  }),
);

export { router as healthRouter };
