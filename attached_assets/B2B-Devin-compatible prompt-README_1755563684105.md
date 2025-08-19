
# Odyssey B2B — Backend (MVP) · Devin Tasking (Zero‑Shot)

## 0) Objective
Implement a multi-tenant B2B nutrition backend with: vendor catalogs, customer + health profiles, ingestion (CSV + external API connectors), search, health-aware matching, RBAC/admin, and webhooks. Ship production-ready code, migrations, infra-as-code where applicable, tests, and runbooks.

## 1) Constraints & Non‑Goals
- **Region:** USA. **Regulatory:** HIPAA (Security/Privacy Rules; documentation/audit retention 6 years).
- **Non-goals (MVP):** multi-currency pricing; semantic/KG search (keep adapter hooks).
- **Error format:** Problem Details for HTTP APIs (RFC 9457).

## 2) Target SLOs & Scale
- `/matches` P95 ≤ **500 ms**; list/search P95 ≤ **300 ms**.
- Ingest ≤ **2M rows / 5–10 GB** per job; end-to-end ≤ **45 min** using `COPY` on reasonable hardware.
- Tenants: **50**. Per tenant: **500k products**, **1M customers**.
- Availability: **99.9%/mo** API; one 30‑min monthly maintenance window.

## 3) Tech Stack
- **API Edge:** Next.js (App Router) Route Handlers.
- **AuthN:** Appwrite JWT (Bearer). **AuthZ/RBAC:** DB roles (see §5).
- **DB:** Supabase Postgres + **read replicas** for heavy reads/search (ack async lag).
- **Storage:** Supabase Storage with **TUS** resumable uploads for large CSVs.
- **Queue/Workers:** Postgres‑backed work queue using `SELECT … FOR UPDATE SKIP LOCKED`.
- **Errors:** RFC 9457 Problem+JSON.
- **Webhooks:** HMAC‑SHA256 signature + timestamp (Stripe‑style), at‑least‑once delivery.

## 4) Repo Outputs
1. **/apps/api** — Next.js API (Route Handlers).
2. **/packages/db** — SQL migrations + seeders + typed client.
3. **/packages/worker** — CSV/API ingest workers, webhook dispatcher, MV refresh.
4. **/packages/lib** — shared: auth middleware, RFC9457 errors, idempotency store, HMAC sign/verify, header/value mapping, health derivations.
5. **/infra** — environment examples, secrets contracts, storage buckets, read‑replica routing config.
6. **/tests** — unit/integration/load (ingestion, matching, search, webhooks).
7. **Runbooks** — ingest, queue, replicas, backup/restore, key rotation.

## 5) Tenancy & RBAC
- Single DB; strict tenant isolation: **every row has `vendor_id`**; all queries scoped by `vendor_id`.
- Roles: `superadmin` (break‑glass only), `vendor_admin`, `vendor_operator`, `vendor_viewer`.
- Health data: minimum‑necessary access; **audit** every read/write.

## 6) Secrets & HIPAA Posture
- Runtime secrets:
  - Appwrite Functions → Appwrite env vars.
  - Supabase Edge Functions → `supabase secrets`.
- DB‑held secrets/PII: **Supabase Vault** (encrypted; SQL access; audited).
- Storage: encrypted buckets; **TUS** uploads for large files.
- Master keys: cloud KMS; envelope encryption; quarterly rotation (or on compromise).
- Retention: **audit/docs 6 years**; raw API pages 30d; ingest error files 90d.
- Webhooks: HMAC‑SHA256 signatures with timestamp headers; idempotent, at‑least‑once, retries + DLQ.

## 7) Physical Database Design (Postgres 15/16+)
- **Partitioning**
  - Parent tables are **LIST partitioned by `vendor_id`**.
  - Each vendor partition has **HASH sub‑partitions**: Products ×16; Customers ×32 — keeps indexes small, enables vendor pruning, avoids thousands of partitions.
- **FTS**
  - Trigger‑maintained `tsvector` (name, brand, short description) + **GIN** index.
- **Arrays**
  - Optional GIN indexes on `tags[]`, `allergens[]` only if used heavily.
- **Replicas**
  - Read replicas serve `/search` + analytics; surface replication‑lag freshness where relevant.

## 8) Canonical Tables (required → optional)
- **vendors** — id, name, status, settings_json, catalog_version, created_at, updated_at.
- **users** (shadow of Appwrite) — id, email, display_name, created_at, updated_at.
- **user_links** — id, user_id, vendor_id, role{superadmin|vendor_admin|vendor_operator|vendor_viewer}, status; UQ(user_id,vendor_id).
- **platform_admins** — user_id (pk).
- **products** (LIST→HASH×16):
  - Required: id, vendor_id, external_id, name, brand, description, category_id, price, currency=USD, status, search_tsv, created_at, updated_at.
  - Optional: barcode, gtin_type, ingredients, sub_category_id, cuisine_id, market_id, nutrition jsonb, serving_size, package_weight, dietary_tags[], allergens[], certifications[], regulatory_codes[], source_url, soft_deleted_at.
  - Indexes: PK(id), UQ(vendor_id,external_id), UQ(vendor_id,barcode), GIN(search_tsv), optional GIN(dietary_tags), GIN(allergens).
- **product_images** — id, product_id, url, alt, sort.
- **product_sources** — id, product_id, source{csv|api}, source_ref, ingestion_job_id.
- **customers** (LIST→HASH×32):
  - Required: id, vendor_id, external_id, full_name, email, dob or age, gender, location, created_at, updated_at.
  - Optional: phone, custom_tags[], search_tsv, created_by, updated_by.
  - Indexes: UQ(vendor_id,external_id), optional GIN(search_tsv).
- **customer_health_profiles** (1‑to‑1) — customer_id, height_cm, weight_kg, age, gender, activity_level, conditions[], diet_goals[], macro_targets jsonb, avoid_allergens[]; Derived: bmi, bmr, tdee_cached, derived_limits jsonb; updated_by, timestamps.
- **customer_consents** — id, customer_id, consent_type, granted, version, timestamp.
- **customer_whitelists / customer_blacklists** — id, customer_id, product_id, note, timestamps.
- **tax_categories / tax_tags / tax_allergens / tax_cuisines / tax_certifications** — id, code, label, parent_id?, active, timestamps.
- **synonyms_header** — id, canonical, synonyms[], transform_ops jsonb, confidence.
- **synonyms_value** — id, domain{allergen|condition|unit|diet|gender|activity}, canonical, synonyms[].
- **vendor_mappings** — id, vendor_id, mode{products|customers}, map jsonb, version, timestamps.
- **ingestion_jobs** — id, vendor_id, mode{products|customers|api_sync}, status{queued|running|failed|completed|canceled}, progress_pct, totals jsonb, error_url, started_at, finished_at, attempt, params jsonb.
- **ingestion_job_errors** — id, job_id, row_no, field, code, message, raw jsonb.
- **stg_products / stg_customers** — staging superset; job_id, vendor_id; truncate post‑merge.
- **stg_vendor_raw** — id, vendor_id, source, page_id, payload jsonb, fetched_at (TTL 30d).
- **connectors** — id, vendor_id, source, base_url, auth_type, rate_limit_rpm, secrets_ref, enabled, timestamps.
- **connector_cursors** — id, vendor_id, source, cursor, synced_at, status.
- **matches_cache** — PK(vendor_id, customer_id, catalog_version), results jsonb, ttl_at.
- **diet_rules** — id, vendor_id, condition_code, policy jsonb, active, version, timestamps.
- **scoring_policies** — id, vendor_id, weights jsonb, active, timestamps.
- **webhook_endpoints** — id, vendor_id, url, secret_ref, enabled, retries_max, tolerance_sec, timestamps.
- **webhook_deliveries** — id, endpoint_id, event_type, payload jsonb, status, attempt, last_error, signature, created_at.
- **idempotency_keys** — key(pk), vendor_id, method, path, request_hash, response_hash, status, created_at, expires_at(24h).
- **audit_log** — id, actor_user_id, actor_role, vendor_id?, action, entity, entity_id, before jsonb, after jsonb, ip, ua, justification?, timestamp.

## 9) API Contracts (v1)
**Conventions**
- Auth: Appwrite JWT (Bearer).
- Tenancy: resolve `vendor_id` from JWT membership; do not pass vendor in URL.
- Idempotency: require `Idempotency-Key` on POST/PUT/PATCH; store + replay.
- Errors: `application/problem+json` (RFC 9457).
- Pagination: cursor (`next_cursor`), `limit ≤ 200`. Rate limits: 60 rpm/user; 600 rpm/vendor; ingest 6 rpm/vendor.

**Products**
- `GET /api/v1/products` — filters: `q`, brand, category_id, `tags.any`, `allergens.none`, `updated_after`; sort `-updated_at|relevance`; cursor/limit.
- `POST /api/v1/products` — idempotent batch upsert (≤10k).
- `GET /api/v1/products/:id` · `PATCH /api/v1/products/:id` · `DELETE` (soft).

**Customers & Health**
- `GET/POST /api/v1/customers` (batch upsert).
- `GET|PUT|PATCH|DELETE /api/v1/customers/:id`.
- `GET /api/v1/customers/:id/health` (admin/operator).
- `PUT /api/v1/customers/:id/health` — validate units; compute BMI, **BMR (Mifflin‑St Jeor)**, **TDEE**; update `derived_limits`.

**Ingestion (CSV)**
- `POST /api/v1/ingest/csv?mode=products|customers` → signed **TUS** URL + `job_id`.
- `GET /api/v1/jobs/:id` → status/progress/error_url.
- Worker: Storage (TUS) → **`COPY FROM`** to staging → validate/auto‑map (synonyms) → **MERGE/ON CONFLICT** into live partitions (100k–250k batches) → `ANALYZE`.

**Connectors (External APIs)**
- `PUT /api/v1/connectors/:source` (base_url, auth, rate, secrets_ref).
- `POST /api/v1/connectors/:source/test`.
- `POST /api/v1/connectors/:source/sync` → enqueue; `GET /api/v1/jobs/:id`.

**Search**
- `GET /api/v1/search/products?q=...` — FTS (`tsvector` + **GIN**), relevance/updated_at sort; cursor pagination.

**Matching**
- `GET /api/v1/matches/:customerId?k=20` — hard filters: allergens, explicit nutrient_limits; soft budgets from `derived_limits`; deterministic scoring; cache key `(vendor_id, customer_id, catalog_version)`.

**Webhooks**
- Events: `job.completed`, `job.failed`, `product.updated`, `customer.updated`.
- Headers: `X-Timestamp`, `X-Signature: sha256=<hex>`, `X-Idempotency-Key`. Verify HMAC over `timestamp + "\n" + rawBody` (reject skew beyond tolerance); exponential retries; DLQ.

## 10) Health‑Aware Logic
- **BMR**: Mifflin‑St Jeor; **TDEE = BMR × activity_factor** (sedentary≈1.2; light≈1.375; moderate≈1.55; very≈1.725; extra≈1.9). Store `tdee_cached`.
- **Derived limits**: compute daily ceilings using vendor‑tunable condition templates (hypertension, T2D, CKD); vendors may promote soft nutrients to hard.
- **Scoring**: candidate set (≤200 via FTS/filters); penalties when a serving consumes large shares of daily budgets; fiber bonus for diabetes; deterministic tie‑breaking.

## 11) Ingestion Pipeline Details
- **Uploads**: Supabase Storage **TUS** resumable uploads; support 5–10 GB files with resume/retry.
- **Load**: stream server‑side to **`COPY FROM`** into `stg_*`, then `MERGE`/`ON CONFLICT` into live partitions; `ANALYZE` affected partitions.
- **Mapping**: header auto‑map via `synonyms_header`; transform ops (unit conversions, ft′in″→cm, lb→kg, kJ→kcal); `synonyms_value` for allergens/conditions.
- **Validation**: numeric ranges (height/weight/age), enums normalization, conflict checks (e.g., age vs DOB).
- **Artifacts**: per‑row errors written to `ingestion_job_errors` + `errors.csv` in Storage.

## 12) Queue & Workers
- Postgres queue with `SELECT … FOR UPDATE SKIP LOCKED` to distribute work without duplication; shard by vendor; one active ingest per vendor; retries with exponential backoff; DLQ on exhaust.
- Note: SKIP LOCKED is intentionally non‑blocking; ideal for job queues.

## 13) Search
- Persist `search_tsv` via trigger; **GIN** index. Keep document small (name/brand/short desc) to control index size.
- Route `/search` to read replica where possible; include freshness indicator when replica lag suspected.

## 14) Non‑Functional
- Backups: daily full + PITR 7–30d.
- Observability: structured logs (`req_id, user_id, vendor_id, role, route, status, latency_ms, rows_read/written`); metrics (RPS, p50/p95, error rate, queue lag, job throughput, replica lag).
- Audit: RBAC changes; ALL health reads/writes; deletes; break‑glass sessions.

## 15) Deliverables (Definition of Done)
1. **DB migrations** implementing schema + partitioning (LIST by vendor; HASH sub‑parts), triggers (tsvector; timestamps), indexes.
2. **API** implementing all routes in §9 with auth, RBAC, tenancy scoping, idempotency store, RFC9457 errors.
3. **Workers**: CSV ingest (TUS→COPY→MERGE), API connector sync (paged, throttled, cursor checkpoints), webhook dispatcher.
4. **Secrets** integration (Appwrite env vars, `supabase secrets`, Vault usage, KMS).
5. **Read‑replica routing** for search + analytics; freshness indicator when lag suspected.
6. **Tests**:
   - Unit: mapping, health derivations, HMAC verification, idempotency.
   - Integration: ingest 100k rows; API sync with fake pages; `/matches` correctness.
   - Load: simulate 2M‑row ingest with synthetic data; verify duration within SLO; search QPS vs replica.
7. **Runbooks**: ingest, queue, replica, backup/restore, secret rotation, webhook troubleshooting.
8. **Sample data** + seeds: taxonomy, synonyms, condition templates.
9. **CI**: lint, typecheck, tests, migration check, secret‑scan; on main, build workers.

## 16) Fallbacks & Edge Cases
- Missing health inputs → skip BMR/TDEE; compute base matching only; return `health_score_terms=0`.
- TUS upload aborted → client resumes; server verifies checksum; partial files pruned.
- `COPY` fails on bad rows → keep staging; collect row errors; continue batches; write `errors.csv`; job `completed_with_errors`.
- Webhook consumer 4xx → retry once then park to DLQ with reason; 5xx → full retry policy; signature mismatch → mark `INVALID_SIGNATURE`.
- Replica lag detected → serve from primary or add freshness header.

## 17) Implementation Sequence (strict)
1. DB migrations + seeds (taxonomy, synonyms, policies).
2. Auth/RBAC middleware (JWT validate; role lookup; tenancy guard).
3. Products & Customers CRUD (batch upsert + idempotency + RFC9457 errors).
4. Storage + TUS upload init; CSV **COPY** ingest worker pipeline end‑to‑end.
5. Connectors framework (paged fetch; cursors; throttling).
6. Search (FTS + filters; cursor pagination).
7. Health endpoints + derivations (Mifflin‑St Jeor + TDEE).
8. Matching engine + cache invalidation (`catalog_version`).
9. Webhooks (HMAC sign/verify; retries; DLQ).
10. Read‑replica routing for search; freshness header.
11. Observability + audit; load tests; runbooks; polish.

## 18) Acceptance Tests (must pass)
- CRUD: uniqueness, RBAC, idempotency replay.
- Ingest: 2M‑row synthetic → completes ≤ 45 min; error CSV present; post‑ingest ANALYZE executed.
- Search: relevance + filters; stable pagination; replica path exercised.
- Matching: respects hard allergen blocks and explicit nutrient ceilings; uses soft budgets when no explicit limits.
- Webhooks: signature verified; retries + DLQ; idempotency honored.
- Security: health access audited; secrets never logged; break‑glass flows audited.

---

**Deliver this as the root README and implement accordingly.**
