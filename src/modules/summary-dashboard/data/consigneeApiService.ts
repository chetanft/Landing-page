import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { getCompanyInfo } from './companyApiService'

export interface ConsigneeOption {
  value: string
  label: string
}

export interface ConsigneeApiResponse {
  success: boolean
  data: Array<{
    fteid: string
    name: string
    partner_type: string
    status?: string | null
    is_active?: boolean
  }>
  total: number
  page: number
  size: number
}

export const fetchConsignees = async (): Promise<ConsigneeOption[]> => {
  try {
    const companyInfo = await getCompanyInfo()
    if (!companyInfo) {
      throw new Error('No company info available for consignee fetch')
    }

    const baseUrl = buildFtTmsUrl('/api/eqs/v1/company/partners')
    const params = new URLSearchParams({
      parent_fteid: companyInfo.fteid,
      filter: JSON.stringify({ partner_type: 'CEE' }),
      sort: '-updated_at',
      page: '1',
      size: '100',
      q: ''
    })

    const response = await ftTmsFetch(`${baseUrl}?${params}`)
    const result: ConsigneeApiResponse = await response.json()

    if (!result.success || !result.data) {
      throw new Error('API returned empty consignee data')
    }

    const rawConsignees = result.data
    const filteredConsignees = rawConsignees.filter((consignee) => {
      if (consignee.is_active === true) return true
      const status = String(consignee.status || '').toLowerCase()
      if (status === 'active') return true
      // If the API doesn't provide status fields, keep the record.
      return !consignee.status && typeof consignee.is_active !== 'boolean'
    })

    const finalConsignees = filteredConsignees.length > 0 ? filteredConsignees : rawConsignees
    if (import.meta.env.DEV && filteredConsignees.length === 0 && rawConsignees.length > 0) {
      console.warn('[fetchConsignees] No active status found; falling back to all consignees')
    }

    return finalConsignees.map((consignee) => ({
      value: consignee.fteid,
      label: consignee.name
    }))
  } catch (error) {
    console.error('Error fetching consignees:', error)
    throw error
  }
}
