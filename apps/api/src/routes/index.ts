import { Router } from 'express';

import { customersRouter } from './customers.js';
import { healthRouter } from './health.js';
import { invoicesRouter } from './invoices.js';
import { paymentsRouter } from './payments.js';
import { productsRouter } from './products.js';
import { reportsRouter } from './reports.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/invoices', invoicesRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/reports', reportsRouter);

export { apiRouter };
