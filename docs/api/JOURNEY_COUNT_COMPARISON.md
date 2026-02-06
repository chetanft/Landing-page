# Journey Snapshot Count API Comparison

## Overview
Comparison between direct production API call and local proxy API call for the journey snapshot count endpoint.

## Curl 1: Direct Production API

```bash
curl 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2026-01-05+18:30:00&end_time_utc=2026-02-05+18:29:59&journey_direction=outbound&journey_stop_type=source&sort%5Bsort_by%5D=created_at&sort%5Bsort_by_order%5D=DESC&milestones%5B%5D=PLANNED&milestones%5B%5D=BEFORE_ORIGIN&milestones%5B%5D=AT_ORIGIN&milestones%5B%5D=IN_TRANSIT&milestones%5B%5D=AT_DESTINATION&milestones%5B%5D=IN_RETURN&milestones%5B%5D=AFTER_DESTINATION&milestones%5B%5D=CLOSED&active_alerts%5B%5D=long_stoppage&active_alerts%5B%5D=route_deviation&active_alerts%5B%5D=eway_bill&active_analytics%5B%5D=delay_in_minutes&active_analytics%5B%5D=expected_arrival' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1Y3YiOnsiaWQiOjQzMTQ2MywiZ3VpZCI6IlVTUi1lZGFmMmVmNi03NTYxLTQyZDYtYjIzYi1mY2RkNjM5OWYxZWMiLCJmaXJzdG5hbWUiOiJGVCIsImxhc3RuYW1lIjoiSW50ZXJuYWwiLCJlbnRpdHlfZ3VpZCI6IkNPTS00OGY0ZjU4Mi03YWM2LTRkZjQtYTU1Ni1iMzgxMzZiMDQyYTgiLCJjb21wYW55SWQiOjE1ODM4NzQsImdyb3VwSWQiOiI5IiwiZW50aXR5X3R5cGUiOiJDTlIiLCJjb21wYW55VHlwZSI6W3sibmFtZSI6IkNvbnNpZ25vciIsImtleSI6ImNvbnNpZ25vciJ9XSwicHdkX2V4cCI6IjIwMjYtMDMtMDRUMDA6MDA6MDAuMDAwWiJ9LCJwZXJtaXNzaW9ucyI6eyJwZXJtaXNzaW9uX2NyZWF0ZV9tYXNrIjpbMTU2MCwyNjI1MzMsNTI0NDk5Miw0MjAwMDM4NCwxMDc0MjUzMzc2LDQ2OTc2NDEwMCwyMDEzOTU5NzVdLCJwZXJtaXNzaW9uX3VwZGF0ZV9tYXNrIjpbMTU2MCwyNjI1NjUsNTI0NDk5Miw0MjAwMDM4NCwyMTQ3NDcwOTEyLDQ2OTc2NDEwMiwyMDEzOTU5NzVdLCJwZXJtaXNzaW9uX3JlYWRfbWFzayI6WzE1NjAsMjYyNTc1LDUzMTA1MjgsNDIwMDI0MzIsMjE0NzQ3MDkxMiw1MjAwOTU3NTAsMjAxNTg4NjE1XX0sImRlc2tJZCI6IkRTSy1jNzRjZjkxNi1iNmQzLTQ5MTMtYWYzZS1iZGZmY2I3NjM2YzEiLCJkZXNrX3BhcmVudF9mdGVpZCI6IkNPTS00OGY0ZjU4Mi03YWM2LTRkZjQtYTU1Ni1iMzgxMzZiMDQyYTgiLCJyb2xlX2Z0ZWlkIjoiUk9MLTM5OWExZjMwLTQxNDMtNDcxMy05YzgyLTlhNzY0MzFkMTE4NyIsImlhdCI6MTc3MDI3OTU4NCwibmJmIjoxNzcwMjc5NTg0LCJleHAiOjE3NzAyODEzODQsImlzcyI6Imh0dHA6Ly9waG9lbml4L2FwaS9hdXRoZW50aWNhdGUiLCJzdWIiOjQzMTQ2MywianRpIjoiZDY3NTQxZjItMmE5Zi00NmJhLWIyY2YtZTdjZWU3Nzc2ZWVhIn0.iE5Xesbpr2RLNOeKMJ8_7xM9MQdGhTzVob1T4BhuGSo' \
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
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
```

## Curl 2: Local Proxy API

```bash
curl 'http://localhost:5173/__ft_tms/api/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=PLANNED&start_time_utc=2026-01-06%2B18%3A30%3A00&end_time_utc=2026-02-05%2B18%3A29%3A59&journey_direction=outbound&journey_stop_type=source&sort%5Bsort_by%5D=created_at&sort%5Bsort_by_order%5D=DESC&milestones%5B%5D=PLANNED&milestones%5B%5D=BEFORE_ORIGIN&milestones%5B%5D=AT_ORIGIN&milestones%5B%5D=IN_TRANSIT&milestones%5B%5D=AT_DESTINATION&milestones%5B%5D=IN_RETURN&milestones%5B%5D=AFTER_DESTINATION&milestones%5B%5D=CLOSED&active_alerts%5B%5D=long_stoppage&active_alerts%5B%5D=route_deviation&active_alerts%5B%5D=eway_bill&active_analytics%5B%5D=delay_in_minutes&active_analytics%5B%5D=expected_arrival' \
  -H 'Accept: application/json' \
  -H 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'Authorization: Bearer undefined' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Referer: http://localhost:5173/v10/summarydashboard' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
  -H 'X-FT-ORGID: 1583874' \
  -H 'X-Org-Id: 1583874' \
  -H 'X-User-Id: 431463' \
  -H 'X-User-Role: user' \
  -H 'sec-ch-ua: "Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'token: undefined'
```

## Key Differences

### 1. **URL Structure**

| Aspect | Curl 1 (Direct) | Curl 2 (Proxy) |
|--------|----------------|----------------|
| **Base URL** | `https://api.freighttiger.com` | `http://localhost:5173/__ft_tms` |
| **Path** | `/api/journey-snapshot/v1/journeys/count` | `/api/journey-snapshot/v1/journeys/count` |
| **Protocol** | HTTPS | HTTP (local dev) |
| **Proxy Prefix** | None | `/__ft_tms` |

**Analysis:**
- ✅ Same API endpoint path
- Proxy rewrites `/__ft_tms` prefix and forwards to production API

### 2. **Query Parameters Comparison**

#### Decoded Query Parameters:

| Parameter | Curl 1 (Direct) | Curl 2 (Proxy) | Difference |
|-----------|----------------|----------------|------------|
| **page** | `1` | `1` | ✅ Same |
| **size** | `20` | `20` | ✅ Same |
| **entity_type** | `CNR` | `CNR` | ✅ Same |
| **journey_status** | `IN_TRANSIT` | `PLANNED` | ⚠️ **Different status filters** |
| **start_time_utc** | `2026-01-05+18:30:00` | `2026-01-06+18:30:00` | ⚠️ **Different start date** (1 day later) |
| **end_time_utc** | `2026-02-05+18:29:59` | `2026-02-05+18:29:59` | ✅ Same |
| **journey_direction** | `outbound` | `outbound` | ✅ Same |
| **journey_stop_type** | `source` | `source` | ✅ Same |
| **sort[sort_by]** | `created_at` | `created_at` | ✅ Same |
| **sort[sort_by_order]** | `DESC` | `DESC` | ✅ Same |
| **milestones[]** | All 7 milestones | All 7 milestones | ✅ Same |
| **active_alerts[]** | All 3 alerts | All 3 alerts | ✅ Same |
| **active_analytics[]** | Both analytics | Both analytics | ✅ Same |

#### Query Parameter Differences:

1. **journey_status**:
   - **Direct**: `IN_TRANSIT`
   - **Proxy**: `PLANNED`
   - **Impact**: Different journey status filters will return different results

2. **start_time_utc**:
   - **Direct**: `2026-01-05 18:30:00` (January 5th)
   - **Proxy**: `2026-01-06 18:30:00` (January 6th) - URL encoded as `2026-01-06%2B18%3A30%3A00`
   - **Impact**: Proxy query starts 1 day later, reducing the date range by 1 day

3. **URL Encoding**:
   - **Direct**: Uses `+` for space in dates (`2026-01-05+18:30:00`)
   - **Proxy**: Uses URL encoding (`%2B` for `+`, `%3A` for `:`) (`2026-01-06%2B18%3A30%3A00`)
   - **Note**: Both are valid, but proxy uses proper URL encoding

### 3. **Headers Comparison**

| Header | Curl 1 (Direct) | Curl 2 (Proxy) | Notes |
|--------|----------------|----------------|-------|
| **Accept** | `application/json, text/plain, */*` | `application/json` | Direct has more verbose accept header |
| **Accept-Language** | `en-GB,en-US;q=0.9,en;q=0.8` | `en-GB,en-US;q=0.9,en;q=0.8` | ✅ Same |
| **Authorization** | Valid Bearer token | `Bearer undefined` | ⚠️ **CRITICAL: Proxy has undefined token** |
| **Connection** | Not present | `keep-alive` | Proxy adds connection header |
| **Content-Type** | `application/json` | `application/json` | ✅ Same |
| **Origin** | `https://www.freighttiger.com` | `http://localhost:5173` | Different origins (expected) |
| **Referer** | `https://www.freighttiger.com/` | `http://localhost:5173/v10/summarydashboard` | Different referers (expected) |
| **Sec-Fetch-Site** | `same-site` | `same-origin` | Different fetch context (expected) |
| **Priority** | `u=1, i` | Not present | Direct call includes priority header |
| **X-FT-ORGID** | Not present | `1583874` | ✅ Proxy adds org ID header |
| **X-Org-Id** | Not present | `1583874` | ✅ Proxy adds org ID header (duplicate) |
| **X-User-Id** | Not present | `431463` | ✅ Proxy adds user ID header |
| **X-User-Role** | Not present | `user` | ✅ Proxy adds user role header |
| **token** | Not present | `undefined` | ⚠️ **Proxy has undefined token header** |
| **User-Agent** | Same | Same | ✅ Same |
| **sec-ch-ua*** | Same | Same | ✅ Same |

**Key Observations:**
- ⚠️ **CRITICAL ISSUE**: Proxy has `Authorization: Bearer undefined` - token is not being set
- ⚠️ **CRITICAL ISSUE**: Proxy has `token: undefined` - token header is also undefined
- ✅ Proxy adds helpful headers: `X-FT-ORGID`, `X-Org-Id`, `X-User-Id`, `X-User-Role`
- ✅ Different Origin/Referer (expected for localhost vs production)

### 4. **Token Analysis**

#### Direct Token (Curl 1) - Decoded Payload:
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
    "permission_update_mask": [1560, 262565, 5244992, 42000384, 2147470912, 469764102, 201395975],
    "permission_read_mask": [1560, 262575, 5310528, 42002432, 2147470912, 520095750, 201588615]
  },
  "deskId": "DSK-c74cf916-b6d3-4913-af3e-bdffcb7636c1",
  "desk_parent_fteid": "COM-48f4f582-7ac6-4df4-a556-b38136b042a8",
  "role_fteid": "ROL-399a1f30-4143-4713-9c82-9a76431d1187",
  "iat": 1770279584,
  "nbf": 1770279584,
  "exp": 1770281384,
  "iss": "http://phoenix/api/authenticate",
  "sub": 431463,
  "jti": "d67541f2-2a9f-46ba-b2cf-e7cee7776eea"
}
```

**Token Expiry:** `1770281384` (Unix timestamp) = `2026-02-05 03:36:24 UTC`

#### Proxy Token (Curl 2):
- **Authorization**: `Bearer undefined` ❌
- **token**: `undefined` ❌

**Analysis:**
- ⚠️ **CRITICAL**: Proxy request has no valid token
- This will cause authentication failures
- The token is not being retrieved or set in the proxy request

## Summary

### ✅ Similarities
1. Same API endpoint path
2. Same pagination (`page=1`, `size=20`)
3. Same entity type (`CNR`)
4. Same date range end time
5. Same journey direction (`outbound`)
6. Same journey stop type (`source`)
7. Same sort parameters
8. Same milestones, alerts, and analytics filters

### ⚠️ Critical Differences

#### 1. **Authentication (CRITICAL)**:
- **Direct**: Valid Bearer token with full user context and permissions
- **Proxy**: `Bearer undefined` - **NO TOKEN** ❌
- **Impact**: Proxy request will fail with 401 Unauthorized

#### 2. **Query Parameters**:
- **journey_status**: 
  - Direct: `IN_TRANSIT`
  - Proxy: `PLANNED`
  - **Impact**: Different status filters return different results
  
- **start_time_utc**:
  - Direct: `2026-01-05 18:30:00` (January 5th)
  - Proxy: `2026-01-06 18:30:00` (January 6th)
  - **Impact**: Proxy query starts 1 day later (30-day range vs 29-day range)

#### 3. **Headers**:
- Proxy adds helpful headers (`X-FT-ORGID`, `X-Org-Id`, `X-User-Id`, `X-User-Role`)
- Different Origin/Referer (expected for localhost)

## Recommendations

### 1. **CRITICAL: Fix Token Issue**
The proxy request has `Authorization: Bearer undefined` and `token: undefined`. This is a critical issue that will cause authentication failures.

**Actions:**
- Verify token retrieval logic in the proxy/client code
- Ensure authentication state is properly maintained
- Check if token is being stored/retrieved from localStorage or sessionStorage
- Verify token is being passed correctly in API requests

**Possible Causes:**
- Token not stored after login
- Token expired and not refreshed
- Token retrieval failing silently
- Token not being read from storage correctly

### 2. **Journey Status Filter**
The proxy uses `PLANNED` while direct uses `IN_TRANSIT`. Verify if this is intentional or if the proxy should match the direct call's status filter.

### 3. **Date Range**
The proxy starts 1 day later (`2026-01-06` vs `2026-01-05`). Verify if this is intentional or if the date range calculation needs to be fixed.

### 4. **URL Encoding**
The proxy uses proper URL encoding (`%2B` for `+`, `%3A` for `:`), which is correct. The direct call uses `+` which also works but is less standard.

## Conclusion

The **most critical issue** is the missing token in the proxy request (`Bearer undefined`). This will cause the API call to fail with authentication errors. The token must be properly retrieved and set in the Authorization header before making the request.

Additionally, there are differences in:
- Journey status filter (`PLANNED` vs `IN_TRANSIT`)
- Start date (`2026-01-06` vs `2026-01-05`)

These differences suggest the proxy call may be using different filters or date calculations, which could be intentional based on the application's requirements.
