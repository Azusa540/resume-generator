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
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    console.error(
      isTimeout ? '[jobScraper] Timed out reaching scraping service:' : '[jobScraper] Network error reaching scraping service:',
      { url, endpoint, err }
    );
    throw isTimeout
      ? new JobScrapeError('The job scraping service took too long to respond. Please try again.', 504)
      : new JobScrapeError('Could not reach the job scraping service.', 502);
  }

  if (!res.ok) {
    const rawBody = await res.text().catch(() => '');
    const parsedBody = (() => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })();
    console.error('[jobScraper] Scraping service returned an error:', {
      url,
      status: res.status,
      statusText: res.statusText,
      rawBody: rawBody.slice(0, 1000),
    });
    throw new JobScrapeError(parsedBody?.message || parsedBody?.error || 'Failed to scrape the job link.', res.status);
  }

  const scraped = (await res.json()) as ScrapedJob;

  // A "successful" scrape can still return near-empty content (a JS-rendered page the
  // scraper couldn't parse, a login wall, a dead posting). That gives the resume model
  // nothing real to work with, so treat it as a scrape failure here rather than letting
  // empty/garbage content reach the caller.
  if (scraped.jobTitle.trim().length < 2 || scraped.companyName.trim().length < 2 || scraped.jobDescription.trim().length < 50) {
    console.error('[jobScraper] Scrape succeeded but returned empty/insufficient content:', {
      url,
      source: scraped.source,
      confidence: scraped.confidence,
      warning: scraped.warning,
      jobTitle: scraped.jobTitle,
      companyName: scraped.companyName,
      jobDescriptionLen: scraped.jobDescription?.length ?? 0,
    });
    throw new JobScrapeError(
      'Could not extract enough job details from this link. Try a different link or check that the posting is still live.',
      422
    );
  }

  return scraped;
}
