export interface ScrapedJob {
  url: string;
  source: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  confidence: 'high' | 'medium' | 'low';
  warning?: string;
}

export class JobScrapeError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function scrapeJobLink(url: string): Promise<ScrapedJob> {
  const apiKey = process.env.DEVORA21_API_KEY;
  if (!apiKey) throw new JobScrapeError('Job scraping is not configured (missing DEVORA21_API_KEY).', 500);

  const endpoint = process.env.DEVORA21_SCRAPE_URL || 'https://api.devora21.com/jobs/scrape';

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new JobScrapeError('Could not reach the job scraping service.', 502);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new JobScrapeError(body?.message || body?.error || 'Failed to scrape the job link.', res.status);
  }

  const scraped = (await res.json()) as ScrapedJob;

  // A "successful" scrape can still return near-empty content (a JS-rendered page the
  // scraper couldn't parse, a login wall, a dead posting). That gives the resume model
  // nothing real to work with, so treat it as a scrape failure here rather than letting
  // empty/garbage content reach the caller.
  if (scraped.jobTitle.trim().length < 2 || scraped.companyName.trim().length < 2 || scraped.jobDescription.trim().length < 50) {
    throw new JobScrapeError(
      'Could not extract enough job details from this link. Try a different link or check that the posting is still live.',
      422
    );
  }

  return scraped;
}
