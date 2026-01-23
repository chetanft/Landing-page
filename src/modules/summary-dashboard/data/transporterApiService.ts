import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { getCompanyInfo } from './companyApiService'

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

/**
 * Fetch transporters from the API
 * @param ptlOnly - Whether to fetch only PTL transporters (for shipments)
 */
export const fetchTransporters = async (ptlOnly = false): Promise<TransporterOption[]> => {
  try {
    // Get current user's company info
    const companyInfo = await getCompanyInfo()

    if (!companyInfo) {
      throw new Error('No company info available for transporter fetch')
    }

    const baseUrl = buildFtTmsUrl('/api/eqs/v1/company/partners')
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
    throw error
  }
}
