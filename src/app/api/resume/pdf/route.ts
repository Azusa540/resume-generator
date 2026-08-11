import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { getUser } from '@/lib/auth';

// Max simultaneous Puppeteer browser instances
const MAX_CONCURRENT = 3;
let active = 0;

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  if (active >= MAX_CONCURRENT) {
    return NextResponse.json({ message: 'Server busy, please try again in a moment.' }, { status: 503 });
  }
  active++;

  const { html, profileId, fileName } = await req.json();
  if (!html) return NextResponse.json({ message: 'Missing html' }, { status: 400 });

  const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;0,700;1,400&display=swap');
    body { margin: 0; padding: 0; background: #fff; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const tab = await browser.newPage();
    await tab.setContent(pageHtml, { waitUntil: 'load', timeout: 30000 });
    await tab.evaluateHandle('document.fonts.ready');
    const pdf = await tab.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '0', bottom: '20mm', left: '0' },
    });

    // Save to uploads/resumes/{userId}/{profileId}/{fileName}.pdf
    if (profileId && fileName) {
      const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-. ()]/g, '_');
      const dir = path.join(process.cwd(), 'uploads', 'resumes', user.id, profileId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${safeFileName}.pdf`), pdf);
    }

    return new NextResponse(pdf.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName ?? 'resume'}.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ message: msg }, { status: 500 });
  } finally {
    active--;
    await browser?.close();
  }
}
