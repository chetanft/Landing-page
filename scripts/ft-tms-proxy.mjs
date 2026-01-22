import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const stripQuotes = (value) => {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

const readEnvFile = (filename) => {
  const filepath = resolve(process.cwd(), filename)
  if (!existsSync(filepath)) {
    return {}
  }

  const contents = readFileSync(filepath, 'utf-8').replace(/^\uFEFF/, '')
  return contents.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return acc
    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex === -1) return acc
    const key = normalized.slice(0, separatorIndex).trim()
    const value = normalized.slice(separatorIndex + 1).trim()
    acc[key] = stripQuotes(value)
    return acc
  }, {})
}

const loadEnv = () => ({
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...process.env
})

const env = loadEnv()
const envKeys = new Set(Object.keys(env))
// Ensure base URL ends with / so new URL() treats it as a directory
const rawApiBaseUrl = env.FT_TMS_API_BASE_URL || ''
const apiBaseUrl = rawApiBaseUrl.endsWith('/')
  ? rawApiBaseUrl
  : `${rawApiBaseUrl}/`
const authUrl = env.FT_TMS_AUTH_URL || 'https://api.freighttiger.com/api/authentication/v1/auth/login'
const username = env.FT_TMS_USERNAME
const password = env.FT_TMS_PASSWORD
const uniqueId = env.FT_TMS_UNIQUE_ID
const hasCredentials = Boolean(username && password && uniqueId)
const appId = env.FT_TMS_APP_ID || 'web'
const port = Number(env.FT_TMS_PROXY_PORT || 8787)
const presetToken = env.FT_TMS_API_TOKEN
const indentToken = env.FT_TMS_INDENT_TOKEN

if (!apiBaseUrl) {
  console.error('FT TMS proxy requires FT_TMS_API_BASE_URL in .env.local')
  process.exit(1)
}

let cachedToken = presetToken || ''
let tokenExpiresAt = 0

const isTokenValid = () => cachedToken && Date.now() < tokenExpiresAt

const extractToken = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  return payload.access_token || payload.accessToken || payload.token || payload.data?.access_token || payload.data?.token || null
}

const extractExpiresIn = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  return payload.expires_in || payload.expiresIn || payload.data?.expires_in || payload.data?.expiresIn || null
}

const fetchToken = async () => {
  const hasCredentials = Boolean(username && password && uniqueId)
  const shouldUsePresetToken = presetToken && !hasCredentials
  if (shouldUsePresetToken) {
    cachedToken = presetToken
    tokenExpiresAt = Date.now() + (60 * 60 * 1000)
    return cachedToken
  }

  if (!username || !password || !uniqueId) {
    const missing = [
      !username ? 'FT_TMS_USERNAME' : null,
      !password ? 'FT_TMS_PASSWORD' : null,
      !uniqueId ? 'FT_TMS_UNIQUE_ID' : null,
    ].filter(Boolean).join(', ')
    throw new Error(`Missing ${missing} for auth (cwd: ${process.cwd()}, env keys: ${[...envKeys].filter(key => key.startsWith('FT_TMS_')).join(', ') || 'none'})`)
  }

  let response
  try {
    response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-ft-unique-id': uniqueId
      },
      body: new URLSearchParams({
        username,
        password,
        grant_type: 'password',
        app_id: appId
      }).toString()
    })
  } catch (error) {
    if (presetToken) {
      console.warn('Auth request failed, falling back to preset token.')
      cachedToken = presetToken
      tokenExpiresAt = Date.now() + (60 * 60 * 1000)
      return cachedToken
    }
    throw error
  }

  if (!response.ok) {
    const bodyText = await response.text()
    if (presetToken) {
      console.warn('Auth failed, falling back to preset token.')
      cachedToken = presetToken
      tokenExpiresAt = Date.now() + (60 * 60 * 1000)
      return cachedToken
    }
    const error = new Error(`Auth failed (${response.status}): ${bodyText}`)
    error.status = response.status
    error.body = bodyText
    error.isAuthError = true
    throw error
  }

  const payload = await response.json()
  const token = extractToken(payload)
  if (!token) {
    throw new Error('Auth response missing token')
  }

  const expiresIn = Number(extractExpiresIn(payload) || 3600)
  cachedToken = token
  tokenExpiresAt = Date.now() + (expiresIn * 1000) - (60 * 1000)
  return cachedToken
}

const getAuthToken = async () => {
  if (isTokenValid()) {
    return cachedToken
  }
  const token = await fetchToken()
  // Log token prefix for debugging (first 20 chars)
  console.log(`Using token: ${token.substring(0, 20)}...`)
  return token
}

const sanitizeHeaders = (headers) => {
  const filtered = {}
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    if (['host', 'connection', 'content-length'].includes(lowerKey)) continue
    filtered[key] = value
  }
  return filtered
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end('Missing URL')
    return
  }

  if (req.url === '/health') {
    res.writeHead(200)
    res.end('ok')
    return
  }

  if (!req.url.startsWith('/__ft_tms')) {
    res.writeHead(404)
    res.end('Not Found')
    return
  }

  const targetPath = req.url.replace(/^\/__ft_tms/, '') || '/'
  // Ensure path doesn't start with / to preserve base URL path (e.g., /api)
  let normalizedPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath
  // Avoid double /api when base URL already ends with /api/
  if (apiBaseUrl.endsWith('/api/') && normalizedPath.startsWith('api/')) {
    normalizedPath = normalizedPath.slice('api/'.length)
  }
  const targetUrl = new URL(normalizedPath, apiBaseUrl)

  let bodyBuffer = null
  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    bodyBuffer = await new Promise((resolve) => {
      const chunks = []
      req.on('data', (chunk) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }
  
  // Debug: log raw body for auth login requests
  const isAuthLoginDebug = targetPath.includes('/api/authentication/v1/auth/login')
  if (isAuthLoginDebug && bodyBuffer) {
    const rawBody = bodyBuffer.toString('utf-8')
    // Log the full raw body to debug encoding issues (TEMPORARY)
    console.log(`Raw auth body (length ${rawBody.length}):`)
    console.log(`  FULL: ${rawBody}`)
    // Also parse and log individual fields
    const params = new URLSearchParams(rawBody)
    console.log(`  username: "${params.get('username')}"`)
    console.log(`  password length: ${params.get('password')?.length}, first3: "${params.get('password')?.slice(0, 3)}", last3: "${params.get('password')?.slice(-3)}"`)
    console.log(`  grant_type: "${params.get('grant_type')}"`)
    console.log(`  app_id: "${params.get('app_id')}"`)
  }

  try {
    // Node.js HTTP headers are lowercase
    const incomingAuth = req.headers.authorization || req.headers.Authorization
    let token = null
    let useIncomingAuth = false
    
    if (incomingAuth && incomingAuth.startsWith('Bearer ')) {
      const incomingToken = incomingAuth.replace('Bearer ', '')
      // Check if token is expired
      try {
        const parts = incomingToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
          const exp = payload.exp * 1000
          const now = Date.now()
          const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
          if (now < (exp - bufferTime)) {
            useIncomingAuth = true
            console.log(`Using incoming Authorization header (expires in ${Math.round((exp - now) / 1000 / 60)} min)`)
          } else {
            if (!hasCredentials) {
              useIncomingAuth = true
              console.warn('Incoming token expiring soon, but no proxy credentials; using it anyway.')
            } else {
              console.warn('Incoming token expired or expiring soon, fetching fresh token...')
            }
          }
        }
      } catch (e) {
        // If we can't decode, assume it's valid and use it
        useIncomingAuth = true
      }
    }
    
    const isAuthLogin = targetPath.includes('/api/authentication/v1/auth/login')
    const isDeskTokenApi = targetPath.includes('/api/authentication/v1/auth/token/desk/')
    const isIndentApi = targetPath.includes('/cyclops/indent')
    const isTripSnapshotApi = targetPath.includes('/trip-snapshot/')
    if (isTripSnapshotApi && incomingAuth) {
      // Always prefer browser auth token for trip-snapshot APIs
      useIncomingAuth = true
    }
    if (!useIncomingAuth && !isAuthLogin && !isDeskTokenApi && !isIndentApi && !isTripSnapshotApi) {
      try {
        token = await getAuthToken()
      } catch (error) {
        if (incomingAuth) {
          useIncomingAuth = true
          console.warn('Proxy auth failed; falling back to incoming Authorization header.')
        } else {
          throw error
        }
      }
    }
    
    const apiHeaders = {
      ...sanitizeHeaders(req.headers)
    }

    // Avoid duplicate Authorization headers forwarded from the browser
    delete apiHeaders.authorization
    delete apiHeaders.Authorization
    
    // Indent API uses custom 'token' header instead of 'Authorization: Bearer'
    // But it uses the SAME token value from login
    // Auth login endpoint must not receive Authorization header
    if (isIndentApi) {
      // Capture the incoming token header BEFORE deleting it
      // The client may send token directly via 'token' header
      const incomingTokenHeader = req.headers.token || req.headers.Token
      
      // For indent API, clean up headers that might interfere
      delete apiHeaders.token
      delete apiHeaders.Token
      delete apiHeaders.authorization
      delete apiHeaders.Authorization
      // Remove user context headers - indent API doesn't need them
      delete apiHeaders['x-org-id']
      delete apiHeaders['x-branch-id']
      delete apiHeaders['x-user-id']
      delete apiHeaders['x-user-role']
      delete apiHeaders['X-Org-Id']
      delete apiHeaders['X-Branch-Id']
      delete apiHeaders['X-User-Id']
      delete apiHeaders['X-User-Role']
      delete apiHeaders['x-ft-unique-id']
      delete apiHeaders['x-ft-app-id']
      delete apiHeaders['X-FT-Unique-Id']
      delete apiHeaders['X-FT-App-Id']
      
    // Determine which token to use for indent API (priority order):
    // 1. Incoming 'token' header from client (client already set it correctly)
    // 2. Incoming Authorization header (extract Bearer token)
    // 3. Proxy's cached/fetched token as fallback
      let indentTokenValue = null
    if (incomingTokenHeader) {
        indentTokenValue = incomingTokenHeader
        console.log(`Using incoming token header for indent API`)
      } else if (useIncomingAuth && incomingAuth) {
        // Extract token from "Bearer <token>" format
        indentTokenValue = incomingAuth.replace('Bearer ', '')
        console.log(`Using incoming auth token for indent API (from Authorization header)`)
      } else if (token) {
        indentTokenValue = token
        console.log(`Using proxy token for indent API (fallback)`)
      }
      
      if (indentTokenValue) {
        apiHeaders.token = indentTokenValue
        // NOTE: Indent API uses ONLY 'token' header, NOT 'Authorization: Bearer'
        // Do NOT add Authorization header for indent API
      } else {
        console.warn(`WARNING: No token available for indent API request!`)
      }
    } else if (isDeskTokenApi) {
      // Desk token API expects login token in 'token' header (FT app behavior)
      const incomingTokenHeader = req.headers.token || req.headers.Token
      if (incomingTokenHeader) {
        apiHeaders.token = incomingTokenHeader
      } else {
        console.warn('Desk token API request missing token header')
      }
    } else if (!isAuthLogin) {
      apiHeaders.Authorization = useIncomingAuth ? incomingAuth : `Bearer ${token}`
    }
    
    // Override Origin and Referer to match FT site (required by AWS API Gateway)
    apiHeaders['origin'] = 'https://www.freighttiger.com'
    apiHeaders['referer'] = isAuthLogin
      ? 'https://www.freighttiger.com/login'
      : 'https://www.freighttiger.com/'
    if (isTripSnapshotApi && !apiHeaders.source) {
      apiHeaders.source = 'ePOD'
    }
    
    // Add required FT headers if available (but NOT for login or indent - they cause auth failure)
    if (uniqueId && !isAuthLogin && !isIndentApi) {
      apiHeaders['x-ft-unique-id'] = uniqueId
    }
    if (appId && !isAuthLogin && !isIndentApi) {
      apiHeaders['x-ft-app-id'] = appId
    }
    
    // Log request details for debugging
    console.log(`[${req.method}] ${targetPath} -> ${targetUrl.toString()}`)
    console.log(`Headers: ${JSON.stringify(Object.keys(apiHeaders).sort())}`)
    if (isAuthLogin && bodyBuffer) {
      const bodyText = bodyBuffer.toString('utf-8')
      const params = new URLSearchParams(bodyText)
      const username = params.get('username') || ''
      const password = params.get('password') || ''
      const grantType = params.get('grant_type') || ''
      const appIdValue = params.get('app_id') || ''
      const maskedUsername = username ? `${username.slice(0, 2)}***${username.slice(-2)}` : '(empty)'
      const passwordInfo = password ? `len=${password.length}` : '(empty)'
      console.log(`Auth body: username=${maskedUsername}, password=${passwordInfo}, grant_type=${grantType || '(empty)'}, app_id=${appIdValue || '(empty)'}`)
    }
    if (apiHeaders['cookie']) {
      console.log(`Cookies: ${apiHeaders['cookie'].substring(0, 100)}...`)
    } else {
      console.log('No cookies in request')
    }
    
    let response
    try {
      response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers: apiHeaders,
        body: bodyBuffer
      })
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : String(fetchError)
      console.error('FT TMS proxy fetch failed:', message)
      console.error('Target URL:', targetUrl.toString())
      console.error('Request headers:', JSON.stringify(Object.keys(apiHeaders).sort()))
      const cause = fetchError && typeof fetchError === 'object' && 'cause' in fetchError ? fetchError.cause : null
      if (cause) {
        console.error('Fetch error cause:', cause)
      }
      throw fetchError
    }
    
    if (isAuthLogin) {
      if (!response.ok) {
        try {
          const errorText = await response.clone().text()
          const preview = errorText.length > 500 ? `${errorText.slice(0, 500)}...` : errorText
          console.log(`Auth error body: ${preview}`)
        } catch (e) {
          console.warn('Failed to read auth error body')
        }
      } else {
        try {
          const authPayload = await response.clone().json()
          const accessToken = authPayload?.access_token || authPayload?.accessToken || authPayload?.data?.access_token || authPayload?.data?.accessToken || authPayload?.token || authPayload?.data?.token
          const authToken = authPayload?.auth_token || authPayload?.data?.auth_token
          console.log('[Auth login] token lengths:', {
            access_token: accessToken ? accessToken.length : 0,
            auth_token: authToken ? authToken.length : 0,
            hasDataWrapper: Boolean(authPayload?.data)
          })
        } catch (e) {
          console.warn('Failed to parse auth success body for token lengths')
        }
      }
    }

    console.log(`Response: ${response.status} ${response.statusText}`)

    const responseHeaders = Object.fromEntries(response.headers.entries())
    // Avoid content-length/encoding mismatches after fetch decompression
    delete responseHeaders['content-length']
    delete responseHeaders['content-encoding']
    delete responseHeaders['transfer-encoding']
    res.writeHead(response.status, responseHeaders)
    const responseBody = await response.arrayBuffer()
    res.end(Buffer.from(responseBody))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const status = error && typeof error === 'object' && 'status' in error ? error.status : 502
    const body = error && typeof error === 'object' && 'body' in error ? error.body : null
    const isAuthError = error && typeof error === 'object' && 'isAuthError' in error

    console.error('FT TMS proxy error:', errorMessage)

    if (isAuthError && body) {
      const contentType = body.trim().startsWith('{') || body.trim().startsWith('[')
        ? 'application/json'
        : 'text/plain'
      res.writeHead(status, { 'Content-Type': contentType })
      res.end(body)
      return
    }

    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, message: `Proxy error: ${errorMessage}` }))
  }
})

server.listen(port, async () => {
  const envPath = existsSync(resolve(process.cwd(), '.env.local'))
    ? '.env.local'
    : (existsSync(resolve(process.cwd(), '.env')) ? '.env' : 'none')
  const visibleKeys = [...envKeys].filter(key => key.startsWith('FT_TMS_')).sort().join(', ') || 'none'
  console.log(`FT TMS proxy loaded env: ${envPath} (cwd: ${process.cwd()})`)
  console.log(`FT TMS proxy env keys: ${visibleKeys}`)
  console.log(`FT TMS proxy listening on http://localhost:${port}`)
  
  // Test auth on startup to verify credentials work
  if (username && password && uniqueId) {
    console.log(`\nTesting auth with env credentials...`)
    console.log(`  username: ${username}`)
    console.log(`  password: len=${password.length}, first3="${password.slice(0, 3)}", last3="${password.slice(-3)}"`)
    try {
      const testBody = new URLSearchParams({
        username,
        password,
        grant_type: 'password',
        app_id: appId
      }).toString()
      console.log(`  body: ${testBody.replace(/password=[^&]+/, 'password=***')}`)
      
      const testResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://www.freighttiger.com',
          'Referer': 'https://www.freighttiger.com/login',
          'Cache-Control': 'no-cache'
          // NOTE: Do NOT send x-ft-unique-id for login - it causes auth failure
        },
        body: testBody
      })
      const testData = await testResponse.text()
      console.log(`  Response: ${testResponse.status} ${testResponse.statusText}`)
      if (testResponse.ok) {
        console.log(`  SUCCESS! Auth working.`)
      } else {
        console.log(`  FAILED: ${testData}`)
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
    }
  }
})
