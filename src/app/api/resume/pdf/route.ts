import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getUser } from '@/lib/auth';
import { pdfFromHtml, PdfBusyError } from '@/lib/pdfFromHtml';

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { html, profileId, fileName } = await req.json();
  if (!html) return NextResponse.json({ message: 'Missing html' }, { status: 400 });

  let pdf: Buffer;
  try {
    pdf = await pdfFromHtml(html);
  } catch (err) {
    if (err instanceof PdfBusyError) {
      return NextResponse.json({ message: err.message }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : 'PDF generation failed';
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  // Save to uploads/resumes/{userId}/{profileId}/{fileName}.pdf
  if (profileId && fileName) {
    try {
      const safeFileName = fileName.replace(/[^a-zA-Z0-9_\-. ()]/g, '_');
      const dir = path.join(process.cwd(), 'uploads', 'resumes', user.id, profileId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `${safeFileName}.pdf`), pdf);
    } catch {
      // Disk backup is best-effort; still return the PDF
    }
  }

  return new NextResponse(pdf.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName ?? 'resume'}.pdf"`,
    },
  });
}
