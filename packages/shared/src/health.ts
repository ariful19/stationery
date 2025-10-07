import { z } from 'zod';
import { dateTimeStringSchema } from './common.js';

export const healthCheckSchema = z.object({
  status: z.literal('ok'),
  version: z.string().min(1),
  timestamp: dateTimeStringSchema,
  uptimeSeconds: z.number().min(0),
  checks: z.array(
    z.object({
      name: z.string().min(1),
      status: z.enum(['pass', 'fail']),
      message: z.string().optional()
    })
  )
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;

export const healthCheckExample: HealthCheck = {
  status: 'ok',
  version: '1.0.0',
  timestamp: '2024-01-01T00:00:00.000Z',
  uptimeSeconds: 1,
  checks: [
    {
      name: 'database',
      status: 'pass'
    }
  ]
};
