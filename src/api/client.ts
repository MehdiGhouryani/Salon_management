/**
 * NobatAra centralized frontend API client (Phase 11).
 *
 * One typed wrapper for every customer-surface server call:
 *  - same-origin base URL (no secrets ever live in frontend config)
 *  - cookie credentials included (session + booking grants stay server-side)
 *  - CSRF header on every mutation (`X-NobatAra-Client`), matching the
 *    server's csrfProtection contract
 *  - hard timeout per request (AbortSignal) so a hung server cannot freeze UI
 *  - consistent error object: ApiError { status, code, message }
 *  - safe JSON parsing (HTML/empty bodies never throw uncontrolled)
 */

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Extra headers (e.g. X-NobatAra-Booking-Grant). */
  headers?: Record<string, string>;
  /** AbortSignal from the caller for cancellation (composed with the timeout). */
  signal?: AbortSignal;
  /** Timeout in ms (default 15000). */
  timeoutMs?: number;
}

const CSRF_HEADER = 'X-NobatAra-Client';
const CSRF_VALUE = 'web';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function parseResponseBody(res: Response): Promise<{ ok: boolean; data: any }> {
  const text = await res.text();
  if (!text) return { ok: res.ok, data: null };
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    // Non-JSON body (proxy error page, HTML) — do not crash the UI.
    return { ok: res.ok, data: null };
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, signal, timeoutMs = 15_000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort);

  try {
    const res = await fetch(path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(MUTATING.has(method) ? { [CSRF_HEADER]: CSRF_VALUE } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const { ok, data } = await parseResponseBody(res);

    if (!ok) {
      throw new ApiError(
        res.status,
        (data && (data.error?.code || data.error)) || `HTTP_${res.status}`,
        (data && (data.message || data.error?.message)) ||
          (res.status === 503
            ? 'سامانه در دسترس نیست. لطفاً دقایقی دیگر تلاش کنید.'
            : 'درخواست با خطا مواجه شد.')
      );
    }
    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'پاسخی از سرور دریافت نشد (تایم‌اوت). لطفاً دوباره تلاش کنید.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}

/** Convenience verbs for the customer surface. */
export const api = {
  get: <T = any>(path: string, opts?: Omit<ApiRequestOptions, 'method'>) => apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T = any>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T = any>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T = any>(path: string, body?: unknown, opts?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T = any>(path: string, opts?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
