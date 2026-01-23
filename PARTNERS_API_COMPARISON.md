# Partners API Comparison

## API Endpoint
`GET /api/eqs/v1/company/partners`

## Test Results

### Proxy Request (via localhost:5173)
- **Status:** `401` (Unauthorized)
- **Response:** `{"success":false}`
- **Token:** Expired (exp: 1769153914, iat: 1769152114)

### Direct Request (production API)
- **Status:** `200` (Success)
- **Response:** Full data with 11 partners
- **Token:** Valid (exp: 1769153437, iat: 1769151637)

---

## Key Differences

### 1. **URL Structure**

**Proxy:**
```
http://localhost:5173/__ft_tms/api/eqs/v1/company/partners
```
- Uses `/__ft_tms` prefix
- Proxy rewrites to: `https://api.freighttiger.com/api/eqs/v1/company/partners`

**Direct:**
```
https://api.freighttiger.com/api/eqs/v1/company/partners
```

### 2. **Headers Comparison**

#### Proxy Request Headers:
```
Authorization: Bearer <token>
Accept: application/json
X-FT-ORGID: 1165261
X-FT-USERID: 126798
X-Org-Id: 1165261
X-User-Id: 126798
X-User-Role: user
token: <token> (duplicate header)
Content-Type: application/json
Accept-Language: en-GB,en-US;q=0.9,en;q=0.8
Connection: keep-alive
Referer: http://localhost:5173/v10/summarydashboard
Sec-Fetch-* headers (browser standard)
sec-ch-ua headers (browser standard)
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
- ✅ Proxy includes extra headers: `X-FT-ORGID`, `X-FT-USERID`, `X-Org-Id`, `X-User-Id`, `X-User-Role`, `token`
- ❌ Direct request does NOT include these extra headers
- ⚠️ Proxy token is expired, Direct token is valid

### 3. **Query Parameters**

Both requests use identical query parameters:
- `parent_fteid=COM-79284f8f-b98c-4b90-b001-f483beb21cd0`
- `filter={"partner_type":"CNR"}` (URL encoded)
- `sort=-updated_at`
- `page=1`
- `size=100`
- `q=` (empty search query)

### 4. **Token Differences**

**Proxy Token:**
- JWT Payload includes: `companyId: 1165261` (no `groupId`, `entity_type`, `companyType`, `permissions`, `deskId`, `desk_parent_fteid`, `role_fteid`)
- Expires: `1769153914` (already expired)
- Issued: `1769152114`

**Direct Token:**
- JWT Payload includes: `companyId: 1165261`, `groupId: <present>`, `entity_type: "CNR"`, `companyType: [{name: "Consignor", key: "consignor"}]`, `permissions`, `deskId`, `desk_parent_fteid`, `role_fteid`
- Expires: `1769153437` (valid)
- Issued: `1769151637`

**Key Token Differences:**
- Direct token has more complete user context (permissions, desk info, role)
- Direct token is valid, proxy token is expired
- Direct token includes `groupId` and `entity_type` which proxy token lacks

---

## Analysis

### Why Proxy Request Failed (401)

1. **Expired Token:** The proxy request uses an expired token
   - Token expired at: `1769153914` (timestamp)
   - Current time is past expiration

2. **Missing Token Context:** The proxy token lacks important fields:
   - No `permissions` object
   - No `deskId` or `desk_parent_fteid`
   - No `role_fteid`
   - No `groupId` or `entity_type`

### Why Direct Request Succeeded (200)

1. **Valid Token:** The direct request uses a valid, non-expired token
2. **Complete Token Context:** Token includes all necessary user context fields
3. **No Extra Headers Required:** The API accepts requests without `X-FT-ORGID`/`X-FT-USERID` headers when using a valid token with complete context

---

## Recommendations

### Option 1: Use Valid Token
Ensure the proxy request uses a valid, non-expired token with complete user context.

### Option 2: Token Refresh
Implement token refresh logic to automatically refresh expired tokens before making API calls.

### Option 3: Header Requirements
If the API requires `X-FT-ORGID`/`X-FT-USERID` headers, ensure they match the token's user context:
- `X-FT-ORGID` should match `token.ucv.companyId`
- `X-FT-USERID` should match `token.ucv.id` or `token.sub`

### Option 4: Test with Same Token
To properly compare, use the same valid token in both requests to isolate header differences.

---

## Code Reference

- **Proxy Configuration:** `vite.config.ts` (lines 25-52)
- **API Client:** `src/modules/summary-dashboard/data/ftTmsClient.ts` (lines 69-113)
- **Consignor API:** `src/modules/summary-dashboard/data/consigneeApiService.ts` (uses `ftTmsFetch`)

---

## Test with Same Valid Token

To properly compare header differences, use the same valid token in both requests:

```bash
# Proxy with valid token
curl 'http://localhost:5173/__ft_tms/api/eqs/v1/company/partners?parent_fteid=COM-79284f8f-b98c-4b90-b001-f483beb21cd0&filter=%7B%22partner_type%22%3A%22CNR%22%7D&sort=-updated_at&page=1&size=100&q=' \
  -H 'Authorization: Bearer <VALID_TOKEN>' \
  -H 'X-FT-ORGID: 1165261' \
  -H 'X-FT-USERID: 126798'

# Direct with same valid token
curl 'https://api.freighttiger.com/api/eqs/v1/company/partners?parent_fteid=COM-79284f8f-b98c-4b90-b001-f483beb21cd0&filter=%7B%22partner_type%22:%22CNR%22%7D&sort=-updated_at&page=1&size=100&q=' \
  -H 'authorization: Bearer <VALID_TOKEN>'
```
