import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { isDatabaseConfigured, query } from '../db/pool.ts';

export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketCategory = 'technical' | 'financial' | 'sms' | 'account';
export type SupportTicketSenderRole = 'salon' | 'admin';

export interface SupportTicketMessage {
  id: string;
  senderName: string;
  senderRole: SupportTicketSenderRole;
  content: string;
  timestamp: Date;
}

export interface DbSupportTicket {
  id: string;
  ticketNumber: string;
  salonId: string;
  salonName: string;
  creatorName: string;
  creatorRole: string;
  creatorUserId: string | null;
  subject: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  category: SupportTicketCategory;
  createdAt: Date;
  updatedAt: Date;
  messages: SupportTicketMessage[];
}

export interface CreateSupportTicketDto {
  salonId: string;
  salonName: string;
  creatorUserId: string;
  creatorName: string;
  creatorRole: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
}

export interface SupportTicketFilter {
  id?: string;
  salonId?: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  search?: string;
  limit?: number;
  offset?: number;
}

const inMemoryTickets = new Map<string, DbSupportTicket>();

function normalizeMessage(row: any): SupportTicketMessage {
  return {
    id: String(row.id),
    senderName: String(row.senderName ?? row.sender_name ?? ''),
    senderRole: row.senderRole ?? row.sender_role,
    content: String(row.content ?? ''),
    timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp ?? row.created_at),
  };
}

function normalizeTicket(row: any): DbSupportTicket {
  let messages = row.messages ?? [];
  if (typeof messages === 'string') {
    try { messages = JSON.parse(messages); } catch { messages = []; }
  }
  return {
    id: String(row.id),
    ticketNumber: String(row.ticketNumber ?? row.ticket_number),
    salonId: String(row.salonId ?? row.salon_id),
    salonName: String(row.salonName ?? row.salon_name ?? ''),
    creatorName: String(row.creatorName ?? row.creator_name ?? ''),
    creatorRole: String(row.creatorRole ?? row.creator_role ?? ''),
    creatorUserId: row.creatorUserId ?? row.created_by_user_id ?? null,
    subject: String(row.subject ?? ''),
    priority: row.priority,
    status: row.status,
    category: row.category,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt ?? row.created_at),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt ?? row.updated_at),
    messages: Array.isArray(messages) ? messages.map(normalizeMessage) : [],
  };
}

function buildWhere(filter: SupportTicketFilter): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = 1;
  if (filter.id) {
    conditions.push('t.id = $' + index++);
    values.push(filter.id);
  }
  if (filter.salonId) {
    conditions.push('t.salon_id = $' + index++);
    values.push(filter.salonId);
  }
  if (filter.status) {
    conditions.push('t.status = $' + index++);
    values.push(filter.status);
  }
  if (filter.priority) {
    conditions.push('t.priority = $' + index++);
    values.push(filter.priority);
  }
  if (filter.search) {
    conditions.push('(t.ticket_number ILIKE $' + index + ' OR t.subject ILIKE $' + index + ' OR s.name ILIKE $' + index + ' OR t.creator_name ILIKE $' + index + ')');
    values.push('%' + filter.search + '%');
    index++;
  }
  return { clause: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', values };
}

export const supportTicketRepository = {
  async findAll(filter: SupportTicketFilter = {}, client?: PoolClient): Promise<DbSupportTicket[]> {
    if (!isDatabaseConfigured()) {
      const search = filter.search?.toLocaleLowerCase();
      return Array.from(inMemoryTickets.values())
        .filter((ticket) =>
          (!filter.id || ticket.id === filter.id) &&
          (!filter.salonId || ticket.salonId === filter.salonId) &&
          (!filter.status || ticket.status === filter.status) &&
          (!filter.priority || ticket.priority === filter.priority) &&
          (!search || [ticket.ticketNumber, ticket.subject, ticket.salonName, ticket.creatorName]
            .some((value) => value.toLocaleLowerCase().includes(search)))
        )
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(Math.max(0, filter.offset ?? 0), Math.max(0, filter.offset ?? 0) + Math.min(100, Math.max(1, filter.limit ?? 50)))
        .map((ticket) => ({ ...ticket, messages: [...ticket.messages] }));
    }

    const built = buildWhere(filter);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
    const offset = Math.max(0, filter.offset ?? 0);
    const limitIndex = built.values.length + 1;
    const offsetIndex = built.values.length + 2;
    const sql = [
      'SELECT t.id, t.ticket_number, t.salon_id, s.name AS salon_name,',
      't.created_by_user_id, t.creator_name, t.creator_role,',
      't.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,',
      "COALESCE(json_agg(json_build_object('id', m.id, 'senderName', m.sender_name, 'senderRole', m.sender_role, 'content', m.content, 'timestamp', m.created_at) ORDER BY m.created_at ASC) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS messages",
      'FROM support_tickets t JOIN salons s ON s.id = t.salon_id',
      'LEFT JOIN support_ticket_messages m ON m.ticket_id = t.id',
      built.clause,
      'GROUP BY t.id, s.name ORDER BY t.updated_at DESC',
      'LIMIT $' + limitIndex + ' OFFSET $' + offsetIndex,
    ].filter(Boolean).join('\n');
    const result = await query(sql, [...built.values, limit, offset], client);
    return result.rows.map(normalizeTicket);
  },

  async findById(id: string, salonId?: string, client?: PoolClient): Promise<DbSupportTicket | null> {
    const rows = await this.findAll({ id, salonId, limit: 1 }, client);
    return rows[0] || null;
  },

  async count(filter: SupportTicketFilter = {}, client?: PoolClient): Promise<number> {
    if (!isDatabaseConfigured()) {
      const search = filter.search?.toLocaleLowerCase();
      return Array.from(inMemoryTickets.values()).filter((ticket) =>
        (!filter.id || ticket.id === filter.id) &&
        (!filter.salonId || ticket.salonId === filter.salonId) &&
        (!filter.status || ticket.status === filter.status) &&
        (!filter.priority || ticket.priority === filter.priority) &&
        (!search || [ticket.ticketNumber, ticket.subject, ticket.salonName, ticket.creatorName]
          .some((value) => value.toLocaleLowerCase().includes(search)))
      ).length;
    }
    const built = buildWhere(filter);
    const result = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM support_tickets t JOIN salons s ON s.id = t.salon_id ' + built.clause,
      built.values,
      client
    );
    return Number.parseInt(result.rows[0]?.count || '0', 10);
  },

  async create(dto: CreateSupportTicketDto, client?: PoolClient): Promise<DbSupportTicket> {
    if (!isDatabaseConfigured()) {
      const id = crypto.randomUUID();
      const now = new Date();
      const ticket: DbSupportTicket = {
        id,
        ticketNumber: 'SUP-' + id.slice(0, 8).toUpperCase(),
        salonId: dto.salonId,
        salonName: dto.salonName,
        creatorName: dto.creatorName,
        creatorRole: dto.creatorRole,
        creatorUserId: dto.creatorUserId,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      inMemoryTickets.set(id, ticket);
      return { ...ticket, messages: [] };
    }

    const result = await query(
      'INSERT INTO support_tickets (salon_id, created_by_user_id, creator_name, creator_role, subject, category, priority) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
      'RETURNING id, ticket_number, salon_id, created_by_user_id, creator_name, creator_role, subject, category, priority, status, created_at, updated_at',
      [dto.salonId, dto.creatorUserId, dto.creatorName, dto.creatorRole, dto.subject, dto.category, dto.priority],
      client
    );
    return normalizeTicket({ ...result.rows[0], salon_name: dto.salonName, messages: [] });
  },

  async addMessage(
    ticketId: string,
    dto: { senderUserId: string; senderName: string; senderRole: SupportTicketSenderRole; content: string },
    client?: PoolClient
  ): Promise<SupportTicketMessage> {
    if (!isDatabaseConfigured()) {
      const ticket = inMemoryTickets.get(ticketId);
      if (!ticket) throw new Error('Support ticket not found.');
      const message: SupportTicketMessage = {
        id: crypto.randomUUID(),
        senderName: dto.senderName,
        senderRole: dto.senderRole,
        content: dto.content,
        timestamp: new Date(),
      };
      ticket.messages.push(message);
      ticket.updatedAt = message.timestamp;
      return message;
    }
    const result = await query(
      'INSERT INTO support_ticket_messages (ticket_id, sender_user_id, sender_name, sender_role, content) ' +
      'VALUES ($1, $2, $3, $4, $5) RETURNING id, sender_name, sender_role, content, created_at',
      [ticketId, dto.senderUserId, dto.senderName, dto.senderRole, dto.content],
      client
    );
    await query('UPDATE support_tickets SET updated_at = NOW() WHERE id = $1', [ticketId], client);
    return normalizeMessage(result.rows[0]);
  },

  async updateStatus(ticketId: string, status: SupportTicketStatus, client?: PoolClient): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      const ticket = inMemoryTickets.get(ticketId);
      if (!ticket) return false;
      ticket.status = status;
      ticket.updatedAt = new Date();
      return true;
    }
    const result = await query(
      "UPDATE support_tickets SET status = $2, updated_at = NOW(), closed_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE NULL END WHERE id = $1",
      [ticketId, status],
      client
    );
    return result.rowCount === 1;
  },
};
