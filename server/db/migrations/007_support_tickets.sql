-- Migration 007: Persistent salon support tickets and conversation messages

CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START WITH 100001;

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(32) NOT NULL UNIQUE
    DEFAULT ('SUP-' || LPAD(NEXTVAL('support_ticket_number_seq')::text, 7, '0')),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  creator_name VARCHAR(128) NOT NULL,
  creator_role VARCHAR(64) NOT NULL,
  subject VARCHAR(160) NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 160),
  category VARCHAR(32) NOT NULL CHECK (category IN ('technical', 'financial', 'sms', 'account')),
  priority VARCHAR(16) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(16) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  closed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_salon_updated
  ON support_tickets(salon_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority
  ON support_tickets(status, priority, updated_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(128) NOT NULL,
  sender_role VARCHAR(16) NOT NULL CHECK (sender_role IN ('salon', 'admin')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_created
  ON support_ticket_messages(ticket_id, created_at ASC);
