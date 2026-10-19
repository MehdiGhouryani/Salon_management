import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditCategory = 'auth' | 'privilege' | 'business' | 'financial' | 'system';

export interface DbAuditLog {
  id: string;
  actor: string;
  actor_role: string;
  action: string;
  target: string;
  ip_address: string;
  user_agent: string;
  severity: AuditSeverity;
  category: AuditCategory;
  details: any | null;
  is_demo: boolean;
  created_at: Date;
}

export interface CreateAuditLogDto {
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  ipAddress: string;
  userAgent: string;
  severity?: AuditSeverity;
  category?: AuditCategory;
  details?: any | null;
  isDemo?: boolean;
}

export interface FindAuditLogsFilter {
  severity?: AuditSeverity;
  category?: AuditCategory;
  actor?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export const auditLogRepository = {
  async create(dto: CreateAuditLogDto, client?: PoolClient): Promise<DbAuditLog> {
    const res = await query<DbAuditLog>(
      `INSERT INTO audit_logs (
        actor, actor_role, action, target, ip_address, user_agent, severity, category, details, is_demo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        dto.actor,
        dto.actorRole,
        dto.action,
        dto.target,
        dto.ipAddress,
        dto.userAgent,
        dto.severity || 'info',
        dto.category || 'business',
        dto.details ? JSON.stringify(dto.details) : null,
        dto.isDemo || false,
      ],
      client
    );
    return res.rows[0];
  },

  async findAll(filter: FindAuditLogsFilter = {}, client?: PoolClient): Promise<DbAuditLog[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.severity) {
      conditions.push(`severity = $${idx++}`);
      values.push(filter.severity);
    }
    if (filter.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filter.category);
    }
    if (filter.actor) {
      conditions.push(`actor ILIKE $${idx++}`);
      values.push(`%${filter.actor}%`);
    }
    if (filter.search) {
      conditions.push(`(action ILIKE $${idx} OR target ILIKE $${idx} OR actor ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }
    if (filter.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push(`created_at <= $${idx++}`);
      values.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const offset = filter.offset && filter.offset >= 0 ? filter.offset : 0;

    values.push(limit);
    const limitIdx = idx++;
    values.push(offset);
    const offsetIdx = idx++;

    const res = await query<DbAuditLog>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
      client
    );
    return res.rows;
  },

  async count(filter: FindAuditLogsFilter = {}, client?: PoolClient): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.severity) {
      conditions.push(`severity = $${idx++}`);
      values.push(filter.severity);
    }
    if (filter.category) {
      conditions.push(`category = $${idx++}`);
      values.push(filter.category);
    }
    if (filter.search) {
      conditions.push(`(action ILIKE $${idx} OR target ILIKE $${idx} OR actor ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
      values,
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  },
};
