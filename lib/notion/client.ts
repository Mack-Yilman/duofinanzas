import { Client } from '@notionhq/client';
import pLimit from 'p-limit';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Limit concurrency to 2-3 to avoid hitting the ~3 req/sec rate limit of Notion API
const limit = pLimit(2);

/**
 * Executes a Notion API call with automatic retries for rate limits (429/529).
 */
export async function notionWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  return limit(async () => {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        if (error.code === 'rate_limited' || error.status === 429 || error.status === 529) {
          attempt++;
          if (attempt >= maxRetries) throw error;
          
          // Retry-After is usually in seconds
          const retryAfter = error.headers?.get?.('retry-after');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
          
          console.warn(`[Notion Rate Limit] Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error("Max retries exceeded");
  });
}

/**
 * Helper to fetch all pages of a Notion query, bypassing the 100-item limit.
 */
export async function queryAll<T = any>(
  queryFn: (cursor?: string) => Promise<{ results: T[]; next_cursor: string | null }>
): Promise<T[]> {
  const allResults: T[] = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notionWithRetry(() => queryFn(nextCursor));
    allResults.push(...response.results);
    if (response.next_cursor) {
      nextCursor = response.next_cursor;
    } else {
      hasMore = false;
    }
  }

  return allResults;
}

export default notion;
