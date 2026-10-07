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
const MAX_HTML_CHARS = 120_000;

interface ZyteExtractResponse {
  status?: number;
  title?: string;
  detail?: string;
  browserHtml?: string;
}

interface DeepSeekResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null };
  }>;
}

interface ExtractedPosting {
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
}

function zyteAuthorization(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

function pageHtmlForModel(html: string): { html: string; truncated: boolean } {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:src|srcset)="data:[^"]*"/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (cleaned.length <= MAX_HTML_CHARS) return { html: cleaned, truncated: false };
  return { html: cleaned.slice(0, MAX_HTML_CHARS), truncated: true };
}

function toPlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseExtractedPosting(content: string): ExtractedPosting {
  const jsonText = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(jsonText) as ExtractedPosting;
}

async function fetchBrowserHtml(url: string, apiKey: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ZYTE_EXTRACT_URL, {
      method: 'POST',
      headers: {
        Authorization: zyteAuthorization(apiKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url, browserHtml: true, includeIframes: true }),
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

  const html = parsedBody?.browserHtml?.trim() ?? '';
  if (html.length < 100) {
    console.error('[jobScraper] Zyte returned no page HTML:', { url, htmlLen: html.length });
    throw new JobScrapeError(
      'Could not extract enough job details from this link. Try a different link or check that the posting is still live.',
      422
    );
  }
  return html;
}

async function extractPosting(url: string, html: string, apiKey: string): Promise<ExtractedPosting> {
  const systemPrompt = `You extract one job posting from HTML and return JSON only.

EXAMPLE JSON OUTPUT:
{"companyName":"Alpaca","jobTitle":"Senior Sales Engineer","jobDescription":"About the role\\n\\nYou will support enterprise customers."}

Rules:
- companyName is the hiring employer shown on the page. Never return the job board name (Greenhouse, Lever, Recruitee, Ashby, Workday, LinkedIn).
- jobTitle is the posting's role title.
- jobDescription is the role description as plain text. Keep section headings and bullet points as separate lines. Omit the application form, cookie banner, and voluntary self-identification survey.
- If a field is not on the page, use an empty string.`;

  const body = {
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Job page URL: ${url}\n\nHTML:\n${html}` },
    ],
    response_format: { type: 'json_object' },
    thinking: { type: 'disabled' },
    max_tokens: 8000,
    temperature: 0,
  };

  const endpoint = `${(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      console.error(
        isTimeout ? '[jobScraper] Timed out reaching DeepSeek:' : '[jobScraper] Network error reaching DeepSeek:',
        { url, attempt, err }
      );
      throw isTimeout
        ? new JobScrapeError('The job parsing service took too long to respond. Please try again.', 504)
        : new JobScrapeError('Could not reach the job parsing service.', 502);
    }

    const rawBody = await res.text().catch(() => '');
    const parsed = (() => {
      try {
        return JSON.parse(rawBody) as DeepSeekResponse & { error?: { message?: string } };
      } catch {
        return null;
      }
    })();

    if (!res.ok) {
      console.error('[jobScraper] DeepSeek returned an error:', {
        url,
        attempt,
        status: res.status,
        message: parsed?.error?.message,
        rawBody: rawBody.slice(0, 1000),
      });
      if (res.status === 401 || res.status === 403) {
        throw new JobScrapeError('Job parsing is misconfigured.', 500);
      }
      if (res.status === 429) {
        throw new JobScrapeError('The job parsing service is rate-limited right now. Please try again.', 429);
      }
      throw new JobScrapeError('Failed to parse the job page.', 502);
    }

    const content = parsed?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) {
      console.error('[jobScraper] DeepSeek returned empty content:', { url, attempt });
      if (attempt === 1) continue;
      throw new JobScrapeError('Failed to parse the job page.', 502);
    }

    try {
      return parseExtractedPosting(content);
    } catch (err) {
      console.error('[jobScraper] DeepSeek JSON parse failed:', { url, attempt, err, content: content.slice(0, 500) });
      if (attempt === 1) continue;
      throw new JobScrapeError('Failed to parse the job page.', 502);
    }
  }

  throw new JobScrapeError('Failed to parse the job page.', 502);
}

export async function scrapeJobLink(url: string): Promise<ScrapedJob> {
  const zyteKey = process.env.ZYTE_API_KEY;
  if (!zyteKey) throw new JobScrapeError('Job scraping is not configured (missing ZYTE_API_KEY).', 500);
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (!deepseekKey) throw new JobScrapeError('Job parsing is not configured (missing DEEPSEEK_API_KEY).', 500);

  const browserHtml = await fetchBrowserHtml(url, zyteKey);
  const { html, truncated } = pageHtmlForModel(browserHtml);
  const extracted = await extractPosting(url, html, deepseekKey);

  const jobTitle = toPlainText(extracted.jobTitle ?? '');
  const companyName = toPlainText(extracted.companyName ?? '');
  const jobDescription = toPlainText(extracted.jobDescription ?? '');

  if (jobTitle.length < 2 || companyName.length < 2 || jobDescription.length < 50) {
    console.error('[jobScraper] Parsed page was missing job details:', {
      url,
      truncated,
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
    confidence: truncated ? 'medium' : 'high',
    warning: truncated ? 'The page HTML was truncated before parsing.' : undefined,
  };
}
