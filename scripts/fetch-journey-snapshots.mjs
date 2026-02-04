import { Client } from 'pg'

const API_URL = 'https://api.freighttiger.com/api/journey-snapshot/v1/journeys/search'
const DESK_TOKEN = process.env.DESK_API_TOKEN
const DESK_REFRESH_TOKEN = process.env.DESK_REFRESH_TOKEN
const COUNT_API_TOKEN = process.env.COUNT_API_TOKEN
const TOKEN = DESK_TOKEN || COUNT_API_TOKEN
const AUTH_BASE_URL = process.env.FT_AUTH_BASE_URL || 'https://api.freighttiger.com'
const CONNECTION_STRING = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING
const MAX_PAGE_LIMIT = Number(process.env.MAX_JOURNEY_PAGES || 1000)

const BASE_QUERY = {
  size: '200',
  entity_type: 'CNR',
  journey_status: 'BEFORE_ORIGIN',
  journey_direction: 'outbound',
  journey_stop_type: 'source',
  start_time_utc: '2025-12-29 18:30:00',
  end_time_utc: '2026-01-29 18:29:59'
}

const SORT_PARAMS = {
  'sort[sort_by]': 'created_at',
  'sort[sort_by_order]': 'DESC'
}

const MILESTONES = [
  'PLANNED',
  'BEFORE_ORIGIN',
  'AT_ORIGIN',
  'IN_TRANSIT',
  'AT_DESTINATION',
  'IN_RETURN',
  'AFTER_DESTINATION',
  'CLOSED'
]

const ACTIVE_ANALYTICS = ['delay_in_minutes']

const DEFAULT_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
}

const safeParseJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const buildUrl = (page) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  Object.entries(BASE_QUERY).forEach(([key, value]) => {
    params.set(key, value)
  })
  Object.entries(SORT_PARAMS).forEach(([key, value]) => {
    params.set(key, value)
  })
  MILESTONES.forEach((milestone) => params.append('milestones[]', milestone))
  ACTIVE_ANALYTICS.forEach((metric) => params.append('active_analytics[]', metric))
  return `${API_URL}?${params.toString()}`
}

const buildHeaders = (tokenValue) => ({
  ...DEFAULT_HEADERS,
  authorization: `Bearer ${tokenValue}`
})

async function refreshDeskToken() {
  if (!DESK_REFRESH_TOKEN || !DESK_TOKEN) {
    return null
  }

  const url = `${AUTH_BASE_URL}/api/authentication/v1/auth/refresh`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      token: DESK_TOKEN
    },
    body: JSON.stringify({
      refresh_token: DESK_REFRESH_TOKEN,
      app_id: 'web'
    })
  })

  const raw = await response.text()
  const payload = safeParseJson(raw)

  if (!response.ok) {
    throw new Error(payload?.message || `Desk token refresh failed (${response.status})`)
  }

  const authToken = payload?.auth_token || payload?.data?.auth_token
  const refreshToken = payload?.refresh_token || payload?.data?.refresh_token || DESK_REFRESH_TOKEN

  if (!authToken) {
    throw new Error('Desk refresh response did not include auth_token')
  }

  return { authToken, refreshToken }
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS journey_snapshot_pages (
      id BIGSERIAL PRIMARY KEY,
      page INT NOT NULL UNIQUE,
      response_payload JSONB NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function upsertSnapshot(client, page, payload, status, message = null) {
  await client.query(
    `
      INSERT INTO journey_snapshot_pages (page, response_payload, status, message)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (page) DO UPDATE
      SET response_payload = EXCLUDED.response_payload,
          status = EXCLUDED.status,
          message = EXCLUDED.message,
          fetched_at = NOW()
    `,
    [page, payload, status, message]
  )
}

async function fetchPage(page, headers) {
  const url = buildUrl(page)
  const response = await fetch(url, { method: 'GET', headers })
  const raw = await response.text()
  const parsed = safeParseJson(raw)
  return {
    status: response.status,
    payload: parsed ?? { raw },
    raw,
    statusText: response.statusText
  }
}

async function main() {
  if (!CONNECTION_STRING) {
    throw new Error('DATABASE_URL or PG_CONNECTION_STRING must be provided')
  }

  const client = new Client({ connectionString: CONNECTION_STRING })
  await client.connect()
  await ensureTable(client)

  let authToken = TOKEN
  if (!authToken) {
    throw new Error('DESK_API_TOKEN or COUNT_API_TOKEN must be set in the environment')
  }

  if (DESK_REFRESH_TOKEN && DESK_TOKEN) {
    try {
      const refreshed = await refreshDeskToken()
      if (refreshed?.authToken) {
        authToken = refreshed.authToken
        console.info('Using refreshed desk token for journey snapshot fetch')
      }
    } catch (error) {
      console.warn('Desk token refresh failed; falling back to existing token:', error?.message || error)
    }
  } else if (DESK_TOKEN) {
    console.info('Using desk token for journey snapshot fetch')
  }

  const headers = buildHeaders(authToken)
  let page = 1

  while (page <= MAX_PAGE_LIMIT) {
    console.info(`Fetching journey snapshot page ${page}`)
    const { status, payload, raw, statusText } = await fetchPage(page, headers)
    const responsePayload = payload ?? { raw }
    let insertStatus = 'SUCCESS'
    let message = null

    if (status === 400) {
      insertStatus = 'TERMINATED_400'
      message = payload?.message ?? statusText ?? 'Received HTTP 400'
      await upsertSnapshot(client, page, responsePayload, insertStatus, message)
      console.info('Received HTTP 400, stopping pagination at page', page)
      break
    }

    if (status !== 200) {
      insertStatus = 'ERROR'
      message = payload?.message ?? statusText ?? `HTTP ${status}`
      await upsertSnapshot(client, page, responsePayload, insertStatus, message)
      console.warn(`Non-200 (${status}) response for page ${page} - halting`)
      break
    }

    if (payload && payload.success === false) {
      insertStatus = 'ERROR'
      message = payload.message ?? 'API reported success=false'
      await upsertSnapshot(client, page, responsePayload, insertStatus, message)
      console.warn(`Page ${page} returned success:false - halting`)
      break
    }

    await upsertSnapshot(client, page, responsePayload, insertStatus, message)

    const journeys = payload?.data?.journey_data
    if (!Array.isArray(journeys) || journeys.length === 0) {
      console.info('No more journey data returned; stopping after page', page)
      break
    }

    page += 1

    if (page > MAX_PAGE_LIMIT) {
      console.warn(`Reached maximum page limit (${MAX_PAGE_LIMIT}); stopping early`)
    }
  }

  await client.end()
}

main()
  .then(() => console.info('Journey snapshot fetch complete'))
  .catch((error) => {
    console.error('Failed to fetch journey snapshots:', error)
    process.exit(1)
  })
