/**
 * NobatAra Unit Tests — Frontend API client (CATEGORY: unit/pure)
 * Uses a mocked global fetch; verifies timeout, CSRF header, credentials,
 * error contract, and safe parsing (vitest/jsdom-free via stub fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiError, api } from '../../src/api/client.ts';

const okResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('API client (unit)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends credentials and CSRF header on mutations, not on GET', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(okResponse({ success: true }));
    fetchMock.mockResolvedValueOnce(okResponse({ success: true }));

    await api.get('/x');
    const getCalls = fetchMock.mock.calls[0];
    expect(getCalls[1].credentials).toBe('include');
    expect(getCalls[1].headers['X-NobatAra-Client']).toBeUndefined();

    await api.post('/x', { a: 1 });
    const postCalls = fetchMock.mock.calls[1];
    expect(postCalls[1].method).toBe('POST');
    expect(postCalls[1].headers['X-NobatAra-Client']).toBe('web');
    expect(postCalls[1].headers['Content-Type']).toBe('application/json');
    expect(postCalls[1].body).toBe(JSON.stringify({ a: 1 }));
  });

  it('maps structured server errors into ApiError with code/message/status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(okResponse({ success: false, error: 'SLOT_ALREADY_TAKEN', message: 'تداخل' }, 409))
    );
    await expect(apiRequest('/x')).rejects.toMatchObject({
      status: 409,
      code: 'SLOT_ALREADY_TAKEN',
      message: 'تداخل',
    });
  });

  it('parses nested error shapes (error as object) safely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        okResponse({ success: false, error: { code: 'API_ENDPOINT_NOT_FOUND', message: 'یافت نشد' } }, 404)
      )
    );
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 404, code: 'API_ENDPOINT_NOT_FOUND' });
  });

  it('non-JSON error body still yields a controlled ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('<html>proxy error</html>', { status: 502 }))
    );
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 502, code: 'HTTP_502' });
  });

  it('network failure becomes NETWORK_ERROR (status 0)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('timeout aborts the request and maps to TIMEOUT', async () => {
    let abortSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementationOnce((_url: string, init: any) => {
        abortSignal = init.signal;
        return new Promise((_resolve, reject) => {
          abortSignal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      })
    );
    await expect(apiRequest('/x', { timeoutMs: 50 })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('caller-provided cancellation signal aborts the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementationOnce((_url: string, init: any) => {
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        });
      })
    );
    const controller = new AbortController();
    const pending = apiRequest('/x', { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('passes extra headers through (booking grant)', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(okResponse({ success: true }));
    await api.post('/bookings', {}, { headers: { 'X-NobatAra-Booking-Grant': 'g' } });
    expect(fetchMock.mock.calls[0][1].headers['X-NobatAra-Booking-Grant']).toBe('g');
  });
});
