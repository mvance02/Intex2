const API_URL = import.meta.env.VITE_API_URL ?? '';

/** Strip "Lighthouse " prefix from safehouse names for cleaner display */
export function displaySafehouseName(name: string | null | undefined): string {
  if (!name) return '—';
  return name.replace(/^Lighthouse\s+/i, '');
}
const DEFAULT_TIMEOUT_MS = 15_000;
const LONG_TIMEOUT_MS = 120_000;

const LONG_TIMEOUT_PATHS = ['/predict/social/optimize', '/predict/social/weekly-schedule'];

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const timeout = LONG_TIMEOUT_PATHS.some(p => path.includes(p)) ? LONG_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be starting up — please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
