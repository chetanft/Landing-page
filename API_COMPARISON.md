# API Request Comparison: Local Proxy vs Direct API

## Overview
This document compares two login API requests:
1. **Local Dev Server (via Proxy)**: `http://localhost:5173/__ft_tms/api/authentication/v1/auth/login`
2. **Direct API**: `https://api.freighttiger.com/api/authentication/v1/auth/login`

---

## Request 1: Local Dev Server (via Proxy)

```bash
curl 'http://localhost:5173/__ft_tms/api/authentication/v1/auth/login' \
  -H 'Accept: application/json' \
  -H 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5173' \
  -H 'Referer: http://localhost:5173/login' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'x-ft-unique-id: 1769080270477ce71c2d3-7406-48c0-909e-dd5e9f453fee' \
  --data-raw '{"username":"<redacted>","password":"<encrypted_password_redacted>","grant_type":"password","app_id":"web"}'
```

### Request 2: Direct API Call

```bash
curl --location 'https://api.freighttiger.com/api/authentication/v1/auth/login' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'x-ft-unique-id: 17506646985098d088445-fcc7-4120-805a-751109e5a727' \
--data-raw '{
    "username": "<redacted>",
    "password": "<encrypted_password_redacted>",
    "grant_type": "password",
    "app_id": "web"
  }'
```

---

## Detailed Comparison

### 1. **URL / Endpoint**

| Aspect | Request 1 (Local Proxy) | Request 2 (Direct API) |
|--------|------------------------|------------------------|
| **Protocol** | `http://` | `https://` |
| **Host** | `localhost:5173` | `api.freighttiger.com` |
| **Path Prefix** | `/__ft_tms` (proxy prefix) | None (direct) |
| **Full Path** | `/__ft_tms/api/authentication/v1/auth/login` | `/api/authentication/v1/auth/login` |
| **Proxy Behavior** | Vite proxy rewrites `/__ft_tms` → removes prefix and forwards to target | Direct call, no proxy |

**Key Difference**: 
- Request 1 goes through Vite dev server proxy configured in `vite.config.ts`
- Request 2 calls the API directly (may have CORS issues)

---

### 2. **Headers Comparison**

| Header | Request 1 (Local Proxy) | Request 2 (Direct API) | Impact |
|--------|------------------------|------------------------|--------|
| `Accept` | `application/json` | `application/json` | ✅ Same |
| `Content-Type` | `application/json` | `application/json` | ✅ Same |
| `x-ft-unique-id` | `1769080270477ce71c2d3-7406-48c0-909e-dd5e9f453fee` | `17506646985098d088445-fcc7-4120-805a-751109e5a727` | ⚠️ Different (dynamic) |
| `Origin` | `http://localhost:5173` ✅ | ❌ Missing | 🔴 **CRITICAL** - API may require this |
| `Referer` | `http://localhost:5173/login` ✅ | ❌ Missing | ⚠️ May be checked by API |
| `Cache-Control` | `no-cache` ✅ | ❌ Missing | ⚠️ Minor |
| `Accept-Language` | `en-GB,en-US;q=0.9,en;q=0.8` | ❌ Missing | ⚠️ Minor |
| `User-Agent` | Full browser UA string | ❌ Missing (curl default) | ⚠️ May affect API behavior |
| `Sec-Fetch-*` | All present (browser headers) | ❌ Missing | ⚠️ Browser security headers |
| `sec-ch-ua-*` | All present | ❌ Missing | ⚠️ Browser client hints |

**Critical Missing Headers in Request 2:**
- ❌ **`Origin`** - Required for CORS validation
- ❌ **`Referer`** - May be checked by API security

---

### 3. **Request Body**

| Field | Request 1 (Local Proxy) | Request 2 (Direct API) |
|-------|------------------------|------------------------|
| `username` | `<redacted>` | `<redacted>` |
| `password` | `<encrypted_password_redacted>` | `<encrypted_password_redacted>` |
| `grant_type` | `password` | `password` |
| `app_id` | `web` | `web` |

**Key Differences:**
- Different usernames (different test accounts)
- Different encrypted passwords (encrypted with different `x-ft-unique-id` values)
- Same structure and required fields

**Password Encryption:**
Both passwords are AES-encrypted using:
- Key: `SHA256(username + x-ft-unique-id)`
- Algorithm: AES encryption
- The `x-ft-unique-id` must match between header and encryption key

---

### 4. **Proxy Configuration**

**Request 1** uses Vite proxy configured in `vite.config.ts`:

```typescript
proxy: {
  '/__ft_tms': {
    target: ftTmsProxyUrl || ftTmsApiBaseUrl,
    changeOrigin: true,
    secure: true,
    rewrite: (proxyPath) => {
      if (ftTmsProxyUrl) {
        return proxyPath  // Keep prefix for external proxy
      }
      return proxyPath.replace(/^\/__ft_tms/, '')  // Remove prefix for direct API
    }
  }
}
```

**How it works:**
1. Browser sends request to `http://localhost:5173/__ft_tms/api/authentication/v1/auth/login`
2. Vite dev server intercepts `/__ft_tms` prefix
3. Proxy rewrites URL (removes `/__ft_tms` if using direct API)
4. Forwards request to `https://api.freighttiger.com/api/authentication/v1/auth/login`
5. Browser headers (`Origin`, `Referer`) are preserved
6. Response is proxied back to browser

**Request 2** bypasses proxy entirely:
- Direct HTTPS call to API
- May fail CORS checks (missing `Origin` header)
- No local development benefits

---

### 5. **CORS & Security Implications**

| Aspect | Request 1 (Local Proxy) | Request 2 (Direct API) |
|--------|------------------------|------------------------|
| **CORS** | ✅ Handled by proxy (same-origin from browser perspective) | ❌ May fail CORS (missing Origin) |
| **Origin Header** | ✅ Present (`http://localhost:5173`) | ❌ Missing |
| **Referer Header** | ✅ Present | ❌ Missing |
| **Browser Context** | ✅ Full browser environment | ❌ cURL (no browser) |
| **Cookies** | ✅ `credentials: 'include'` | ⚠️ May not send cookies |

**Why Request 1 Works Better:**
- Browser automatically adds `Origin` and `Referer` headers
- Proxy handles CORS by making server-to-server request
- Cookies are included automatically
- Matches production browser behavior

**Why Request 2 May Fail:**
- Missing `Origin` header → API may reject for CORS security
- Missing `Referer` → Additional security check may fail
- No browser context → Different behavior than production

---

### 6. **Code Implementation**

**Request 1** matches the codebase implementation in `authApiService.ts`:

```typescript
// Line 235-240
const response = await fetch(this.getBaseUrl(), {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'x-ft-unique-id': dynamicId
  },
  body: JSON.stringify(bodyPayload),
  credentials: 'include' // Includes cookies
})
```

**Key Points:**
- Uses `credentials: 'include'` for cookies
- Browser automatically adds `Origin` and `Referer`
- Proxy handles URL rewriting
- Matches production behavior

---

## Recommendations

### ✅ Use Request 1 (Local Proxy) for Development
- **Pros:**
  - Handles CORS automatically
  - Preserves browser headers
  - Matches production behavior
  - Easier debugging (local dev server)
  - No CORS preflight issues

### ⚠️ Request 2 (Direct API) Limitations
- **Cons:**
  - Missing `Origin` header may cause 401/403 errors
  - Missing `Referer` may trigger security checks
  - No browser context
  - May not work due to CORS restrictions

### 🔧 To Make Request 2 Work:
If you need to test direct API calls, add:

```bash
curl --location 'https://api.freighttiger.com/api/authentication/v1/auth/login' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'Origin: https://www.freighttiger.com' \
--header 'Referer: https://www.freighttiger.com/' \
--header 'x-ft-unique-id: YOUR_DYNAMIC_ID' \
--data-raw '{
    "username": "your_username",
    "password": "encrypted_password",
    "grant_type": "password",
    "app_id": "web"
  }'
```

**Note:** Even with headers, direct API calls may still fail due to CORS policy restrictions. The proxy approach (Request 1) is recommended.

---

## Summary

| Feature | Request 1 (Proxy) | Request 2 (Direct) |
|---------|------------------|-------------------|
| **CORS Handling** | ✅ Automatic | ❌ Manual/May fail |
| **Browser Headers** | ✅ Complete | ❌ Missing critical headers |
| **Development** | ✅ Recommended | ⚠️ Limited |
| **Production-like** | ✅ Yes | ❌ No |
| **Ease of Use** | ✅ Simple | ⚠️ Complex |

**Conclusion:** Request 1 (via local proxy) is the recommended approach for development and testing, as it properly handles CORS, includes all necessary browser headers, and matches production behavior.
