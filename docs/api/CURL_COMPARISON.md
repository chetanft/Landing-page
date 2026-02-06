# Curl Command Comparison

## Overview
Comparison between production API call and local proxy API call for PTL booking orders endpoints.

---

## Curl 1: Production API (`myOrders`)

**URL:**
```
https://api.freighttiger.com/api/ptl-booking/api/v1/order/myOrders?page=1&size=10&sort%5Bsort_by%5D=created_at&sort%5Bsort_by_order%5D=DESC
```

**Endpoint:** `/api/ptl-booking/api/v1/order/myOrders`

**Query Parameters:**
- `page=1` - Pagination page number
- `size=10` - Page size (items per page)
- `sort[sort_by]=created_at` - Sort field (URL encoded)
- `sort[sort_by_order]=DESC` - Sort order (URL encoded)

**Method:** GET (implied)

**Key Headers:**
- `authorization: Bearer <token>` - JWT token with full user context
- `accept: application/json, text/plain, */*`
- `content-type: application/json`
- `origin: https://www.freighttiger.com`
- Standard browser security headers (sec-ch-ua, sec-fetch-*)

**Authorization Token Claims (decoded):**
- `ucv.id`: 126798
- `ucv.guid`: USR-6e349eca-c0f0-454f-b908-ababeee47785
- `ucv.entity_guid`: COM-79284f8f-b98c-4b90-b001-f483beb21cd0
- `ucv.companyId`: 1165261
- `ucv.groupId`: 9
- `ucv.entity_type`: CNR
- `ucv.companyType`: [{"name":"Consignor","key":"consignor"}]
- `permissions`: Includes permission masks for create, update, read
- `deskId`: DSK-a43fc454-3c03-4e60-86fd-c924aff658c8
- `role_fteid`: ROL-399a1f30-4143-4713-9c82-9a76431d1187
- `iat`: 1770206708
- `exp`: 1770208508 (30 minutes expiry)

---

## Curl 2: Local Proxy API (`myOrdersBucketSummary`)

**URL:**
```
http://localhost:5173/__ft_tms/api/ptl-booking/api/v1/order/myOrdersBucketSummary?from_booking_date=1767614109256&to_booking_date=1770206109256
```

**Endpoint:** `/api/ptl-booking/api/v1/order/myOrdersBucketSummary`

**Query Parameters:**
- `from_booking_date=1767614109256` - Start date (Unix timestamp in milliseconds)
- `to_booking_date=1770206109256` - End date (Unix timestamp in milliseconds)

**Method:** GET (implied)

**Key Headers:**
- `Authorization: Bearer <token>` - JWT token (simplified, fewer claims)
- `token: <same-token>` - Duplicate token header
- `X-FT-ORGID: 1165261` - Organization ID header
- `X-Org-Id: 1165261` - Duplicate organization ID header
- `X-User-Id: 126798` - User ID header
- `X-User-Role: user` - User role header
- `Accept: application/json`
- `Referer: http://localhost:5173/v10/summarydashboard`
- Standard browser security headers

**Authorization Token Claims (decoded):**
- `ucv.id`: 126798
- `ucv.guid`: USR-6e349eca-c0f0-454f-b908-ababeee47785
- `ucv.entity_guid`: COM-79284f8f-b98c-4b90-b001-f483beb21cd0
- `ucv.companyId`: 1165261
- `ucv.pwd_exp`: 2026-06-03T10:21:16.000Z
- **Missing:** permissions, deskId, role_fteid, groupId, entity_type, companyType
- `iat`: 1770206109
- `exp`: 1770207909 (30 minutes expiry)

---

## Key Differences

### 1. **Endpoint Purpose**
- **Curl 1:** `myOrders` - Fetches paginated list of orders with sorting
- **Curl 2:** `myOrdersBucketSummary` - Fetches summary/bucket counts for date range

### 2. **Query Parameters**
- **Curl 1:** Pagination (`page`, `size`) + Sorting (`sort_by`, `sort_by_order`)
- **Curl 2:** Date range filtering (`from_booking_date`, `to_booking_date`)

### 3. **Base URL**
- **Curl 1:** `https://api.freighttiger.com` (Production)
- **Curl 2:** `http://localhost:5173/__ft_tms` (Local proxy)

### 4. **Authorization Token**
- **Curl 1:** Full token with permissions, deskId, role_fteid, groupId, entity_type, companyType
- **Curl 2:** Simplified token with only basic user info (id, guid, entity_guid, companyId, pwd_exp)

### 5. **Custom Headers**
- **Curl 1:** No custom headers, relies on token claims
- **Curl 2:** Multiple custom headers:
  - `X-FT-ORGID` / `X-Org-Id` (duplicate)
  - `X-User-Id`
  - `X-User-Role`
  - `token` (duplicate of Authorization header)

### 6. **Token Duplication**
- **Curl 2:** Token appears in both `Authorization` and `token` headers (redundant)

### 7. **Header Duplication**
- **Curl 2:** `X-FT-ORGID` and `X-Org-Id` contain the same value (1165261)

---

## Recommendations

1. **Token Consistency:** The local proxy uses a simplified token. Consider if permissions are needed for the `myOrdersBucketSummary` endpoint.

2. **Header Cleanup:** Remove duplicate headers in Curl 2:
   - Remove `token` header (already in `Authorization`)
   - Consolidate `X-FT-ORGID` and `X-Org-Id` into a single header

3. **Endpoint Mapping:** Verify that `myOrdersBucketSummary` is the correct endpoint for the use case, or if it should be `myOrders` with date filters.

4. **Date Format:** Curl 2 uses Unix timestamps (milliseconds). Consider if ISO 8601 dates would be more readable/maintainable.

5. **Proxy Configuration:** Ensure the local proxy (`/__ft_tms`) correctly forwards all necessary headers to the production API.

---

## Date Range Analysis

**Curl 2 Date Range:**
- `from_booking_date`: 1767614109256 = **2025-12-04 10:21:49 UTC**
- `to_booking_date`: 1770206109256 = **2026-02-04 10:21:49 UTC**
- **Range:** ~2 months (61 days)

---

## Security Considerations

1. **Token Exposure:** Both tokens are visible in the curl commands. Ensure these are rotated/expired.
2. **Local Development:** Curl 2 uses HTTP (not HTTPS) for localhost - acceptable for local dev.
3. **Custom Headers:** The local proxy adds custom headers that may need to be validated on the backend.
