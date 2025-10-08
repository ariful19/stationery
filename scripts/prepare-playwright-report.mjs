import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const reportDir = join(process.cwd(), 'playwright-report');

rmSync(reportDir, { recursive: true, force: true });
mkdirSync(reportDir, { recursive: true });
