import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { getCompanyInfo } from './companyApiService'
import { JOURNEY_COUNT_ONLY_MODE } from '../config/apiMode'

// Transporter API types
export interface TransporterData {
  fteid: string
  entity_type: string
  partner_type: string
  name: string
  short_code: string
  company_fteid: string
  company_name: string
  company_gstin: string | null
  company_head_office: string | null
  old_company_id: number
  branch_fteid: string | null
  branch_name: string | null
  old_branch_id: number | null
  department_fteid: string | null
  department_name: string | null
  old_department_id: number | null
  relation_types: string[]
  tags?: string[]
  contact_user: any
  place_fteid: string | null
  crm_type: string | null
  is_crm_supplier: boolean
  is_crm_transporter: boolean
  premium_from: string | null
  is_active: boolean
  created_at: number
  updated_at: number
  display_id: string
  created_by: {
    fteid: string
    firstname: string
    lastname: string
  }
  updated_by: {
    fteid: string
    firstname: string
    lastname: string
  } | null
}

export interface TransporterApiResponse {
  success: boolean
  data: TransporterData[]
  pagination: {
    current: number
    last: number
    size: number
    total: number
  }
}

export interface TransporterOption {
  value: string
  label: string
  fteid: string
}

const FALLBACK_TRANSPORTERS: TransporterOption[] = [
  { value: '', label: 'All Transporters', fteid: '' },
  { value: 'COM-41e26eae-0cc2-4cd6-bfb2-88b302b9a697', label: 'Vinod Transporter', fteid: 'COM-41e26eae-0cc2-4cd6-bfb2-88b302b9a697' },
  { value: 'COM-fad8704e-4a81-4c14-a76f-5512fe106e67', label: 'Deliverhawk Logistics-FTL', fteid: 'COM-fad8704e-4a81-4c14-a76f-5512fe106e67' },
  { value: 'BRH-3061df96-b47f-471e-8fa7-ca5a0ca0f397', label: 'SHRI RAMKEVAL TRANS CARGO-FTL', fteid: 'BRH-3061df96-b47f-471e-8fa7-ca5a0ca0f397' },
  { value: 'BRH-beb1573b-8d68-4d59-a215-18408368d9a5', label: 'RCM - FTL', fteid: 'BRH-beb1573b-8d68-4d59-a215-18408368d9a5' },
  { value: 'COM-6a262337-12e1-4cd4-9d56-4b0cca8f9c30', label: 'TCI - FTL', fteid: 'COM-6a262337-12e1-4cd4-9d56-4b0cca8f9c30' }
]

/**
 * Fetch transporters from the API
 * @param ptlOnly - Whether to fetch only PTL transporters (for shipments)
 */
export const fetchTransporters = async (ptlOnly = false): Promise<TransporterOption[]> => {
  if (JOURNEY_COUNT_ONLY_MODE) {
    return FALLBACK_TRANSPORTERS
  }

  try {
    // Get current user's company info
    const companyInfo = await getCompanyInfo()

    if (!companyInfo) {
      console.warn('No company info available, using mock data')
      return FALLBACK_TRANSPORTERS
    }

    const baseUrl = buildFtTmsUrl('/eqs/v1/company/partners')
    // Build filter object based on whether PTL transporters are needed
    const filterObj = ptlOnly
      ? { partner_type: 'TRN', tags: 'PTL' }
      : { partner_type: 'TRN' }

    const params = new URLSearchParams({
      parent_fteid: companyInfo.fteid,
      filter: JSON.stringify(filterObj),
      sort: '-updated_at',
      page: '1',
      size: '100',
      q: ''
    })

    const response = await ftTmsFetch(`${baseUrl}?${params.toString()}`)

    const data: TransporterApiResponse = await response.json()

    if (!data.success) {
      throw new Error('API returned failure status')
    }

    // Transform data to dropdown options
    const options: TransporterOption[] = data.data.map(transporter => ({
      value: transporter.fteid,
      label: transporter.name,
      fteid: transporter.fteid
    }))

    // Add "All Transporters" option at the beginning
    return [
      { value: '', label: 'All Transporters', fteid: '' },
      ...options
    ]

  } catch (error) {
    console.error('Failed to fetch transporters:', error)

    // Return fallback options with mock data based on the provided response
    return FALLBACK_TRANSPORTERS
  }
}
