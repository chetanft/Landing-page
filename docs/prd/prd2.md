# FT TMS Summary Dashboard - Orders Data Sourcing PRD v2

## 1. Context
This document captures the updated plan and the Orders tab data requirements for a TMS (not OMS). Orders can be sourced in two modes:
- Dispatch Planning enabled: orders are sent to FT TMS (PO/SO/DO) and must be enriched for stage/milestone/status.
- Dispatch Planning disabled: orders are derived from other FT TMS APIs (journey, PTL, indent, ePOD, invoicing) and normalized for the Orders tab.

## 2. Plan (Phased)

### Phase 1: Requirements + data model (half day)
- Define tenant configuration flag and unified OrderRow schema (required + optional fields).
- Specify precedence rules and field mapping table.

### Phase 2: Data layer (1-2 days)
- Build Dispatch Planning ingestion + enrichment flow.
- Build Non-Dispatch Planning derivation flow from journeys/PTL/indent/ePOD/invoices.
- Normalize both into the unified order model.

### Phase 3: UI + integration (1 day)
- Update Orders tab column view + table view to consume the unified model.
- Add stage/milestone/status rendering rules.

### Phase 4: QA + validation (half day)
- Verify order counts/stages for both modes and partial payloads.
- Validate navigation filters from derived orders.

### Phase 5: Report alignment (1-2 hours)
- Update PROJECT_ANALYSIS_REPORT.md with missing risk sections and corrected maturity language.
- Add Known Limitations + Future Improvements tied to PRD.

### Phase 6: Product/tech spec hardening (half day)
- Define filter mapping table and URL contract rules.
- Define webhook event handling rules (retry/debounce/fallback).
- Define mismatch logging criteria.

### Phase 7: Implementation changes (1-2 days)
- Build filter mapper + tests.
- Add webhook handling + polling fallback.
- Add mismatch logging + basic metrics batching/caching guardrails.

### Phase 8: QA and validation (half day)
- Run through PRD QA checklist and verify counts vs list pages.
- Validate back/forward behavior and error isolation per widget.

## 3. Tenant Configuration
- Required flag: dispatch_planning_enabled (boolean).
- Source: dedicated tenant config/feature flags endpoint (not permissions alone).
- Fallback (soft): if planning permissions exist, treat as "possible" planning-enabled, but still fetch actual config.

## 4. Unified Data Model

### 4.1 OrderRow (Orders table)
Required fields (current UI):
- id
- orderId (SO/DO/PO display id)
- consignorName
- consigneeName
- route
- tripType (FTL/PTL/Inbound/Outbound/Unplanned)
- stage
- status
- relatedIdType (Indent/Trip/EPOD/INV/Ref/AWB)
- relatedId
- deliveryStatus (delayed/on_time)
Optional fields (current UI):
- milestone
- deliveryEta
- delayDays
- dispatchDate
- customData (dynamic fields from custom-data-template)

### 4.2 Order Details (drawer)
Current UI fields:
- Summary: soNumber, totalCost, currency, totalWeight, totalWeightUom, doCount, skuCount, createdAt
- Status: status, deliveryStatus, delayMinutes, eta, sta, nextMilestoneLabel, nextMilestoneEta
- Parties: sender, shipTo, billTo -> name, address, gstin, email, phone
- Identifiers: planningId, indentId, journeyId, epodId, invoiceNumber
- Timeline: label, subLabel, timestamp, durationMinutes, delayMinutes, location, status, type
- Comments: authorName, authorInitials, createdAt, message

### 4.3 OrderLink (many-to-many linkage)
An order can be split across multiple FTL/PTL entities or clubbed into one. Represent with:
- orderKey (stable SO/DO/PO key)
- entityType: journey | shipment | invoice | indent | epod
- entityId
- allocationType: split | clubbed | single
- quantityShare or weightShare (optional)

## 5. Data Sourcing Modes

### 5.1 Dispatch Planning flow (primary)
Use planning/order APIs as the source of truth and enrich missing fields.

Primary APIs (existing in code):
- Orders list: /ptl-booking/api/v1/order/myOrders
- Orders bucket summary: /ptl-booking/api/v1/order/myOrdersBucketSummary
- Order details: /ptl-booking/api/v1/order/{id}/details
- Order comments: /ptl-booking/api/v1/order/{id}/comments
- Custom data template: /planning-engine-service/v1/api/custom-data-template/order

Enrichment logic:
- tripType derived from explicit tripType/orderType, else infer from journeyId (FTL) or shipmentId (PTL).

### 5.2 Non-Dispatch Planning flow (derived)
Orders are derived from journey/PTL/indent/ePOD/invoicing APIs. Exact endpoints must be confirmed with backend; use existing FT TMS APIs where available.

Suggested sources (to confirm):
- Journeys: /journey-snapshot/v1/journeys/search or /journey-snapshot/v1/journeys/count
- Shipments (PTL): /ptl-booking/api/v1/shipments/search
- Indents: /cyclops/indent/consignor/list
- ePOD: /trip-snapshot/api/v1/epods
- Invoices: /freight-invoicing/api/v1/invoices/search

Derivation approach:
- Extract order references (SO/DO/PO) from each API response.
- Build a unified orderKey (priority: SO -> DO -> PO -> fallback composite of refId + branch).
- Group by orderKey and merge fields using precedence rules.
- Create OrderLink records for each related entity to preserve many-to-many.

## 6. Field Mapping (UI -> API/Logic)

### 6.1 Orders Table
- orderId: dispatch -> order list (so_number/do_number/orderId), non-dispatch -> extracted SO/DO/PO from journey/shipment/invoice payload
- consignorName: dispatch -> order list; non-dispatch -> journey/indent/shipper fields
- consigneeName: dispatch -> order list; non-dispatch -> journey/shipment/consignee fields
- route: dispatch -> order list origin/destination; non-dispatch -> journey route or shipment legs
- tripType: dispatch -> order tripType/orderType; non-dispatch -> if journeyId then FTL, if shipmentId then PTL, else Unplanned
- stage: dispatch -> order list; non-dispatch -> derived from latest linked entity stage (see Stage Rules)
- milestone: dispatch -> order list; non-dispatch -> journey/shipment milestone or derived from latest event
- status: dispatch -> order status; non-dispatch -> mapped from entity status (journey_status/shipment_status/invoice_status)
- relatedIdType/relatedId: dispatch -> indentId/journeyId/epodId/invoiceNumber; non-dispatch -> primary linked entity
- deliveryStatus/delayDays/deliveryEta: dispatch -> order list; non-dispatch -> journey ETA/delay or shipment ETA/delay
- dispatchDate: dispatch -> order list; non-dispatch -> journey dispatch time or shipment pickup
- customData: dispatch -> custom-data-template fields from order list; non-dispatch -> not available unless provided by source

### 6.2 Order Details Drawer
- soNumber: dispatch -> order details; non-dispatch -> orderKey or sales order from linked entities
- totalCost/currency: dispatch -> order details; non-dispatch -> invoice API (if linked)
- totalWeight/totalWeightUom: dispatch -> order details; non-dispatch -> shipment/journey totals
- doCount/skuCount: dispatch -> order details; non-dispatch -> derived by aggregating DO/SKU from shipments/invoices
- createdAt: dispatch -> order details; non-dispatch -> earliest created_at across linked entities
- status: dispatch -> order details; non-dispatch -> derived using Stage Rules
- deliveryStatus/delayMinutes: dispatch -> order details; non-dispatch -> journey/shipment delay metrics
- eta/sta: dispatch -> order details; non-dispatch -> journey ETA/STA or shipment ETA/STA
- nextMilestoneLabel/ETA: dispatch -> order details; non-dispatch -> next journey/shipment milestone
- parties (sender/shipTo/billTo): dispatch -> order details; non-dispatch -> journey/indent/invoice party fields
- identifiers: dispatch -> order details; non-dispatch -> linked entity ids
- comments: dispatch -> order comments; non-dispatch -> optional (if supported)

## 7. Stage, Milestone, Status Rules

### 7.1 Precedence rules (example)
1. Delivered/Closed
2. In Transit
3. Planned/Assigned
4. Created/Unplanned
5. Unknown

When multiple linked entities exist:
- Choose the highest-precedence stage among linked entities.
- If conflicting stages at same precedence, show "Mixed" in table and show breakdown in details.

### 7.2 Many-to-many handling
- One order can map to multiple journeys/shipments/invoices (split) or multiple orders can map to one journey/shipment (clubbed).
- Always keep OrderLink records to preserve relationships for drill-down.
- Counts in Orders tab are by distinct orderKey, not by linked entities.

## 8. Open Questions
- Exact non-dispatch APIs and payload shapes for journey/ptl/invoice order references.
- Canonical orderKey for non-dispatch customers (SO/DO/PO priority).
- UI behavior for mixed stages and multi-vehicle allocations.
- Which entity drives "status" when multiple linked entities are present.
