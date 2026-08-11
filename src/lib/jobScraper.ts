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

  return (await res.json()) as ScrapedJob;
}
