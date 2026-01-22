/**
 * Test script to verify journey API is working
 * Run with: node test-journey-api.js
 */

import { readFileSync } from 'fs'

// Load .env.local if it exists
let envVars = {}
try {
  const envContent = readFileSync('.env.local', 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      envVars[match[1].trim()] = match[2].trim()
    }
  })
} catch (e) {
  // .env.local not found, use process.env
}

const API_BASE_URL = envVars.FT_TMS_API_BASE_URL || process.env.FT_TMS_API_BASE_URL || 'http://localhost:5173/__ft_tms'
const API_TOKEN = envVars.FT_TMS_API_TOKEN || process.env.FT_TMS_API_TOKEN || ''

// Format dates for the API (match FT app format exactly)
const formatDateForApi = (date, isEnd = false) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = isEnd ? '18' : '18'
  const minutes = isEnd ? '29' : '30'
  const seconds = isEnd ? '59' : '00'
  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`
}

const testJourneyAPI = async () => {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 7) // Last 7 days
  
  const startTime = formatDateForApi(startDate, false)
  const endTime = formatDateForApi(today, true)

  const params = new URLSearchParams({
    page: '1',
    size: '20',
    entity_type: 'CNR',
    journey_status: 'IN_TRANSIT',
    start_time_utc: startTime,
    end_time_utc: endTime,
    journey_direction: 'outbound',
    journey_stop_type: 'source',
    'sort[sort_by]': 'created_at',
    'sort[sort_by_order]': 'DESC'
  })

  // Add milestones as array parameters
  const milestones = ['PLANNED', 'BEFORE_ORIGIN', 'AT_ORIGIN', 'IN_TRANSIT', 'AT_DESTINATION', 'IN_RETURN', 'AFTER_DESTINATION', 'CLOSED']
  milestones.forEach(milestone => {
    params.append('milestones[]', milestone)
  })

  // Add active alerts
  const activeAlerts = ['long_stoppage', 'route_deviation', 'eway_bill']
  activeAlerts.forEach(alert => {
    params.append('active_alerts[]', alert)
  })

  // Add active analytics
  const activeAnalytics = ['delay_in_minutes', 'expected_arrival']
  activeAnalytics.forEach(analytic => {
    params.append('active_analytics[]', analytic)
  })

  const url = `${API_BASE_URL}/journey-snapshot/v1/journeys/count?${params.toString()}`
  
  console.log('Testing Journey API...')
  console.log('URL:', url)
  console.log('Token:', API_TOKEN ? `${API_TOKEN.substring(0, 20)}...` : 'NOT SET')
  console.log('')

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }

  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include'
    })

    console.log('Response Status:', response.status, response.statusText)
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
    console.log('')

    const text = await response.text()
    console.log('Response Body:', text.substring(0, 500))
    console.log('')

    if (response.ok) {
      try {
        const data = JSON.parse(text)
        console.log('✅ API Call Successful!')
        console.log('Response Data:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.log('⚠️  Response is not valid JSON')
      }
    } else {
      console.log('❌ API Call Failed!')
      if (response.status === 401) {
        console.log('🔒 Authentication Error: Token may be missing, expired, or invalid')
      }
    }
  } catch (error) {
    console.error('❌ Error calling API:', error.message)
    console.error('Full error:', error)
  }
}

testJourneyAPI()
