import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Response } from 'express';

export interface PdfResponseOptions {
  filename: string;
  disposition?: 'inline' | 'attachment';
}

export async function storePdfBuffer(buffer: Buffer, filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return filePath;
}

export function sendPdfBuffer(res: Response, buffer: Buffer, options: PdfResponseOptions) {
  const disposition = options.disposition ?? 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${options.filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

export async function maybePreviewPdf(buffer: Buffer, invoiceNo: string) {
  const previewRoot = process.env.PDF_PREVIEW_DIR;
  if (!previewRoot) return null;
  const safeNumber = invoiceNo.replace(/[^\w-]+/g, '_');
  const fileName = `${safeNumber || 'invoice'}-preview-${Date.now()}.pdf`;
  const previewPath = path.join(previewRoot, fileName);
  await storePdfBuffer(buffer, previewPath);
  return previewPath;
}
