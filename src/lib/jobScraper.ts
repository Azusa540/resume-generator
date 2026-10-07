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

const ZYTE_EXTRACT_URL = 'https://api.zyte.com/v1/extract';
const MIN_PROBABILITY = 0.5;

interface ZyteJobPosting {
  jobTitle?: string;
  description?: string;
  descriptionHtml?: string;
  hiringOrganization?: { name?: string };
  metadata?: { probability?: number };
}

interface ZyteExtractResponse {
  status?: number;
  title?: string;
  detail?: string;
  jobPosting?: ZyteJobPosting;
}

function zyteAuthorization(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

function plainDescription(posting: ZyteJobPosting): string {
  const text = posting.description?.trim() ?? '';
  if (text.length >= 50) return text;
  const html = posting.descriptionHtml?.trim();
  if (!html) return text;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > text.length ? stripped : text;
}

function confidenceFor(probability: number | undefined): ScrapedJob['confidence'] {
  if (probability === undefined) return 'medium';
  if (probability >= 0.8) return 'high';
  if (probability >= MIN_PROBABILITY) return 'medium';
  return 'low';
}

export async function scrapeJobLink(url: string): Promise<ScrapedJob> {
  const apiKey = process.env.ZYTE_API_KEY;
  if (!apiKey) throw new JobScrapeError('Job scraping is not configured (missing ZYTE_API_KEY).', 500);

  let res: Response;
  try {
    res = await fetch(ZYTE_EXTRACT_URL, {
      method: 'POST',
      headers: {
        Authorization: zyteAuthorization(apiKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        url,
        jobPosting: true,
        jobPostingOptions: { extractFrom: 'browserHtml' },
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    console.error(
      isTimeout ? '[jobScraper] Timed out reaching Zyte:' : '[jobScraper] Network error reaching Zyte:',
      { url, err }
    );
    throw isTimeout
      ? new JobScrapeError('The job scraping service took too long to respond. Please try again.', 504)
      : new JobScrapeError('Could not reach the job scraping service.', 502);
  }

  const rawBody = await res.text().catch(() => '');
  const parsedBody = (() => {
    try {
      return JSON.parse(rawBody) as ZyteExtractResponse;
    } catch {
      return null;
    }
  })();

  if (!res.ok) {
    console.error('[jobScraper] Zyte returned an error:', {
      url,
      status: res.status,
      statusText: res.statusText,
      title: parsedBody?.title,
      detail: parsedBody?.detail,
      rawBody: rawBody.slice(0, 1000),
    });
    if (res.status === 401 || res.status === 403) {
      throw new JobScrapeError('Job scraping is misconfigured.', 500);
    }
    if (res.status === 429) {
      throw new JobScrapeError('The job scraping service is rate-limited right now. Please try again.', 429);
    }
    throw new JobScrapeError('Failed to scrape the job link.', 502);
  }

  const posting = parsedBody?.jobPosting;
  const probability = posting?.metadata?.probability;
  if (!posting || (typeof probability === 'number' && probability < MIN_PROBABILITY)) {
    console.error('[jobScraper] Zyte response was not a usable job posting:', {
      url,
      probability,
      jobTitle: posting?.jobTitle,
      companyName: posting?.hiringOrganization?.name,
      jobDescriptionLen: posting?.description?.length ?? 0,
    });
    throw new JobScrapeError(
      'Could not extract enough job details from this link. Try a different link or check that the posting is still live.',
      422
    );
  }

  const jobTitle = posting.jobTitle?.trim() ?? '';
  const companyName = posting.hiringOrganization?.name?.trim() ?? '';
  const jobDescription = plainDescription(posting);
  const confidence = confidenceFor(probability);

  if (jobTitle.length < 2 || companyName.length < 2 || jobDescription.length < 50) {
    console.error('[jobScraper] Scrape succeeded but returned empty/insufficient content:', {
      url,
      probability,
      confidence,
      jobTitle,
      companyName,
      jobDescriptionLen: jobDescription.length,
    });
    throw new JobScrapeError(
      'Could not extract enough job details from this link. Try a different link or check that the posting is still live.',
      422
    );
  }

  let source = 'unknown';
  try {
    source = new URL(url).hostname;
  } catch {
    source = 'unknown';
  }

  return {
    url,
    source,
    companyName,
    jobTitle,
    jobDescription,
    confidence,
    warning: confidence === 'medium' ? 'Extraction confidence is only medium.' : undefined,
  };
}
