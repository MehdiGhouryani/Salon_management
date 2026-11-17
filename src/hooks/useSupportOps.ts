import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { SupportTicket, TicketPriority, TicketStatus } from '../types/admin';

export interface SupportTicketFilters {
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  search?: string;
}

export function useSupportOps(enabled: boolean) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const safeMessage = (err: unknown) =>
    err instanceof ApiError ? err.message : 'خطا در ارتباط با سرویس پشتیبانی.';

  const loadTickets = useCallback(async (filters: SupportTicketFilters = {}) => {
    if (!enabled) return false;
    if (mounted.current) {
      setLoading(true);
      setError('');
    }
    const qs = new URLSearchParams({ limit: '100', offset: '0' });
    if (filters.status) qs.set('status', filters.status);
    if (filters.priority) qs.set('priority', filters.priority);
    if (filters.search?.trim()) qs.set('search', filters.search.trim());

    try {
      const data = await api.get<{ tickets: SupportTicket[]; total: number }>(
        '/api/admin/support/tickets?' + qs.toString()
      );
      if (mounted.current) {
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
      }
      return true;
    } catch (err) {
      if (mounted.current) {
        setError(safeMessage(err));
        setTickets([]);
        setTotal(0);
      }
      return false;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled]);

  const replyToTicket = useCallback(async (
    ticketId: string,
    content: string,
    filters: SupportTicketFilters = {}
  ) => {
    if (mounted.current) {
      setMutating(true);
      setError('');
    }
    try {
      await api.post('/api/admin/support/tickets/' + encodeURIComponent(ticketId) + '/messages', { content });
      await loadTickets(filters);
      return true;
    } catch (err) {
      if (mounted.current) setError(safeMessage(err));
      return false;
    } finally {
      if (mounted.current) setMutating(false);
    }
  }, [loadTickets]);

  const changeTicketStatus = useCallback(async (
    ticketId: string,
    status: TicketStatus,
    filters: SupportTicketFilters = {}
  ) => {
    if (mounted.current) {
      setMutating(true);
      setError('');
    }
    try {
      await api.patch('/api/admin/support/tickets/' + encodeURIComponent(ticketId) + '/status', { status });
      await loadTickets(filters);
      return true;
    } catch (err) {
      if (mounted.current) setError(safeMessage(err));
      return false;
    } finally {
      if (mounted.current) setMutating(false);
    }
  }, [loadTickets]);

  return { tickets, total, loading, mutating, error, loadTickets, replyToTicket, changeTicketStatus };
}
