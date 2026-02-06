# Planning Engine Status Counts API Comparison

## API Endpoint
`GET /planning-engine-service/v1/api/orders/status-counts`

## Test Results

### Proxy Request (via localhost:5173/__planning)
- **Status:** `404` (Not Found)
- **Response:** `{"success":false,"statusCode":404,"data":null,"message":["Branch not found"],...}`
- **Error:** Branch not found

### Direct Request (production API)
- **Status:** `200` (Success)
- **Response:** Full data with order status counts
- **Data:** Successfully returned counts for all statuses

---

## Key Differences

### 1. **URL Structure**

**Proxy:**
```
http://localhost:5173/__planning/planning-engine-service/v1/api/orders/status-counts
```
- Uses `/__planning` prefix
- Proxy rewrites to: `https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/status-counts`

**Direct:**
```
https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/status-counts
```

### 2. **Headers Comparison**

#### Proxy Request Headers:
```
Authorization: Bearer <token>
Accept: application/json
Accept-Language: en-GB,en-US;q=0.9,en;q=0.8
Content-Type: application/json
X-FT-ORGID: 1583874
X-FT-USERID: 431463
branch-code: 9
Connection: keep-alive
Referer: http://localhost:5173/v10/summarydashboard
Sec-Fetch-* headers (browser standard)
sec-ch-ua headers (browser standard)
User-Agent: Mozilla/5.0...
```

#### Direct Request Headers:
```
authorization: Bearer <token>
accept: application/json, text/plain, */*
accept-language: en-GB,en-US;q=0.9,en;q=0.8
content-type: application/json
origin: https://www.freighttiger.com
referer: https://www.freighttiger.com/
sec-ch-ua headers (browser standard)
sec-fetch-* headers (browser standard)
user-agent: Mozilla/5.0...
```

**Key Differences:**
- ✅ Proxy includes extra headers: `X-FT-ORGID`, `X-FT-USERID`, `branch-code`
- ❌ Direct request does NOT include these extra headers
- ⚠️ Both tokens are valid but different (different `jti` values)

### 3. **Query Parameters**

Both requests use identical query parameters:
- `branch_fteid=BRH-9957794e-f528-47b4-bc1e-8fb0823d457b`

### 4. **Token Differences**

**Proxy Token:**
- JWT ID (`jti`): `11305954-edbe-4cea-8f11-bf34925cedae`
- Expires: `1769166345` (valid)
- Issued: `1769164545`
- User ID: `431463`
- Company ID: `1583874`
- Group ID: `9`

**Direct Token:**
- JWT ID (`jti`): `58d055b5-3ad3-4dfe-b741-88c25fedcb78`
- Expires: `1769165877` (valid)
- Issued: `1769164077`
- User ID: `431463` (same)
- Company ID: `1583874` (same)
- Group ID: `9` (same)

**Key Token Differences:**
- Both tokens are valid and contain the same user/company context
- Different JWT IDs (`jti`) - these are different token instances
- Proxy token expires slightly later (1769166345 vs 1769165877)

---

## Analysis

### Why Proxy Request Failed (404)

The proxy request returns `404 - Branch not found` even though:
1. ✅ Token is valid
2. ✅ Query parameter `branch_fteid` is provided
3. ✅ Extra headers (`X-FT-ORGID`, `X-FT-USERID`, `branch-code`) are included

**Possible Causes:**

1. **Header Conflict:** The `branch-code: 9` header might be conflicting with the `branch_fteid` query parameter
   - The API might be using the `branch-code` header instead of the query parameter
   - Or there might be a mismatch between `branch-code: 9` (group ID) and `branch_fteid: BRH-9957794e-f528-47b4-bc1e-8fb0823d457b`

2. **Proxy Rewrite Issue:** The proxy might not be forwarding headers correctly
   - Check if `branch-code` header is being forwarded by the proxy

3. **API Behavior:** The planning-engine-service API might:
   - Require `branch-code` header to match the `branch_fteid` query parameter
   - Or prefer `branch-code` header over query parameter
   - Or reject requests with both `branch-code` header and `branch_fteid` query parameter

### Why Direct Request Succeeded (200)

The direct request succeeds because:
1. ✅ Valid token
2. ✅ No conflicting headers
3. ✅ Only uses `branch_fteid` query parameter (no `branch-code` header)

---

## Recommendations

### Option 1: Remove `branch-code` Header
The `branch-code: 9` header might be causing the issue. Try removing it:

```bash
curl 'http://localhost:5173/__planning/planning-engine-service/v1/api/orders/status-counts?branch_fteid=BRH-9957794e-f528-47b4-bc1e-8fb0823d457b' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-FT-ORGID: 1583874' \
  -H 'X-FT-USERID: 431463'
  # Remove: -H 'branch-code: 9'
```

### Option 2: Use `branch-code` Instead of Query Parameter
If the API prefers the header, try:

```bash
curl 'http://localhost:5173/__planning/planning-engine-service/v1/api/orders/status-counts' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-FT-ORGID: 1583874' \
  -H 'X-FT-USERID: 431463' \
  -H 'branch-code: BRH-9957794e-f528-47b4-bc1e-8fb0823d457b'
```

### Option 3: Check Proxy Configuration
Verify that the `/__planning` proxy in `vite.config.ts` is forwarding all headers correctly.

### Option 4: Match Direct Request Headers
Remove all extra headers to match the direct request:

```bash
curl 'http://localhost:5173/__planning/planning-engine-service/v1/api/orders/status-counts?branch_fteid=BRH-9957794e-f528-47b4-bc1e-8fb0823d457b' \
  -H 'Authorization: Bearer <token>' \
  -H 'Accept: application/json'
  # Remove: X-FT-ORGID, X-FT-USERID, branch-code
```

---

## Code Reference

- **Proxy Configuration:** `vite.config.ts` (lines 53-58)
- **Planning Fetch:** `src/modules/summary-dashboard/data/realApiService.ts` (lines 57-134)
- **Status Counts API:** `src/modules/summary-dashboard/data/realApiService.ts` (lines 305-320)

---

## Expected Response (from Direct Request)

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "counts": {
      "UNPLANNED": 40,
      "IN_PROGRESS": 0,
      "PLANNED": 36,
      "PARTIALLY_PLANNED": 6,
      "DISPATCHED": 31,
      "DELIVERED": 0,
      "PARTIALLY_DELIVERED": 0,
      "FAILED": 0,
      "VALIDATION_IN_PROGRESS": 0,
      "VALIDATION_SUCCESS": 0,
      "VALIDATION_FAILURE": 0,
      "PLANNING_CORE_FAILED": 0,
      "DELETED": 6
    }
  },
  "message": "Success",
  "timestamp": "2026-01-23T10:39:11.503Z",
  "endpoint": "/planning-engine-service/v1/api/orders/status-counts?branch_fteid=BRH-9957794e-f528-47b4-bc1e-8fb0823d457b"
}
```

---

## Conclusion

The main issue appears to be the `branch-code: 9` header conflicting with the `branch_fteid` query parameter. The planning-engine-service API likely expects either:
- The query parameter `branch_fteid` alone (as in the direct request), OR
- The `branch-code` header with the branch FTEID value (not group ID)

The `branch-code: 9` header value (`9` is the group ID) doesn't match the `branch_fteid` query parameter value (`BRH-9957794e-f528-47b4-bc1e-8fb0823d457b`), which may be causing the API to reject the request.
