# Summary Dashboard - Data Points Report

**Generated:** January 18, 2026  
**Scope:** All data points visible in Summary Dashboard and Order Details Drawer, including new components (OrderStatusMetrics, BatchOverview), plus Journeys/Shipments/Invoices tabs and filters.

---

## Summary Dashboard - Page-Level Data Points

**Source:** `src/modules/summary-dashboard/pages/SummaryDashboardPage.tsx`

### 1) Title Bar (Top Header)

**Source Component:** `src/modules/summary-dashboard/components/TitleBar.tsx`  
**Hook:** `useConsignors()` → `consignorApiService.ts`

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Summary Dashboard → Title Bar | Filter | Location dropdown options | | |
| Summary Dashboard → Title Bar | Filter | Selected location (label/name) | | |
| Summary Dashboard → Title Bar | Filter | Search input (text) | | |

### 2) Filter Pane (Drawer)

**Source Component:** `src/modules/summary-dashboard/components/FilterPane.tsx`  
**Hook:** `useTransporters()` → `transporterApiService.ts`

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Summary Dashboard → Filter Pane | Filter | Transporter dropdown options | | |
| Summary Dashboard → Filter Pane | Filter | Selected transporter | | |

### 3) Tabs + View Controls

**Source:** `SummaryDashboardPage.tsx` and `TabControls.tsx`

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Summary Dashboard → Tabs | Navigation | Orders / Journeys / Shipments / Invoices tabs | | |
| Summary Dashboard → View Controls | View Mode | Grid/Table toggle | | |
| Summary Dashboard → View Controls | Filters | Priority filter (Shipments tab) | | |

### 4) Quick Filters (Orders Tab)

**Source:** `SummaryDashboardPage.tsx`  
**Hook:** `useOrdersTableData()` → **Mock Data** (Centralized)

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Quick Filters | Trip Type | Inbound count | | |
| Orders Tab → Quick Filters | Trip Type | Outbound count | | |
| Orders Tab → Quick Filters | Trip Type | FTL count | | |
| Orders Tab → Quick Filters | Trip Type | PTL count | | |
| Orders Tab → Quick Filters | Delivery | Delivery delayed count | | |

---

## Filters Used in This Project

**Global Filters (stored in `globalFilters`):**
- **Location** (`locationId`, `locationName`) — set via Title Bar location dropdown
- **Transporter** (`transporterId`, `transporterName`) — set via Filter Pane
- **Date Range** (`dateRange.start`, `dateRange.end`) — stored in state (not currently rendered in UI)
- **Priority** (`priority`) — used in Shipments tab via TabControls

**Orders Quick Filters (Orders tab):**
- **Inbound**
- **Outbound**
- **FTL**
- **PTL**
- **Delivery Delayed**

**Other UI Filters/Controls:**
- **Search** (Title Bar input, currently no API binding)
- **View Mode** (Grid/Table toggle)
- **Outbound Sub-Option** (FTL/PTL sub-choice under Outbound quick filter)

---

## New Component: Order Status Metrics

**Source:** `src/modules/summary-dashboard/components/OrderStatusMetrics.tsx`  
**Hooks:** `useUserSettings()` + `useOrderMetrics()` from `useRealApiData.ts`  
**APIs:** Listed in `api.md`

### API Mappings
- **User Settings:** `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/configurations/user-settings`
- **Order Status Counts:** `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/status-counts?branch_fteid=...`

### Data Points

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Order Status Overview | Context | lastSelectedBranch (gates component render) | `.../configurations/user-settings` | `data.lastSelectedBranch` |
| Orders Tab → Order Status Overview | Primary KPI | Total Orders | `.../orders/status-counts` | `data.counts` (computed) |
| Orders Tab → Order Status Overview | Primary KPI | Unplanned | `.../orders/status-counts` | `data.counts.UNPLANNED` |
| Orders Tab → Order Status Overview | Primary KPI | In Progress | `.../orders/status-counts` | `data.counts.IN_PROGRESS` |
| Orders Tab → Order Status Overview | Primary KPI | Planned | `.../orders/status-counts` | `data.counts.PLANNED` |
| Orders Tab → Detailed Status Breakdown | Status | Dispatched | `.../orders/status-counts` | `data.counts.DISPATCHED` |
| Orders Tab → Detailed Status Breakdown | Status | Delivered | `.../orders/status-counts` | `data.counts.DELIVERED` |
| Orders Tab → Detailed Status Breakdown | Status | Partially Delivered | `.../orders/status-counts` | `data.counts.PARTIALLY_DELIVERED` |
| Orders Tab → Detailed Status Breakdown | Status | Failed | `.../orders/status-counts` | `data.counts.FAILED` |
| Orders Tab → Detailed Status Breakdown | Exceptions | Deleted | `.../orders/status-counts` | `data.counts.DELETED` |
| Orders Tab → Summary Stats | Summary | Active Orders | `.../orders/status-counts` | computed from `UNPLANNED + IN_PROGRESS + PLANNED + PARTIALLY_PLANNED` |
| Orders Tab → Summary Stats | Summary | Completed Orders | `.../orders/status-counts` | computed from `DELIVERED + PARTIALLY_DELIVERED` |
| Orders Tab → Summary Stats | Summary | In Transit | `.../orders/status-counts` | computed from `DISPATCHED` |
| Orders Tab → Summary Stats | Summary | Issues | `.../orders/status-counts` | computed from `FAILED + DELETED` |

---

## New Component: Batch Overview

**Source:** `src/modules/summary-dashboard/components/BatchOverview.tsx`  
**Hook:** `useBatchData()` in `useRealApiData.ts`  
**API:** Listed in `api.md`

**API Endpoint:** `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/batches/master-search`

### Data Points

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Batch Metrics | KPI | Total Batches | `.../batches/master-search` | `data.pagination.totalItems` |
| Orders Tab → Batch Metrics | KPI | Avg Orders/Batch | `.../batches/master-search` | computed from `data.data[].numberOfOrders` |
| Orders Tab → Batch Metrics | KPI | Orders in Current Batches | `.../batches/master-search` | sum of `data.data[].numberOfOrders` |
| Orders Tab → Batch Table | Table | Batch Name | `.../batches/master-search` | `data.data[].name` |
| Orders Tab → Batch Table | Table | Batch ID (fteid) | `.../batches/master-search` | `data.data[].fteid` |
| Orders Tab → Batch Table | Table | Orders | `.../batches/master-search` | `data.data[].numberOfOrders` |
| Orders Tab → Batch Table | Table | Source Type | `.../batches/master-search` | `data.data[].sourceType` |
| Orders Tab → Batch Table | Table | Created At | `.../batches/master-search` | `data.data[].createdAt` |
| Orders Tab → Batch Table | Table | Branch FTEID | `.../batches/master-search` | `data.data[].branchFteid` |
| Orders Tab → Batch Table | Pagination | Total Items / Pages | `.../batches/master-search` | `data.pagination.*` |

---

## Orders Table (Orders Tab → Table View)

**Source:** `src/modules/summary-dashboard/components/OrdersTableView.tsx`  
**Hook:** `useOrdersTableData()` → **Mock Data** (Centralized)

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Table | Header | Orders available count | | |
| Orders Tab → Table | Column | Order ID | | |
| Orders Tab → Table | Column | Consignor | | |
| Orders Tab → Table | Column | Consignee | | |
| Orders Tab → Table | Column | Route | | |
| Orders Tab → Table | Column | Trip Type | | |
| Orders Tab → Table | Column | Stage | | |
| Orders Tab → Table | Column | Status | | |
| Orders Tab → Table | Column | Related ID (type + id) | | |
| Orders Tab → Table | Column | Delivery ETA | | |
| Orders Tab → Table | Column | Delivery Status (On time/Delayed) | | |

---

## Order Details Drawer (Table Row Action)

**Source:** `src/modules/summary-dashboard/components/OrderDetailsDrawer.tsx`  
**Hook:** `useOrderDrawerData()` → **Mock Data** (Centralized)

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Header | Navigation | Order Details title | | |
| Drawer → Tabs | Navigation | Details / Timeline / Comments tabs | | |

### Details Tab
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Details | Summary | SO Number | | |
| Drawer → Details | Summary | Total Weight | | |
| Drawer → Details | Summary | No. of DOs | | |
| Drawer → Details | Summary | No. of SKUs | | |
| Drawer → Details | Summary | Total Cost | | |
| Drawer → Details | Summary | Created At | | |
| Drawer → Details | Status | Stage | | |
| Drawer → Details | Status | Status | | |
| Drawer → Details | Status | Delivery Status (On time/Delayed + delay) | | |
| Drawer → Details | Status | ETA / STA | | |
| Drawer → Details | Status | Next Milestone + ETA | | |
| Drawer → Details | Party | Sender (name, address, GSTIN, email, phone) | | |
| Drawer → Details | Party | Ship To (name, address, GSTIN, email, phone) | | |
| Drawer → Details | Party | Bill To (name, address, GSTIN, email, phone) | | |
| Drawer → Details | Identifiers | Planning ID | | |
| Drawer → Details | Identifiers | Indent ID | | |
| Drawer → Details | Identifiers | Journey ID | | |
| Drawer → Details | Identifiers | ePOD ID | | |
| Drawer → Details | Identifiers | Invoice Number | | |

### Timeline Tab
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Timeline | Timeline | Date group headers | | |
| Drawer → Timeline | Timeline | Event label | | |
| Drawer → Timeline | Timeline | Event sublabel | | |
| Drawer → Timeline | Timeline | Event timestamp | | |
| Drawer → Timeline | Timeline | Duration / delay | | |
| Drawer → Timeline | Timeline | Location | | |

### Comments Tab
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Comments | List | Author name + initials | | |
| Drawer → Comments | List | Comment timestamp | | |
| Drawer → Comments | List | Comment message | | |
| Drawer → Comments | Add | Comment type (template/custom) | | |
| Drawer → Comments | Add | Template options | | |
| Drawer → Comments | Add | Comment text | | |

---

## Journeys Tab (Grid View → Lifecycle Board)

**Source:** `metricsRegistry.ts`, `useMetricsData()`, `NewLifecycleBoard.tsx`  
**Data Source:** `metricsService.ts` (mocked counts)

### Quick KPIs
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Journeys Tab → Quick KPIs | KPI | Total Journeys | | |
| Journeys Tab → Quick KPIs | KPI | Active | | |
| Journeys Tab → Quick KPIs | KPI | Delayed | | |
| Journeys Tab → Quick KPIs | KPI | Exceptions | | |

### Lifecycle Stage Headers (Totals)
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Journeys Tab → Stage Header | Planned | Planned total | | |
| Journeys Tab → Stage Header | In Transit | In Transit total | | |
| Journeys Tab → Stage Header | Completed | Completed total | | |
| Journeys Tab → Stage Header | Closed | Closed total | | |

### Milestones / Status / Exceptions
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Journeys Tab → Planned | Status | On Schedule | | |
| Journeys Tab → Planned | Status | Late Start | | |
| Journeys Tab → Planned | Exceptions | Pending Vehicle Assignment | | |
| Journeys Tab → In Transit | Status | On Time | | |
| Journeys Tab → In Transit | Status | Delayed | | |
| Journeys Tab → In Transit | Exceptions | Route Deviation | | |
| Journeys Tab → In Transit | Exceptions | Long Stoppage | | |
| Journeys Tab → In Transit | Exceptions | E‑Way Bill Expiring | | |
| Journeys Tab → Completed | Status | Delivered On Time | | |
| Journeys Tab → Completed | Status | Late Delivery | | |

---

## Shipments Tab (Grid View → Lifecycle Board)

**Source:** `metricsRegistry.ts`, `useMetricsData()`, `NewLifecycleBoard.tsx`  
**Data Source:** `metricsService.ts` (mocked counts)

### Quick KPIs
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Shipments Tab → Quick KPIs | KPI | Total Shipments | | |
| Shipments Tab → Quick KPIs | KPI | In Transit | | |
| Shipments Tab → Quick KPIs | KPI | Delayed | | |
| Shipments Tab → Quick KPIs | KPI | Delivered | | |

### Lifecycle Stage Headers (Totals)
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Shipments Tab → Stage Header | Booked | Booked total | | |
| Shipments Tab → Stage Header | Picked Up | Picked Up total | | |
| Shipments Tab → Stage Header | In Transit | In Transit total | | |
| Shipments Tab → Stage Header | Delivered | Delivered total | | |

### Status (In Transit)
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Shipments Tab → In Transit | Status | On Time | | |
| Shipments Tab → In Transit | Status | Delayed | | |

---

## Invoices Tab (Grid View → Lifecycle Board)

**Source:** `metricsRegistry.ts`, `useMetricsData()`, `NewLifecycleBoard.tsx`  
**Data Source:** `metricsService.ts` (mocked counts)

### Quick KPIs
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Invoices Tab → Quick KPIs | KPI | Total Invoices | | |
| Invoices Tab → Quick KPIs | KPI | Pending Approval | | |
| Invoices Tab → Quick KPIs | KPI | Disputed | | |
| Invoices Tab → Quick KPIs | KPI | Paid | | |

### Lifecycle Stage Headers (Totals)
| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Invoices Tab → Stage Header | Draft | Draft total | | |
| Invoices Tab → Stage Header | Pending Approval | Pending Approval total | | |
| Invoices Tab → Stage Header | Approved | Approved total | | |
| Invoices Tab → Stage Header | Paid | Paid total | | |

---

## API Coverage Summary

### APIs Currently Used (from api.md)
1. **User Settings**  
   - Endpoint: `.../configurations/user-settings`  
   - Used by: `OrderStatusMetrics` component (to get `lastSelectedBranch`)
2. **Order Status Counts**  
   - Endpoint: `.../orders/status-counts?branch_fteid=...`  
   - Used by: `OrderStatusMetrics` component (all metrics)
3. **Batch Search**  
   - Endpoint: `.../batches/master-search`  
   - Used by: `BatchOverview` component (batch list + pagination)

### APIs Defined in api.md but NOT Currently Used
1. **Custom Data Template**  
   - Endpoint: `.../custom-data-template/order`  
   - Status: Defined but not integrated in UI
2. **Selected Orders Views**  
   - Endpoint: `.../views/selected/orders`  
   - Status: Defined but not integrated in UI
3. **Company Hierarchy**  
   - Endpoint: `.../external-services/eqs/company/child`  
   - Status: Defined but not integrated in UI
4. **Access Control Permissions**  
   - Endpoint: `.../access-control/v1/accessControl/permissions`  
   - Status: Defined but not integrated in UI (permissions currently mocked)

---

## Unused Endpoints → Potential UI Field Mapping (Per Data Point)

This section lists **every data point** and the **unused api.md endpoints** that could populate it once those APIs are wired. Blank cells indicate “no matching unused endpoint in api.md for this field yet.”

### Title Bar / Filters / Tabs
| Data Point | UI Location | Potential Unused Endpoint (api.md) | Notes |
|-----------|-------------|-------------------------------------|-------|
| Location dropdown options | Title Bar | `/external-services/eqs/company/child` | Could map branches to locations |
| Selected location | Title Bar | `/external-services/eqs/company/child` | Depends on branch mapping |
| Search input | Title Bar |  | No search API in api.md |
| Transporter dropdown options | Filter Pane |  | No transporter API in api.md |
| Selected transporter | Filter Pane |  | No transporter API in api.md |
| Tabs visibility (Orders/Journeys/Shipments/Invoices) | Tabs | `/access-control/v1/accessControl/permissions` | Could drive permissions |
| View mode toggle | View Controls |  | UI state only |
| Priority filter (shipments) | View Controls |  | UI state only |
| Inbound/Outbound/FTL/PTL/Delivery Delayed counts | Orders Quick Filters | `/views/selected/orders` | Could be derived if view API returns counts |

### Orders Table
| Data Point | UI Location | Potential Unused Endpoint (api.md) | Notes |
|-----------|-------------|-------------------------------------|-------|
| Orders available count | Orders Table | `/views/selected/orders` | Could surface count in view API |
| Order ID / Consignor / Consignee / Route / Trip Type / Stage / Status | Orders Table | `/views/selected/orders` | If view API returns row data |
| Related ID | Orders Table | `/custom-data-template/order` | If returned as custom field |
| Delivery ETA / Delivery Status | Orders Table | `/custom-data-template/order` | If returned as custom field |

### Order Details Drawer (Details / Timeline / Comments)
| Data Point | UI Location | Potential Unused Endpoint (api.md) | Notes |
|-----------|-------------|-------------------------------------|-------|
| SO Number / Weight / DOs / SKUs / Cost / Created At | Drawer → Details | `/custom-data-template/order` | If template exposes these fields |
| Stage / Status / ETA / STA / Next Milestone | Drawer → Details | `/custom-data-template/order` | Requires detailed order API not in api.md |
| Party details (Sender/Ship To/Bill To) | Drawer → Details | `/custom-data-template/order` | If addresses are stored as custom fields |
| Planning/Indent/Journey/ePOD/Invoice IDs | Drawer → Details | `/custom-data-template/order` | If IDs are stored as custom fields |
| Timeline events | Drawer → Timeline |  | No timeline API in api.md |
| Comments list / templates / add comment | Drawer → Comments |  | No comments API in api.md |

### Journeys / Shipments / Invoices Metrics
| Data Point | UI Location | Potential Unused Endpoint (api.md) | Notes |
|-----------|-------------|-------------------------------------|-------|
| Journeys KPIs & lifecycle metrics | Journeys Tab |  | No journeys API in api.md |
| Shipments KPIs & lifecycle metrics | Shipments Tab |  | No shipments API in api.md |
| Invoices KPIs & lifecycle metrics | Invoices Tab |  | No invoices API in api.md |

---

## Notes
- **Mock Data Usage:** Orders table, order details drawer (all tabs), and quick filter counts currently use centralized mock data from `ordersTableMock.ts` and `ordersMockService.ts`.
- **Real API Usage:** Order Status Metrics and Batch Overview use real APIs from `realApiService.ts`.
- **Exception Handling:** Deleted orders are displayed under Exceptions for now.
- **Empty API Fields:** Fields left blank indicate APIs are not yet defined in `api.md` or are using mock data.
- **Component Locations:** All component file paths are relative to `src/modules/summary-dashboard/`.

---

**Last Updated:** January 18, 2026
# Summary Dashboard - Data Points Report

**Generated:** January 18, 2026  
**Scope:** All data points visible in Summary Dashboard and Order Details Drawer, including new components (OrderStatusMetrics, BatchOverview)

---

## Summary Dashboard - Page-Level Data Points

**Source:** `src/modules/summary-dashboard/pages/SummaryDashboardPage.tsx`

### 1. Title Bar (Top Header)

**Source Component:** `src/modules/summary-dashboard/components/TitleBar.tsx`  
**Hook:** `useConsignors()` → `consignorApiService.ts`

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Summary Dashboard → Title Bar | Filter | **Location dropdown** options | | |
| Summary Dashboard → Title Bar | Filter | **Selected location** (label/name) | | |
| Summary Dashboard → Title Bar | Filter | **Search input** (text) | | |

### 2. Filter Pane (Drawer)

**Source Component:** `src/modules/summary-dashboard/components/FilterPane.tsx`  
**Hook:** `useTransporters()` → `transporterApiService.ts`

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Summary Dashboard → Filter Pane | Filter | **Transporter dropdown** options | | |
| Summary Dashboard → Filter Pane | Filter | **Selected transporter** | | |

### 3. Tabs + View Controls

**Source:** `SummaryDashboardPage.tsx` and `TabControls.tsx`

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Summary Dashboard → Tabs | Navigation | Orders / Journeys / Shipments / Invoices tabs | | |
| Summary Dashboard → View Controls | View Mode | Grid/Table toggle | | |
| Summary Dashboard → View Controls | Filters | Priority filter (Shipments tab) | | |

### 4. Quick Filters (Orders Tab)

**Source:** `SummaryDashboardPage.tsx`  
**Hook:** `useOrdersTableData()` → **Mock Data** (Centralized)

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Quick Filters | Trip Type | **Inbound count** | | |
| Orders Tab → Quick Filters | Trip Type | **Outbound count** | | |
| Orders Tab → Quick Filters | Trip Type | **FTL count** | | |
| Orders Tab → Quick Filters | Trip Type | **PTL count** | | |
| Orders Tab → Quick Filters | Delivery | **Delivery delayed count** | | |

---

## New Component: Order Status Metrics

**Source:** `src/modules/summary-dashboard/components/OrderStatusMetrics.tsx`  
**Hooks:** `useUserSettings()` + `useOrderMetrics()` from `useRealApiData.ts`  
**APIs:** Listed in `api.md`

### API Mappings:

- **User Settings:** `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/configurations/user-settings`
- **Order Status Counts:** `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/status-counts?branch_fteid=...`

### Data Points:

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Order Status Overview | Context | **lastSelectedBranch** (gates component render) | `.../configurations/user-settings` | `data.lastSelectedBranch` |
| Orders Tab → Order Status Overview | Primary KPI | **Total Orders** | `.../orders/status-counts` | `data.counts` (computed) |
| Orders Tab → Order Status Overview | Primary KPI | **Unplanned** | `.../orders/status-counts` | `data.counts.UNPLANNED` |
| Orders Tab → Order Status Overview | Primary KPI | **In Progress** | `.../orders/status-counts` | `data.counts.IN_PROGRESS` |
| Orders Tab → Order Status Overview | Primary KPI | **Planned** | `.../orders/status-counts` | `data.counts.PLANNED` |
| Orders Tab → Detailed Status Breakdown | Status | **Dispatched** | `.../orders/status-counts` | `data.counts.DISPATCHED` |
| Orders Tab → Detailed Status Breakdown | Status | **Delivered** | `.../orders/status-counts` | `data.counts.DELIVERED` |
| Orders Tab → Detailed Status Breakdown | Status | **Partially Delivered** | `.../orders/status-counts` | `data.counts.PARTIALLY_DELIVERED` |
| Orders Tab → Detailed Status Breakdown | Status | **Failed** | `.../orders/status-counts` | `data.counts.FAILED` |
| Orders Tab → Detailed Status Breakdown | Exceptions | **Deleted** | `.../orders/status-counts` | `data.counts.DELETED` |
| Orders Tab → Summary Stats | Summary | **Active Orders** | `.../orders/status-counts` | computed from `UNPLANNED + IN_PROGRESS + PLANNED + PARTIALLY_PLANNED` |
| Orders Tab → Summary Stats | Summary | **Completed Orders** | `.../orders/status-counts` | computed from `DELIVERED + PARTIALLY_DELIVERED` |
| Orders Tab → Summary Stats | Summary | **In Transit** | `.../orders/status-counts` | computed from `DISPATCHED` |
| Orders Tab → Summary Stats | Summary | **Issues** | `.../orders/status-counts` | computed from `FAILED + DELETED` |

---

## New Component: Batch Overview

**Source:** `src/modules/summary-dashboard/components/BatchOverview.tsx`  
**Hook:** `useBatchData()` in `useRealApiData.ts`  
**API:** Listed in `api.md`

**API Endpoint:** `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/batches/master-search`

### Data Points:

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Batch Metrics | KPI | **Total Batches** | `.../batches/master-search` | `data.pagination.totalItems` |
| Orders Tab → Batch Metrics | KPI | **Avg Orders/Batch** | `.../batches/master-search` | computed from `data.data[].numberOfOrders` |
| Orders Tab → Batch Metrics | KPI | **Orders in Current Batches** | `.../batches/master-search` | sum of `data.data[].numberOfOrders` |
| Orders Tab → Batch Table | Table | **Batch Name** | `.../batches/master-search` | `data.data[].name` |
| Orders Tab → Batch Table | Table | **Batch ID (fteid)** | `.../batches/master-search` | `data.data[].fteid` |
| Orders Tab → Batch Table | Table | **Orders** | `.../batches/master-search` | `data.data[].numberOfOrders` |
| Orders Tab → Batch Table | Table | **Source Type** | `.../batches/master-search` | `data.data[].sourceType` |
| Orders Tab → Batch Table | Table | **Created At** | `.../batches/master-search` | `data.data[].createdAt` |
| Orders Tab → Batch Table | Table | **Branch FTEID** | `.../batches/master-search` | `data.data[].branchFteid` |
| Orders Tab → Batch Table | Pagination | **Total Items / Pages** | `.../batches/master-search` | `data.pagination.*` |

---

## Orders Table (Orders Tab → Table View)

**Source:** `src/modules/summary-dashboard/components/OrdersTableView.tsx`  
**Hook:** `useOrdersTableData()` → **Mock Data** (Centralized)

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Orders Tab → Table | Header | **Orders available** count | | |
| Orders Tab → Table | Column | **Order ID** | | |
| Orders Tab → Table | Column | **Consignor** | | |
| Orders Tab → Table | Column | **Consignee** | | |
| Orders Tab → Table | Column | **Route** | | |
| Orders Tab → Table | Column | **Trip Type** | | |
| Orders Tab → Table | Column | **Stage** | | |
| Orders Tab → Table | Column | **Status** | | |
| Orders Tab → Table | Column | **Related ID** (type + id) | | |
| Orders Tab → Table | Column | **Delivery ETA** | | |
| Orders Tab → Table | Column | **Delivery Status** (On time/Delayed) | | |

---

## Order Details Drawer (Table Row Action)

**Source:** `src/modules/summary-dashboard/components/OrderDetailsDrawer.tsx`  
**Hook:** `useOrderDrawerData()` → **Mock Data** (Centralized)

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Header | Navigation | **Order Details title** | | |
| Drawer → Tabs | Navigation | **Details / Timeline / Comments tabs** | | |

### Details Tab:

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Details | Summary | **SO Number** | | |
| Drawer → Details | Summary | **Total Weight** | | |
| Drawer → Details | Summary | **No. of DOs** | | |
| Drawer → Details | Summary | **No. of SKUs** | | |
| Drawer → Details | Summary | **Total Cost** | | |
| Drawer → Details | Summary | **Created At** | | |
| Drawer → Details | Status | **Stage** | | |
| Drawer → Details | Status | **Status** | | |
| Drawer → Details | Status | **Delivery Status** (On time/Delayed + delay) | | |
| Drawer → Details | Status | **ETA / STA** | | |
| Drawer → Details | Status | **Next Milestone + ETA** | | |
| Drawer → Details | Party | **Sender** (name, address, GSTIN, email, phone) | | |
| Drawer → Details | Party | **Ship To** (name, address, GSTIN, email, phone) | | |
| Drawer → Details | Party | **Bill To** (name, address, GSTIN, email, phone) | | |
| Drawer → Details | Identifiers | **Planning ID** | | |
| Drawer → Details | Identifiers | **Indent ID** | | |
| Drawer → Details | Identifiers | **Journey ID** | | |
| Drawer → Details | Identifiers | **ePOD ID** | | |
| Drawer → Details | Identifiers | **Invoice Number** | | |

### Timeline Tab:

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Timeline | Timeline | **Date group headers** | | |
| Drawer → Timeline | Timeline | **Event label** | | |
| Drawer → Timeline | Timeline | **Event sublabel** | | |
| Drawer → Timeline | Timeline | **Event timestamp** | | |
| Drawer → Timeline | Timeline | **Duration / delay** | | |
| Drawer → Timeline | Timeline | **Location** | | |

### Comments Tab:

| Page/Section | Stage/Category | Data Point | API (from api.md) | API Field |
|--------------|----------------|------------|-------------------|-----------|
| Drawer → Comments | List | **Author name + initials** | | |
| Drawer → Comments | List | **Comment timestamp** | | |
| Drawer → Comments | List | **Comment message** | | |
| Drawer → Comments | Add | **Comment type** (template/custom) | | |
| Drawer → Comments | Add | **Template options** | | |
| Drawer → Comments | Add | **Comment text** | | |

---

## API Coverage Summary

### APIs Currently Used (from api.md):

1. **User Settings**
   - Endpoint: `.../configurations/user-settings`
   - Used by: `OrderStatusMetrics` component (to get `lastSelectedBranch`)

2. **Order Status Counts**
   - Endpoint: `.../orders/status-counts?branch_fteid=...`
   - Used by: `OrderStatusMetrics` component (all metrics)

3. **Batch Search**
   - Endpoint: `.../batches/master-search`
   - Used by: `BatchOverview` component (batch list + pagination)

### APIs Defined in api.md but NOT Currently Used:

1. **Custom Data Template**
   - Endpoint: `.../custom-data-template/order`
   - Status: Defined but not integrated in UI

2. **Selected Orders Views**
   - Endpoint: `.../views/selected/orders`
   - Status: Defined but not integrated in UI

3. **Company Hierarchy**
   - Endpoint: `.../external-services/eqs/company/child`
   - Status: Defined but not integrated in UI

4. **Access Control Permissions**
   - Endpoint: `.../access-control/v1/accessControl/permissions`
   - Status: Defined but not integrated in UI (permissions currently mocked)

---

## Notes

- **Mock Data Usage:** Orders table, order details drawer (all tabs), and quick filter counts currently use centralized mock data from `ordersTableMock.ts` and `ordersMockService.ts`
- **Real API Usage:** Order Status Metrics and Batch Overview use real APIs from `realApiService.ts`
- **Exception Handling:** Deleted orders are displayed under Exceptions for now
- **Empty API Fields:** Fields left blank indicate APIs are not yet defined in `api.md` or are using mock data
- **Component Locations:** All component file paths are relative to `src/modules/summary-dashboard/`

---

**Last Updated:** January 18, 2026
