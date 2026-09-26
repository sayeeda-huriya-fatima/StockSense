Editing directly on GitHub is often much easier because you get an instant live preview.

Here is how to polish it right in your browser:

1. Go to your repository: `[https://github.com/sayeeda-huriya-fatima/StockSense](https://github.com/sayeeda-huriya-fatima/StockSense)`
2. Click on the **`README.md`** file in the file list.
3. Click the **pencil icon** (✏️) in the top-right corner of the file viewer to enter the web editor.
4. Paste the complete formatted text below into the editor.
5. Click the **Preview** tab at the top to ensure the formatting, code blocks, and diagrams render cleanly.
6. Click the green **Commit changes...** button at the top right, select *Commit directly to the `main` branch*, and confirm.

---

### Copy-Paste Content for Your GitHub Editor

```markdown
# StockSense — Double-Entry Inventory Ledger Backend

A robust inventory engine built on **Supabase (PostgreSQL)** implementing double-entry stock keeping with zero-negative integrity guarantees.

---

## 🏛️ System Architecture

StockSense replaces traditional single-column counters (`stock_count = stock_count - X`) with an **immutable double-entry transactional ledger**. Every physical movement generates balanced records across source and destination locations.

* **Non-Destructive Ledger**: Physical counts are computed dynamically via `SUM(inbound) - SUM(outbound)` from `stock_moves`.
* **Zero-Negative Integrity**: Race conditions are prevented using `SELECT ... FOR UPDATE` row locks and server-side stock verification inside atomic stored procedures.
* **RPC Layer**: The frontend interacts directly with Postgres stored procedures (`validate_operation`, `create_operation_with_lines`) over Supabase RPC.

---

## 📊 Database Schema

```text
[ locations ] ──< [ stock_moves ] >── [ products ]
                       │                      │
                       │                      │
[ operations ] ──< [ operation_lines ] ───────┘

```

* **`locations`**: Storage nodes categorized as `internal`, `vendor`, `customer`, or `inventory_loss`.
* **`products`**: Item catalog with SKUs, units of measure, and threshold alerts.
* **`operations`**: High-level movement manifests (`receipt`, `delivery`, `internal`, `adjustment`) transitioning through `draft` → `waiting` → `ready` → `done`.
* **`operation_lines`**: Planned items and demanded quantities per operation.
* **`stock_moves`**: The immutable audit trail generated upon operation validation.

---

##  Core Functions (RPC API)

### 1. `create_operation_with_lines`

Atomically records a draft movement header along with all requested line items in a single transaction.

```sql
SELECT create_operation_with_lines(
    p_reference_no => 'REC-001',
    p_operation_type => 'receipt',
    p_source_location_id => '<uuid>',
    p_destination_location_id => '<uuid>',
    p_partner_name => 'Supplier Co.',
    p_items => '[{"product_id": "<uuid>", "quantity": 50}]'::jsonb
);

```

### 2. `validate_operation`

Locks the operation row, verifies adequate available stock at the source location (if internal), posts balanced rows into `stock_moves`, and marks the operation `done`.

```sql
SELECT validate_operation('<operation_uuid>');

```

### 3. `get_current_stock`

Calculates real-time on-hand stock for any SKU at a specific storage location.

```sql
SELECT get_current_stock('<product_uuid>', '<location_uuid>');

```

---

##  Setup & Migrations

1. Link or configure your Supabase instance.
2. Run the migration script located at `supabase/migrations/init_stocksense.sql`.

```

---

>Go for it. Editing or creating files directly on GitHub's web interface is fine for quick edits or docs, but keep these practical realities in mind:

1. **Commit clutter:** GitHub commits every change directly when you hit save. If you're testing code or tweaking formatting, make a separate branch rather than committing broken drafts straight to `main`.
2. **The web editor shortcut:** Press `.` (period) while inside any repository to launch GitHub’s full in-browser VS Code editor. It gives you a multi-file file tree, search, and a much cleaner interface than editing one raw file at a time.
3. **No runtime:** Remember you can't run scripts, compile code, or test backend connections there unless you launch a full GitHub Codespace. 

What file or repo are you setting up?

```
