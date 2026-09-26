# StockSense — Double-Entry Inventory Ledger Backend

A robust, enterprise-grade inventory engine built on **Supabase (PostgreSQL)** implementing double-entry stock keeping with zero-negative integrity guarantees.

---

## 🏛️ System Architecture

StockSense replaces traditional single-column counters (`stock_count = stock_count - X`) with an **immutable double-entry transactional ledger**. Every physical movement generates balanced debit/credit records across source and destination locations.

* **Non-Destructive Ledger**: Physical counts are computed dynamically via `SUM(inbound) - SUM(outbound)` from `stock_moves`.
* **Zero-Negative Integrity**: High-frequency race conditions are prevented using `SELECT ... FOR UPDATE` row locks and server-side stock verification inside atomic stored procedures.
* **RPC Layer**: The frontend interacts directly with Postgres stored procedures (`validate_operation`, `create_operation_with_lines`) over Supabase RPC.

---

## 📊 Database Schema



E0F
