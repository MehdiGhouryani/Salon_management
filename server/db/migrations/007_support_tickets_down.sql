-- Migration 007 DOWN: dropping this migration deletes support ticket history.
DROP TABLE IF EXISTS support_ticket_messages;
DROP TABLE IF EXISTS support_tickets;
DROP SEQUENCE IF EXISTS support_ticket_number_seq;
