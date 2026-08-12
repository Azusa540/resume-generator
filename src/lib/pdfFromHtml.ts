import puppeteer from 'puppeteer';
import { wrapResumePage } from '@/lib/resumeHtml';

const MAX_CONCURRENT = 3;
let active = 0;

export class PdfBusyError extends Error {
  constructor() {
    super('Server busy, please try again in a moment.');
    this.name = 'PdfBusyError';
  }
}

/** Render resume HTML fragment to PDF using the same pipeline as /api/resume/pdf. */
export async function pdfFromHtml(htmlFragment: string): Promise<Buffer> {
  if (active >= MAX_CONCURRENT) {
    throw new PdfBusyError();
  }
  active++;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const tab = await browser.newPage();
    await tab.setContent(wrapResumePage(htmlFragment), { waitUntil: 'load', timeout: 30000 });
    await tab.evaluateHandle('document.fonts.ready');
    const pdf = await tab.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '0', bottom: '20mm', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    active--;
    await browser?.close();
  }
}
