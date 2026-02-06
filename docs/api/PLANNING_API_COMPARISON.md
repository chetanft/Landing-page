# Planning API Request Comparison

## Key Differences Between Direct and Proxy Requests

### 1. **URL Path Issue** ⚠️

**Direct Request (Production):**
```
https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/status-counts
```

**Proxy Request (Current):**
```
http://localhost:5173/__ft_tms/planning-engine-service/v1/api/orders/status-counts
```

**Expected Proxy Request (Should be):**
```
http://localhost:5173/__planning/planning-engine-service/v1/api/orders/status-counts
```

**Issue:** The request is using `/__ft_tms` prefix instead of `/__planning` prefix. According to `vite.config.ts`, planning-engine-service requests should use the `/__planning` proxy, not `/__ft_tms`.

### 2. **Query Parameter Missing** ⚠️

**Direct Request:**
- Has query parameter: `?branch_fteid=BRH-9957794e-f528-47b4-bc1e-8fb0823d457b`

**Proxy Request:**
- Missing the `branch_fteid` query parameter

**Note:** The code in `realApiService.ts` adds `branch-code` as a **header** (line 91), but the API expects `branch_fteid` as a **query parameter** based on the Postman collection and API documentation.

### 3. **Response Differences**

**Direct Request Response:**
- Status: `401` (EXPIRED_TOKEN)
- Error: Token expired

**Proxy Request Response:**
- Status: `403` (Forbidden)
- Error: Different error, suggesting routing/authentication issue

### 4. **Headers Comparison**

**Direct Request Headers:**
- `authorization: Bearer <token>`
- `accept: application/json, text/plain, */*`
- Standard browser headers

**Proxy Request Headers:**
- `Authorization: Bearer <token>` (same token, different case)
- `Accept: application/json`
- Additional headers: `X-FT-ORGID: 1583874`, `X-FT-USERID: 431463`
- `branch-code: <branch_id>` (header, not query param)

### 5. **Proxy Configuration Analysis**

From `vite.config.ts`:
- `/__planning` → proxies to `https://planning-engine-service.freighttiger.com`
- `/__ft_tms` → proxies to `FT_TMS_API_BASE_URL` or `FT_TMS_PROXY_URL` (for main API, not planning service)

### 6. **Code Implementation**

From `realApiService.ts`:
- `getPlanningBaseUrl()` returns `/__planning/planning-engine-service/v1/api` in dev mode (line 13)
- `planningFetch()` constructs URL as `${baseUrl}${path}` (line 66)
- Branch ID is added as `branch-code` header (line 91), not as query parameter

## Recommendations

1. **Fix URL Path:** Ensure requests use `/__planning` prefix, not `/__ft_tms`
2. **Fix Query Parameter:** Change `branch-code` header to `branch_fteid` query parameter
3. **Verify Proxy:** Test that `/__planning` proxy correctly routes to planning-engine-service

## Expected Correct Proxy Request

```bash
curl --location 'http://localhost:5173/__planning/planning-engine-service/v1/api/orders/status-counts?branch_fteid=BRH-9957794e-f528-47b4-bc1e-8fb0823d457b' \
--header 'Authorization: Bearer <token>' \
--header 'Accept: application/json' \
--header 'X-FT-ORGID: 1583874' \
--header 'X-FT-USERID: 431463'
```

## Test Results

**Correct Proxy Request (`/__planning`):**
- Status: `401` (EXPIRED_TOKEN) ✅
- Response: Same as direct request - proxy routing works correctly
- The `/__planning` proxy correctly routes to `https://planning-engine-service.freighttiger.com`

**Incorrect Proxy Request (`/__ft_tms`):**
- Status: `403` (Forbidden) ❌
- Response: Different error - wrong proxy route

## Summary

The main issue is that the request is using `/__ft_tms` instead of `/__planning`. When using the correct `/__planning` prefix, the proxy works correctly and returns the same response as the direct request (401 EXPIRED_TOKEN, which is expected with an expired token).

The code in `realApiService.ts` correctly uses `/__planning` prefix in dev mode, so the issue might be:
1. The request is being made from somewhere else that's using `/__ft_tms`
2. Or there's a configuration issue causing the wrong base URL to be used
