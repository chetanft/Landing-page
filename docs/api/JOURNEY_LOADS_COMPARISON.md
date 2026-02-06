# Journey Snapshot Loads API Comparison

## Overview
Comparison between local proxy API call and direct production API call for the journey snapshot loads endpoint.

## Curl 1: Local Proxy API

```bash
curl --location 'http://localhost:5173/__ft_tms/api/journey-snapshot/v1/journeys/JRN-4732813d-6901-4952-a047-f81ccc2ec3f5/details/loads?entity_type=CNR&journey_stop_type=source&journey_direction=outbound' \
--header 'Accept: application/json' \
--header 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1Y3YiOnsiaWQiOjQzMTQ2MywiZ3VpZCI6IlVTUi1lZGFmMmVmNi03NTYxLTQyZDYtYjIzYi1mY2RkNjM5OWYxZWMiLCJmaXJzdG5hbWUiOiJGVCIsImxhc3RuYW1lIjoiSW50ZXJuYWwiLCJlbnRpdHlfZ3VpZCI6IkNPTS00OGY0ZjU4Mi03YWM2LTRkZjQtYTU1Ni1iMzgxMzZiMDQyYTgiLCJjb21wYW55SWQiOjE1ODM4NzQsInB3ZF9leHAiOiIyMDI2LTAzLTA0VDAwOjAwOjAwLjAwMFoifSwiaWF0IjoxNzcwMjc2ODI2LCJuYmYiOjE3NzAyNzY4MjYsImV4cCI6MTc3MDI3ODYyNiwiaXNzIjoiaHR0cDovL3Bob2VuaXgvYXBpL2F1dGhlbnRpY2F0ZSIsInN1YiI6IjQzMTQ2MyIsImp0aSI6ImVmNjczMGYzLTVhNTEtNDA0MS1hODIxLTMwNDNlM2RlMWIzYyJ9.tmmDjXLznLjDTmtYkCesc8CO3La5nrzxPxxQQXqSYrA' \
--header 'Connection: keep-alive' \
--header 'Content-Type: application/json' \
--header 'Referer: http://localhost:5173/v10/summarydashboard' \
--header 'Sec-Fetch-Dest: empty' \
--header 'Sec-Fetch-Mode: cors' \
--header 'Sec-Fetch-Site: same-origin' \
--header 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
--header 'X-FT-ORGID: 1583874' \
--header 'X-FT-USERID: USR-edaf2ef6-7561-42d6-b23b-fcdd6399f1ec' \
--header 'X-Org-Id: 1583874' \
--header 'X-User-Id: 431463' \
--header 'X-User-Role: user' \
--header 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
--header 'sec-ch-ua-mobile: ?0' \
--header 'sec-ch-ua-platform: "macOS"' \
--header 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1Y3YiOnsiaWQiOjQzMTQ2MywiZ3VpZCI6IlVTUi1lZGFmMmVmNi03NTYxLTQyZDYtYjIzYi1mY2RkNjM5OWYxZWMiLCJmaXJzdG5hbWUiOiJGVCIsImxhc3RuYW1lIjoiSW50ZXJuYWwiLCJlbnRpdHlfZ3VpZCI6IkNPTS00OGY0ZjU4Mi03YWM2LTRkZjQtYTU1Ni1iMzgxMzZiMDQyYTgiLCJjb21wYW55SWQiOjE1ODM4NzQsInB3ZF9leHAiOiIyMDI2LTAzLTA0VDAwOjAwOjAwLjAwMFoifSwiaWF0IjoxNzcwMjc2ODI2LCJuYmYiOjE3NzAyNzY4MjYsImV4cCI6MTc3MDI3ODYyNiwiaXNzIjoiaHR0cDovL3Bob2VuaXgvYXBpL2F1dGhlbnRpY2F0ZSIsInN1YiI6IjQzMTQ2MyIsImp0aSI6ImVmNjczMGYzLTVhNTEtNDA0MS1hODIxLTMwNDNlM2RlMWIzYyJ9.tmmDjXLznLjDTmtYkCesc8CO3La5nrzxPxxQQXqSYrA'
```

## Curl 2: Direct Production API

```bash
curl --location 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/JRN-8a21a80c-805f-4592-84ab-02d5f7cfd1de/details/loads?entity_type=CNR&journey_stop_type=source&journey_direction=outbound' \
--header 'accept: application/json, text/plain, */*' \
--header 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
--header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1Y3YiOnsiaWQiOjQzMTQ2MywiZ3VpZCI6IlVTUi1lZGFmMmVmNi03NTYxLTQyZDYtYjIzYi1mY2RkNjM5OWYxZWMiLCJmaXJzdG5hbWUiOiJGVCIsImxhc3RuYW1lIjoiSW50ZXJuYWwiLCJlbnRpdHlfZ3VpZCI6IkNPTS00OGY0ZjU4Mi03YWM2LTRkZjQtYTU1Ni1iMzgxMzZiMDQyYTgiLCJjb21wYW55SWQiOjE1ODM4NzQsImdyb3VwSWQiOiI5IiwiZW50aXR5X3R5cGUiOiJDTlIiLCJjb21wYW55VHlwZSI6W3sibmFtZSI6IkNvbnNpZ25vciIsImtleSI6ImNvbnNpZ25vciJ9XSwicHdkX2V4cCI6IjIwMjYtMDMtMDRUMDA6MDA6MDAuMDAwWiJ9LCJwZXJtaXNzaW9ucyI6eyJwZXJtaXNzaW9uX2NyZWF0ZV9tYXNrIjpbMTU2MCwyNjI1MzMsNTI0NDk5Miw0MjAwMDM4NCwxMDc0MjUzMzc2LDQ2OTc2NDEwMCwyMDEzOTU5NzVdLCJwZXJtaXNzaW9uX3VwZGF0ZV9tYXNrIjpbMTU2MCwyNjI1MzMsNTI0NDk5Miw0MjAwMDM4NCwyMTQ3NDcwOTEyLDQ2OTc2NDEwMCwyMDEzOTU5NzVdLCJwZXJtaXNzaW9uX3JlYWRfbWFzayI6WzE1NjAsMjYyNTc1LDUzMTA1MjgsNDIwMDI0MzIsMjE0NzQ3MDkxMiw1MjAwOTU3NTAsMjAxNTg4NjE1XX0sImRlc2tJZCI6IkRTSy1jNzRjZjkxNi1iNmQzLTQ5MTMtYWYzZS1iZGZmY2I3NjM2YzEiLCJkZXNrX3BhcmVudF9mdGVpZCI6IkNPTS00OGY0ZjU4Mi03YWM2LTRkZjQtYTU1Ni1iMzgxMzZiMDQyYTgiLCJyb2xlX2Z0ZWlkIjoiUk9MLTM5OWExZjMwLTQxNDMtNDcxMy05YzgyLTlhNzY0MzFkMTE4NyIsImlhdCI6MTc3MDI3Njk1MSwibmJmIjoxNzcwMjc2OTUxLCJleHAiOjE3NzAyNzg3NTEsImlzcyI6Imh0dHA6Ly9waG9lbml4L2FwaS9hdXRoZW50aWNhdGUiLCJzdWIiOiI0MzE0NjMiLCJqdGkiOiIxNGM5ZWRhOC02MmUzLTQ5OTYtODU1Ni00ZjZiYjJjNWM5N2EifQ.fDLPvn40pqNwkNKJCyTaL6Ad7gz42ydeuF4UldmNqHQ' \
--header 'content-type: application/json' \
--header 'origin: https://www.freighttiger.com' \
--header 'priority: u=1, i' \
--header 'referer: https://www.freighttiger.com/' \
--header 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
--header 'sec-ch-ua-mobile: ?0' \
--header 'sec-ch-ua-platform: "macOS"' \
--header 'sec-fetch-dest: empty' \
--header 'sec-fetch-mode: cors' \
--header 'sec-fetch-site: same-site' \
--header 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
```

## Key Differences

### 1. **URL Structure**

| Aspect | Curl 1 (Proxy) | Curl 2 (Direct) |
|--------|----------------|-----------------|
| **Base URL** | `http://localhost:5173/__ft_tms` | `https://api.freighttiger.com` |
| **Path** | `/api/journey-snapshot/v1/journeys/JRN-4732813d-6901-4952-a047-f81ccc2ec3f5/details/loads` | `/api/journey-snapshot/v1/journeys/JRN-8a21a80c-805f-4592-84ab-02d5f7cfd1de/details/loads` |
| **Query Params** | `entity_type=CNR&journey_stop_type=source&journey_direction=outbound` | `entity_type=CNR&journey_stop_type=source&journey_direction=outbound` |
| **Protocol** | HTTP (local dev) | HTTPS |
| **Proxy Prefix** | `/__ft_tms` | None |

**Analysis:**
- ✅ Query parameters are identical
- ⚠️ Different journey IDs (`JRN-4732813d...` vs `JRN-8a21a80c...`) - likely different journeys being queried
- Proxy rewrites `/__ft_tms` prefix and forwards to production API

### 2. **Journey IDs**

| Curl | Journey ID |
|------|-----------|
| **Proxy** | `JRN-4732813d-6901-4952-a047-f81ccc2ec3f5` |
| **Direct** | `JRN-8a21a80c-805f-4592-84ab-02d5f7cfd1de` |

**Note:** These are different journey IDs, so the requests are querying different journeys. This is expected if comparing different API calls.

### 3. **Headers Comparison**

| Header | Curl 1 (Proxy) | Curl 2 (Direct) | Notes |
|--------|----------------|-----------------|-------|
| **Accept** | `application/json` | `application/json, text/plain, */*` | Direct has more verbose accept header |
| **Accept-Language** | `en-GB,en-US;q=0.9,en;q=0.8` | `en-GB,en-US;q=0.9,en;q=0.8` | ✅ Same |
| **Authorization** | Bearer token (simplified) | Bearer token (complete) | ⚠️ **Major difference** - see token analysis below |
| **Connection** | `keep-alive` | Not present | Proxy adds connection header |
| **Content-Type** | `application/json` | `application/json` | ✅ Same |
| **Origin** | `http://localhost:5173` | `https://www.freighttiger.com` | Different origins (expected) |
| **Referer** | `http://localhost:5173/v10/summarydashboard` | `https://www.freighttiger.com/` | Different referers (expected) |
| **Sec-Fetch-Site** | `same-origin` | `same-site` | Different fetch context (expected) |
| **Priority** | Not present | `u=1, i` | Direct call includes priority header |
| **X-FT-ORGID** | `1583874` | Not present | ✅ Proxy adds org ID header |
| **X-FT-USERID** | `USR-edaf2ef6-7561-42d6-b23b-fcdd6399f1ec` | Not present | ✅ Proxy adds user ID header (GUID format) |
| **X-Org-Id** | `1583874` | Not present | ✅ Proxy adds org ID header (duplicate) |
| **X-User-Id** | `431463` | Not present | ✅ Proxy adds user ID header (numeric) |
| **X-User-Role** | `user` | Not present | ✅ Proxy adds user role header |
| **token** | Present (same as Authorization) | Not present | ✅ Proxy adds token header (duplicate of Authorization) |
| **User-Agent** | Same | Same | ✅ Same |
| **sec-ch-ua*** | Same | Same | ✅ Same |

**Key Observations:**
- ✅ Proxy adds multiple authentication-related headers (`X-FT-ORGID`, `X-FT-USERID`, `X-Org-Id`, `X-User-Id`, `X-User-Role`, `token`)
- ⚠️ **Token differences** - see detailed analysis below
- ✅ Proxy uses `same-origin` vs direct uses `same-site` (expected for localhost)

### 4. **Token Analysis**

#### Proxy Token (Curl 1) - Decoded Payload:
```json
{
  "ucv": {
    "id": 431463,
    "guid": "USR-edaf2ef6-7561-42d6-b23b-fcdd6399f1ec",
    "firstname": "FT",
    "lastname": "Internal",
    "entity_guid": "COM-48f4f582-7ac6-4df4-a556-b38136b042a8",
    "companyId": 1583874,
    "pwd_exp": "2026-03-04T00:00:00.000Z"
  },
  "iat": 1770276826,
  "nbf": 1770276826,
  "exp": 1770278626,
  "iss": "http://phoenix/api/authenticate",
  "sub": "431463",
  "jti": "ef6730f3-5a51-4041-a821-3043e3de1b3c"
}
```

**Token Expiry:** `1770278626` (Unix timestamp) = `2026-02-05 03:23:46 UTC`

#### Direct Token (Curl 2) - Decoded Payload:
```json
{
  "ucv": {
    "id": 431463,
    "guid": "USR-edaf2ef6-7561-42d6-b23b-fcdd6399f1ec",
    "firstname": "FT",
    "lastname": "Internal",
    "entity_guid": "COM-48f4f582-7ac6-4df4-a556-b38136b042a8",
    "companyId": 1583874,
    "groupId": "9",
    "entity_type": "CNR",
    "companyType": [
      {
        "name": "Consignor",
        "key": "consignor"
      }
    ],
    "pwd_exp": "2026-03-04T00:00:00.000Z"
  },
  "permissions": {
    "permission_create_mask": [1560, 262533, 5244992, 42000384, 1074253376, 469764100, 201395975],
    "permission_update_mask": [1560, 262533, 5244992, 42000384, 2147470912, 469764102, 201395975],
    "permission_read_mask": [1560, 262575, 5310528, 42002432, 2147470912, 520095750, 201588615]
  },
  "deskId": "DSK-c74cf916-b6d3-4913-af3e-bdffcb7636c1",
  "desk_parent_fteid": "COM-48f4f582-7ac6-4df4-a556-b38136b042a8",
  "role_fteid": "ROL-399a1f30-4143-4713-9c82-9a76431d1187",
  "iat": 1770276951,
  "nbf": 1770276951,
  "exp": 1770278751,
  "iss": "http://phoenix/api/authenticate",
  "sub": "431463",
  "jti": "14c9eda8-62e3-4996-8556-4f6bb2c5c97a"
}
```

**Token Expiry:** `1770278751` (Unix timestamp) = `2026-02-05 03:25:51 UTC`

#### Token Comparison:

| Field | Proxy Token | Direct Token | Impact |
|-------|-------------|--------------|--------|
| **User ID** | `431463` | `431463` | ✅ Same user |
| **User GUID** | `USR-edaf2ef6...` | `USR-edaf2ef6...` | ✅ Same |
| **Company ID** | `1583874` | `1583874` | ✅ Same |
| **Entity GUID** | `COM-48f4f582...` | `COM-48f4f582...` | ✅ Same |
| **groupId** | ❌ Not present | ✅ `"9"` | ⚠️ **Missing in proxy token** |
| **entity_type** | ❌ Not present | ✅ `"CNR"` | ⚠️ **Missing in proxy token** |
| **companyType** | ❌ Not present | ✅ `[{"name":"Consignor","key":"consignor"}]` | ⚠️ **Missing in proxy token** |
| **permissions** | ❌ Not present | ✅ Full permission masks | ⚠️ **Missing in proxy token** |
| **deskId** | ❌ Not present | ✅ `"DSK-c74cf916..."` | ⚠️ **Missing in proxy token** |
| **desk_parent_fteid** | ❌ Not present | ✅ `"COM-48f4f582..."` | ⚠️ **Missing in proxy token** |
| **role_fteid** | ❌ Not present | ✅ `"ROL-399a1f30..."` | ⚠️ **Missing in proxy token** |
| **Issued At (iat)** | `1770276826` | `1770276951` | ⚠️ Different (125 seconds apart) |
| **Expiry (exp)** | `1770278626` | `1770278751` | ⚠️ Different (125 seconds apart) |
| **JTI** | `ef6730f3...` | `14c9eda8...` | ⚠️ Different (different tokens) |

**Key Observations:**
- ⚠️ **Proxy token is simplified** - missing critical fields:
  - `groupId`
  - `entity_type`
  - `companyType`
  - `permissions` (create/update/read masks)
  - `deskId`
  - `desk_parent_fteid`
  - `role_fteid`
- ⚠️ **Different token issuance times** - Direct token was issued 125 seconds later
- ⚠️ **Different expiry times** - Direct token expires 125 seconds later
- ⚠️ **Different JTI** - These are different tokens (not the same token)

### 5. **Query Parameters**

Both requests use identical query parameters:
- `entity_type=CNR`
- `journey_stop_type=source`
- `journey_direction=outbound`

✅ **No differences in query parameters**

## Summary

### ✅ Similarities
1. Same API endpoint path structure
2. Same query parameters
3. Same user (ID: 431463)
4. Same company (ID: 1583874)
5. Same user GUID and entity GUID

### ⚠️ Differences

#### Headers:
- ✅ Proxy adds helpful headers: `X-FT-ORGID`, `X-FT-USERID`, `X-Org-Id`, `X-User-Id`, `X-User-Role`, `token`
- Different Origin/Referer (expected for localhost vs production)
- Different Sec-Fetch-Site values (expected)

#### Tokens (Most Significant):
1. **Token Completeness**:
   - **Proxy**: Simplified token missing `groupId`, `entity_type`, `companyType`, `permissions`, `deskId`, `desk_parent_fteid`, `role_fteid`
   - **Direct**: Complete token with all user context and permissions

2. **Token Timing**:
   - Proxy token issued at `1770276826` (2026-02-05 03:20:26 UTC)
   - Direct token issued at `1770276951` (2026-02-05 03:22:31 UTC)
   - 125 seconds difference

3. **Token Expiry**:
   - Proxy token expires at `1770278626` (2026-02-05 03:23:46 UTC)
   - Direct token expires at `1770278751` (2026-02-05 03:25:51 UTC)
   - Both tokens valid for 30 minutes (1800 seconds)

#### Journey IDs:
- Different journey IDs (likely intentional - querying different journeys)

## Recommendations

### 1. **Token Completeness**
The proxy token is missing critical fields that may be required by the API:
- `groupId`
- `entity_type`
- `companyType`
- `permissions` (especially important for authorization)
- `deskId`
- `desk_parent_fteid`
- `role_fteid`

**Action:** Ensure the proxy authentication flow generates tokens with the same completeness as the direct API flow.

### 2. **Token Freshness**
The proxy token was issued 125 seconds before the direct token. This suggests:
- Different authentication flows
- Different token refresh timing
- Possible token caching in proxy

**Action:** Verify token refresh logic in the proxy to ensure tokens are fresh and complete.

### 3. **Additional Headers**
The proxy adds helpful headers (`X-FT-ORGID`, `X-FT-USERID`, etc.) which may be beneficial, but ensure they don't conflict with the token payload.

### 4. **Journey ID Consistency**
The different journey IDs suggest these are different API calls. If comparing the same journey, ensure the same journey ID is used.

## Conclusion

The main difference is in **token completeness**. The proxy token is significantly simplified and missing critical fields like permissions, desk information, and role information. This could potentially cause authorization issues or limit functionality.

The proxy correctly adds helpful headers and uses the correct proxy path (`/__ft_tms`), but the token generation/refresh process should be reviewed to ensure it produces tokens with the same completeness as the direct API authentication flow.
