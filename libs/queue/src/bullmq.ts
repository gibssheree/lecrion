/**
 * BullMQ integration — placeholder.
 *
 * This module is reserved for BullMQ-based queue workers once Redis is
 * available in the deployment environment.
 *
 * Current state: the system uses the SQLite outbox pattern (see outbox.ts)
 * for reliable event delivery. BullMQ will replace or complement the outbox
 * processor when the stack moves to PostgreSQL + Redis.
 *
 * TODO (Phase 4): implement BullMQ queue/worker wiring here.
 */

export {};
