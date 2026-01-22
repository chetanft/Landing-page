

## 1. Product Requirement Document

### 1.1 Name

**FT TMS – Summary Dashboard (Tabs: Orders / Journeys / Shipments / Invoices)**

### 1.2 Background

FT TMS has many pages (Orders, Journeys, Shipments, Invoices). Ops users need a **single “command center”** summary view to see key counts and exceptions. These counts come from **multiple APIs and webhooks** and must always be **live and consistent** with production data.

### 1.3 Problem

* Users waste time to open many pages to understand “what is pending / delayed / exception”.
* Summary numbers are available across systems but not in one place.
* If numbers are hardcoded or not mapped to filters, it creates mismatch and low trust.

### 1.4 Goals

1. Show a **summary dashboard** with 4 tabs:

   * **Orders**: order lifecycle
   * **Journeys**: FTL journey lifecycle
   * **Shipments**: PTL shipment lifecycle
   * **Invoices**: invoicing lifecycle (FTL + PTL)
2. All numbers must come from **APIs + webhooks only** (no hardcoding).
3. Every data point must be **clickable** and navigate to the correct FT TMS page with **filters applied by default**.
4. Page must be **plug-and-play** inside existing FT TMS with minimal friction.
5. UI must use **FT Design System**.

### 1.5 Non-goals

* Not redesigning existing Orders/Journeys/Shipments/Invoices pages.
* Not building new backend logic to compute metrics (only consume what backend exposes).
* Not building an admin UI to create metrics (we will use a config file).

---

## 2. Users & Use Cases

### 2.1 Primary users

* Ops / Control tower user
* Branch / location manager
* Finance user (Invoices tab)

### 2.2 Key use cases

* “How many journeys are IN_TRANSIT right now?”
* “How many have active alert: route deviation?”
* “How many are delayed (delay_in_minutes > 0)?”
* “How many invoices are pending approval / disputed?”

---

## 3. UX Requirements (What to build)

### 3.1 Page layout (high level)

1. **Header area**

   * Page title: “Summary Dashboard”
   * Global selectors:

     * Location/branch dropdown (example: “MDC Labs, Amritsar”)
     * Date range picker (default last 30 days or current day, based on tab)
     * Search (optional if needed later)
2. **Tabs**: Orders | Journeys | Shipments | Invoices
3. **Inside each tab**

   * Top “quick KPI row” (small cards)
   * Lifecycle “columns/cards” (like your screenshot)
   * Exceptions section per lifecycle stage (counts in red / status color)

### 3.2 Interaction rules

* Each metric card or list item is clickable.
* Click action:

  * Navigate to target route (example: `/tms/journeys`)
  * Apply filters in URL query params (example: `?journey_status=IN_TRANSIT&active_alerts=route_deviation`)
* Filters should be compatible with existing FT TMS filter system.

### 3.3 States

* Loading (skeleton)
* Partial loading (one widget failed, others still show)
* Error state (retry)
* Empty state (0 counts)

### 3.4 Accessibility & basics

* Keyboard focus on clickable data points
* Tooltips for metric definitions
* Consistent status colors (critical/warning/positive/neutral) from tokens 

---

## 4. Data Requirements

### 4.1 Data sources

1. **Multiple APIs** for counts (example you shared).
2. **Webhooks** that push updates (example: journey status change, alert created, invoice updated).

### 4.5 Orders data sourcing (TMS-specific)

This is a **TMS platform**. Orders data displayed in the Orders tab must be sourced from FT TMS APIs based on customer setup:

1. **Customers using Dispatch Planning**
   * Inbound order data sent to FT TMS can include Purchase Orders (PO), Sales Orders (SO), or Delivery Orders (DO).
   * The dashboard must show these orders in Orders tab **column view** and **table view**, including their current stage.
   * If inbound payloads include only order details (no stage/milestone), the dashboard must **enrich** orders by calling FT TMS APIs to derive:
     * order stage
     * milestone
     * status
     * any other lifecycle fields required for column/table rendering

2. **Customers not using Dispatch Planning**
   * Orders are not pushed directly. The dashboard must derive order-like records by correlating data across FT TMS APIs:
     * journeys, PTL, indent, ePOD, invoices, etc.
   * Extract and display order details in Orders tab (column + table) including:
     * PO / SO / DO references
     * invoices
     * materials
     * route
     * consignor / consignee
     * derived stage/milestone/status (as available)

3. **Common requirements**
   * Provide a clear mapping and precedence when multiple sources provide overlapping order fields.
   * Ensure Orders tab handles both modes transparently based on tenant configuration.

### 4.2 Data principles

* UI never calculates business counts by itself (only show what backend sends).
* UI may do simple display formatting (number formatting, grouping).
* Each metric must have:

  * `label`
  * `count`
  * `query/filter payload`
  * `targetUrl`
  * optional: `statusType` (neutral/warning/critical/positive)

### 4.3 Example API payload (given)

Used for building request filters to fetch counts:

* entity_type=CNR
* journey_status=IN_TRANSIT
* milestones[]=PLANNED...CLOSED
* active_alerts[]=long_stoppage, route_deviation, eway_bill
* active_analytics[]=delay_in_minutes, expected_arrival
* time range, direction, stop type, sorting

### 4.4 Metric definition format (front-end config)

We will keep a **metrics registry** in code so it is easy to plug into FT TMS.

Example structure (concept only):

* `metricId`: `journeys.in_transit`
* `tab`: `journeys`
* `title`: `In Transit`
* `source`: `api/journeys/search`
* `requestParams`: `{ journey_status: "IN_TRANSIT", ... }`
* `target`: `{ path: "/tms/journeys", defaultFilters: { journey_status: "IN_TRANSIT" } }`

---

## 5. Navigation & Filter Mapping

### 5.1 URL contract

When user clicks metric:

* Build URL: `targetPath + "?" + serializeFilters(defaultFilters + globalFilters)`
* Global filters include:

  * branch/location id
  * date range
  * maybe entity_type

### 5.2 Filter compatibility

Important: existing pages must accept the same query keys.

* If existing keys differ, create a **mapping layer** in dashboard:

  * dashboardFilterKey → pageFilterKey

Example:

* dashboard: `delay_in_minutes=true`
* journeys page expects: `analytics=delay_in_minutes` OR `isDelayed=true`
  So mapping should handle it.

### 5.3 Back button

If user navigates to list page and presses back:

* Dashboard should restore last selected tab + global filters (keep in URL or local storage).

---

## 6. System Design (Front-end)

### 6.1 Plug-and-play requirement

Dashboard must be shipped as:

* A self-contained route module: `/summary-dashboard`
* No dependency on non-standard CSS. Use FT global CSS tokens. 
* Uses same auth/session as FT TMS.

### 6.2 Data layer approach

Create a small “data platform” inside FE:

1. **API client**

   * Handles auth headers, base URL, retries
2. **Metrics service**

   * Reads metric registry
   * Calls APIs for each metric group (batched if possible)
3. **Webhook listener**

   * Subscribes to websocket/SSE or webhook bridge (depends on FT infra)
   * On relevant event → re-fetch impacted metrics

### 6.3 Refresh strategy

* Default: auto-refresh every X seconds (example 60s) for operational tabs like Journeys.
* Webhook updates should trigger faster refresh for affected metrics only.
* Manual refresh button also available.

### 6.4 Performance rules

* Avoid calling 20 APIs separately.
* Prefer:

  * Backend “counts endpoint” (ideal)
  * Or FE batching if backend supports multi-query
* Caching:

  * Cache per (tab + global filters + metricId) for short duration (30–60s)

---

## 7. Webhooks Requirements

### 7.1 Webhook event types (examples)

* `journey.status.changed`
* `journey.alert.created`
* `shipment.status.changed`
* `invoice.status.changed`
* `order.status.changed`

### 7.2 Webhook contract needed

Each event should include:

* entity id
* entity type
* status
* timestamp
* optional: location/branch id
  So FE can decide which tab/metrics to refresh.

### 7.3 Fallback

If webhooks fail, the dashboard still stays correct with polling refresh.

---

## 8. UI Requirements (FT Design System)

### 8.1 Tokens and styling

* Use CSS variables from FT global CSS:

  * `--primary`, `--secondary`, `--bg-primary`, `--border-primary`, status tokens like `--critical`, `--warning`, etc. 
* Use spacing from 8px grid variables.
* Use components style consistency (buttons, badges, inputs) from the same file. 

### 8.2 Components to build/reuse

* Tabs
* Card / Panel
* Metric item (label + count + clickable)
* Lifecycle column component
* Exceptions list component
* Skeleton loaders
* Error banner + retry

---

## 9. Analytics & Logging

Track:

* Tab visits
* Metric clicks (metricId, targetUrl)
* API latency + failures
* Webhook events received count
* “Mismatch” debugging logs (optional) when list page results differ from count (only dev mode)

---

## 10. Security & Permissions

* Dashboard respects existing FT TMS permissions:

  * If user cannot access Invoices module, hide that tab.
* All API calls must include auth token from existing session.

---

## 11. Acceptance Criteria

1. No hardcoded numbers anywhere.
2. All metrics render from API responses.
3. Every metric navigates correctly and list page filter is applied by default.
4. Works inside FT TMS without breaking layout/theme.
5. Handles API failure per widget without crashing whole page.
6. Webhook update refreshes the relevant metric within acceptable time.

---

## 12. Rollout Plan

* Phase 1: Journeys tab only (end-to-end: counts + click navigation)
* Phase 2: Orders + Shipments
* Phase 3: Invoices + finance-only metrics
* Phase 4: Webhook-driven refresh + polish + performance

---

# 2) Project Scope (for coding in Cursor)

## 2.1 Tech scope (recommended)

* React (same stack as FT TMS)
* Typescript
* Routing: reuse existing router (do not introduce new routing system)
* State:

  * React Query (or existing FT TMS data library)
  * Websocket/SSE hook if available

## 2.2 Repo / folder structure

Suggested module structure:

* `src/modules/summary-dashboard/`

  * `pages/SummaryDashboardPage.tsx`
  * `components/`

    * `TabHeader.tsx`
    * `LifecycleBoard.tsx`
    * `LifecycleColumn.tsx`
    * `MetricCard.tsx`
    * `ExceptionsList.tsx`
    * `DashboardSkeleton.tsx`
  * `data/`

    * `metricsRegistry.ts` (all metrics definitions)
    * `metricsService.ts` (fetch + transform)
    * `webhookHandlers.ts` (event → refresh mapping)
    * `filterMapper.ts` (dashboard → page filter key map)
  * `types/`

    * `metrics.ts`
    * `api.ts`

## 2.3 Integration points (must match FT TMS)

1. **Theme + CSS**

   * Import FT global CSS once (or use existing import):

     * `/mnt/data/ft-design-system-global.css` 
2. **Auth**

   * Use existing API client or interceptors
3. **Navigation**

   * Use same router navigation function as FT TMS
4. **Filter format**

   * Reuse filter query param standard (important)

## 2.4 API work items

* Build API client wrapper:

  * baseUrl from env
  * auth headers
  * timeout + retry (small)
* Implement metrics fetcher:

  * group metrics by endpoint
  * call endpoints with correct params
  * parse response into `{count}`
* Add support for server “count only” endpoints if available later.

## 2.5 Webhook work items

* Create `useDashboardWebhooks()` hook:

  * subscribe
  * parse events
  * call `invalidateQueries` or re-fetch impacted metrics
* Map events to metrics:

  * journey events → refresh journeys tab
  * invoice events → refresh invoices tab

## 2.6 Routing work items

* Add route entry:

  * `/tms/summary-dashboard` (or final path that FT TMS wants)
* Ensure top nav highlights it correctly (if needed)

## 2.7 Filter mapping work items

* Implement `buildTargetUrl(metricTarget, globalFilters)`
* Implement mapping table:

  * `journey_status` → `journey_status` (same)
  * `active_alerts` → `active_alerts[]` (array support)
  * `delay_in_minutes` → whatever list page expects

## 2.8 QA checklist (must do)

* Verify each metric click opens correct page with correct filters.
* Compare dashboard count vs list page total count.
* Test slow network + partial failure.
* Test different branches/locations.
* Test permissions (hide tabs).

---

## 3) Deliverables

1. Working Summary Dashboard page with 4 tabs
2. Metrics registry config file (easy to extend)
3. API integration + error handling
4. Webhook refresh support (or polling if webhook infra not ready)
5. Plug-in route integrated into FT TMS build

---

Design system
# FT Design System - AI Rules
# Version: 4.15.14 | Components: 124

## IMPORTS
css: import 'ft-design-system/styles';
components: import { Button, Input, Table } from 'ft-design-system';
provider: import { FTProvider } from 'ft-design-system';

## FORBIDDEN (Never generate these)
- Arbitrary background/text/border with hex: bg-[ #HEX ], text-[ #HEX ]
- Arbitrary with CSS vars: bg-[ var(--name) ], text-[ var(--name) ]
- Dimension overrides on components: h-[ X ], w-[ X ], rounded-[ X ], p-[ X ]
- CSS vars with underscore: var(--some_token)
- CSS vars with slash: var(--some/token)
- Hardcoded font: fontSize: '16px'

## REQUIRED
- Components are AI-protected by default
- Use size prop: size="sm"|"md"|"lg"
- Use variant prop for styling
- Table rows must have 'id' field
- Table columns use 'title' not 'header'

## COMPONENT API
Button: variant=primary|secondary|destructive|text|link|ghost|dashed, size=sm|md|lg
Input: label, placeholder, error, helperText, size=sm|md|lg
Badge: variant=primary|secondary|danger|success|warning|neutral (NOT 'error')
Table: columns=[{key,title}], data=[{id,...}]
Modal: open, onOpenChange, children=ModalContent

## COLORS (use Tailwind classes)
primary-700=#434F64 → bg-primary-700
critical=#ff3532 → text-critical
positive=#00c637 → text-positive

## TYPOGRAPHY (rem-based)
text-xs-rem=12px, text-sm-rem=14px, text-md-rem=16px
text-lg-rem=20px, text-xl-rem=24px, text-xxl-rem=28px

## EXAMPLES
<Button variant="primary" size="md">Save</Button>
<Input label="Email" size="md" />
<Table columns={[{key:'name',title:'Name'}]} data={[{id:1,name:'John'}]} />
<Badge variant="danger">Error</Badge>
