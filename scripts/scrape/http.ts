// Polite HTTP client for VLR.gg: one request at a time, a fixed gap between
// requests, and retries with backoff on errors and rate limiting.

export const BASE_URL = "https://www.vlr.gg";

const USER_AGENT =
  "vlr-compare-scraper/0.1 (+https://github.com/tamjeedali47/vlr-compare; hobby project, cached nightly)";
const MIN_GAP_MS = 1500;
const MAX_ATTEMPTS = 5;

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();
export let requestCount = 0;

/** Fetches a VLR.gg page (absolute URL or path) and returns its HTML. */
export function fetchHtml(pathOrUrl: string): Promise<string> {
  // Chain onto the queue so requests never overlap, even if called in parallel.
  const job = queue.then(() => fetchWithRetry(new URL(pathOrUrl, BASE_URL).toString()));
  queue = job.catch(() => undefined);
  return job;
}

async function fetchWithRetry(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const wait = lastRequestAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    requestCount++;

    let retryAfterMs = 0;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return await res.text();
      lastError = new HttpError(res.status, url);
      // Client errors other than rate limiting won't fix themselves.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw lastError;
      const retryAfter = Number(res.headers.get("retry-after"));
      if (retryAfter > 0) retryAfterMs = retryAfter * 1000;
    } catch (err) {
      if (err instanceof HttpError && err.status !== 429 && err.status < 500) throw err;
      lastError = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      const backoff = Math.max(retryAfterMs, 5000 * 2 ** (attempt - 1));
      console.warn(`  ! ${describe(lastError)} — retrying in ${backoff / 1000}s (${attempt}/${MAX_ATTEMPTS - 1})`);
      await sleep(backoff);
    }
  }
  throw lastError;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
