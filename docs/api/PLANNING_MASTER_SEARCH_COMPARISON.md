# Planning Engine Master Search API Comparison

## Overview
Comparison between direct production API call and local proxy API call for the planning engine master-search endpoint.

## Curl 1: Direct Production API

```bash
curl 'https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/master-search' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer ' \
  -H 'content-type: application/json' \
  -H 'origin: https://www.freighttiger.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://www.freighttiger.com/' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
  --data-raw '{"page":1,"size":10,"group_fteid":null,"branch_fteid":"BRH-edaadb15-a128-4c48-91d2-48f8bc6d7683","sort":["-updatedAt"],"filters":[{"field":"STATUS","operator":"in","value":["UNPLANNED","PARTIALLY_PLANNED"]}],"includeDeletedOnly":false}'
```

## Curl 2: Local Proxy API

```bash
curl 'http://localhost:5173/__planning/planning-engine-service/v1/api/orders/master-search' \
  -H 'Accept: application/json' \
  -H 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'Authorization: Bearer ' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -H 'Referer: http://localhost:5173/v10/summarydashboard' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
  -H 'X-FT-ORGID: 1583874' \
  -H 'X-FT-USERID: 431463' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  --data-raw '{"page":1,"size":1,"group_fteid":null,"branch_fteid":null,"sort":["-updatedAt"],"filters":[{"field":"STATUS","operator":"in","value":["UNPLANNED","PARTIALLY_PLANNED","PLANNED","DISPATCHED"]},{"field":"CREATED_AT","operator":">=","value":["1767684826113"]},{"field":"CREATED_AT","operator":"<=","value":["1770276826113"]}],"includeDeletedOnly":false}'
```

## Key Differences

### 1. **URL Structure**

| Aspect | Curl 1 (Direct) | Curl 2 (Proxy) |
|--------|----------------|----------------|
| **Base URL** | `https://planning-engine-service.freighttiger.com` | `http://localhost:5173/__planning` |
| **Path** | `/planning-engine-service/v1/api/orders/master-search` | `/planning-engine-service/v1/api/orders/master-search` |
| **Protocol** | HTTPS | HTTP (local dev) |
| **Proxy Prefix** | None | `/__planning` |

**Analysis:**
- Curl 1 goes directly to the production planning engine service
- Curl 2 uses the local Vite dev server proxy (`/__planning`) which rewrites the URL and forwards to the production service

### 2. **Headers Comparison**

| Header | Curl 1 (Direct) | Curl 2 (Proxy) | Notes |
|--------|----------------|----------------|-------|
| **Accept** | `application/json, text/plain, */*` | `application/json` | Proxy uses simpler accept header |
| **Accept-Language** | `en-GB,en-US;q=0.9,en;q=0.8` | `en-GB,en-US;q=0.9,en;q=0.8` | ✅ Same |
| **Authorization** | `Bearer ` (empty) | `Bearer ` (empty) | ✅ Both empty |
| **Content-Type** | `application/json` | `application/json` | ✅ Same |
| **Origin** | `https://www.freighttiger.com` | `http://localhost:5173` | Different origins (production vs local) |
| **Referer** | `https://www.freighttiger.com/` | `http://localhost:5173/v10/summarydashboard` | Different referers |
| **Sec-Fetch-Site** | `same-site` | `same-origin` | Different fetch context |
| **Connection** | Not present | `keep-alive` | Proxy adds connection header |
| **Priority** | `u=1, i` | Not present | Direct call includes priority header |
| **X-FT-ORGID** | Not present | `1583874` | ✅ Proxy adds org ID header |
| **X-FT-USERID** | Not present | `431463` | ✅ Proxy adds user ID header |
| **User-Agent** | Same | Same | ✅ Same |
| **sec-ch-ua*** | Same | Same | ✅ Same |

**Key Observations:**
- ✅ Proxy adds `X-FT-ORGID` and `X-FT-USERID` headers (likely from authentication context)
- ✅ Proxy uses `same-origin` instead of `same-site` (expected for localhost)
- ⚠️ Direct call has `priority` header, proxy doesn't (minor difference)
- ⚠️ Direct call has more verbose `Accept` header

### 3. **Request Body Comparison**

#### Curl 1 (Direct) Request Body:
```json
{
  "page": 1,
  "size": 10,
  "group_fteid": null,
  "branch_fteid": "BRH-edaadb15-a128-4c48-91d2-48f8bc6d7683",
  "sort": ["-updatedAt"],
  "filters": [
    {
      "field": "STATUS",
      "operator": "in",
      "value": ["UNPLANNED", "PARTIALLY_PLANNED"]
    }
  ],
  "includeDeletedOnly": false
}
```

#### Curl 2 (Proxy) Request Body:
```json
{
  "page": 1,
  "size": 1,
  "group_fteid": null,
  "branch_fteid": null,
  "sort": ["-updatedAt"],
  "filters": [
    {
      "field": "STATUS",
      "operator": "in",
      "value": ["UNPLANNED", "PARTIALLY_PLANNED", "PLANNED", "DISPATCHED"]
    },
    {
      "field": "CREATED_AT",
      "operator": ">=",
      "value": ["1767684826113"]
    },
    {
      "field": "CREATED_AT",
      "operator": "<=",
      "value": ["1770276826113"]
    }
  ],
  "includeDeletedOnly": false
}
```

#### Request Body Differences:

| Field | Curl 1 (Direct) | Curl 2 (Proxy) | Impact |
|-------|----------------|----------------|--------|
| **page** | `1` | `1` | ✅ Same |
| **size** | `10` | `1` | ⚠️ Different page sizes (10 vs 1) |
| **group_fteid** | `null` | `null` | ✅ Same |
| **branch_fteid** | `"BRH-edaadb15-a128-4c48-91d2-48f8bc6d7683"` | `null` | ⚠️ **Major difference**: Direct has specific branch, proxy has null (all branches) |
| **sort** | `["-updatedAt"]` | `["-updatedAt"]` | ✅ Same |
| **filters** | 1 filter (STATUS only) | 3 filters (STATUS + 2 CREATED_AT) | ⚠️ **Major difference**: Different filter sets |
| **STATUS filter values** | `["UNPLANNED", "PARTIALLY_PLANNED"]` | `["UNPLANNED", "PARTIALLY_PLANNED", "PLANNED", "DISPATCHED"]` | ⚠️ Proxy includes more statuses |
| **CREATED_AT filters** | Not present | 2 date range filters | ⚠️ Proxy adds date range filtering |
| **includeDeletedOnly** | `false` | `false` | ✅ Same |

**Key Observations:**
- ⚠️ **Branch Filter**: Direct call filters by specific branch ID, proxy call filters all branches (`branch_fteid: null`)
- ⚠️ **Page Size**: Direct call requests 10 items, proxy requests 1 item
- ⚠️ **Status Filter**: Direct call only includes `UNPLANNED` and `PARTIALLY_PLANNED`, proxy includes additional statuses (`PLANNED`, `DISPATCHED`)
- ⚠️ **Date Range**: Proxy adds date range filters (`CREATED_AT >= 1767684826113` and `CREATED_AT <= 1770276826113`), direct call has no date filtering

### 4. **Proxy Configuration Analysis**

The proxy request uses the `/__planning` prefix which should be configured in `vite.config.ts`:

- **Proxy Path**: `/__planning/planning-engine-service/v1/api/orders/master-search`
- **Expected Rewrite**: Removes `/__planning` prefix
- **Target**: `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/master-search`
- **Headers Added**: `X-FT-ORGID`, `X-FT-USERID` (from authentication context)

## Summary

### ✅ Similarities
1. Both use the same API endpoint path
2. Both have empty Bearer tokens
3. Both use the same sort order (`-updatedAt`)
4. Both exclude deleted items (`includeDeletedOnly: false`)

### ⚠️ Differences

#### Headers:
- Proxy adds `X-FT-ORGID` and `X-FT-USERID` headers (beneficial for authentication)
- Different Origin/Referer (expected for local vs production)
- Different Sec-Fetch-Site values (expected for localhost)

#### Request Body (Most Significant):
1. **Branch Filter**: 
   - Direct: Specific branch ID (`BRH-edaadb15-a128-4c48-91d2-48f8bc6d7683`)
   - Proxy: All branches (`null`)
   
2. **Page Size**:
   - Direct: 10 items per page
   - Proxy: 1 item per page
   
3. **Status Filter**:
   - Direct: Only `UNPLANNED`, `PARTIALLY_PLANNED`
   - Proxy: `UNPLANNED`, `PARTIALLY_PLANNED`, `PLANNED`, `DISPATCHED`
   
4. **Date Range**:
   - Direct: No date filtering
   - Proxy: Date range filter (`CREATED_AT` between two timestamps)

## Recommendations

1. **Verify Branch Filter**: The proxy call uses `branch_fteid: null` which may return orders from all branches. Ensure this is intentional or add branch filtering if needed.

2. **Page Size**: Consider if `size: 1` is intentional for the proxy call or if it should match the direct call (`size: 10`).

3. **Status Filter**: The proxy includes more statuses (`PLANNED`, `DISPATCHED`). Verify if this broader filter is intentional.

4. **Date Range**: The proxy adds date range filtering. Ensure the timestamps (`1767684826113` and `1770276826113`) are correct and represent the intended date range.

5. **Proxy Headers**: The proxy correctly adds `X-FT-ORGID` and `X-FT-USERID` headers, which is good for authentication context.

## Conclusion

The main differences are in the **request body parameters**, particularly:
- Branch filtering (specific branch vs all branches)
- Page size (10 vs 1)
- Status filter scope (2 statuses vs 4 statuses)
- Date range filtering (present in proxy, absent in direct)

These differences suggest the two calls are serving different purposes or are from different parts of the application. The proxy call appears to be a broader search query with date range filtering, while the direct call is a more focused query on a specific branch with fewer statuses.
