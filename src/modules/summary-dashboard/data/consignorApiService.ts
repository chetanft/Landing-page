import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { getCompanyInfo } from './companyApiService'
import { JOURNEY_COUNT_ONLY_MODE } from '../config/apiMode'

export interface ConsignorOption {
  value: string
  label: string
}

export interface ConsignorApiResponse {
  success: boolean
  data: Array<{
    fteid: string
    name: string
    partner_type: string
    status: string
  }>
  total: number
  page: number
  size: number
}

const MOCK_CONSIGNORS: ConsignorOption[] = [
  { value: '', label: 'All Locations' },
  { value: 'MDC-001', label: 'MDC Labs, Amritsar' },
  { value: 'HUB-002', label: 'Hub Delhi' },
  { value: 'HUB-003', label: 'Hub Mumbai' },
  { value: 'HUB-004', label: 'Hub Bangalore' },
  { value: 'HUB-005', label: 'Hub Chennai' },
]

export const fetchConsignors = async (): Promise<ConsignorOption[]> => {
  if (JOURNEY_COUNT_ONLY_MODE) {
    return MOCK_CONSIGNORS
  }

  try {
    // Get current user's company info
    const companyInfo = await getCompanyInfo()

    if (!companyInfo) {
      console.warn('No company info available, using mock data')
      return MOCK_CONSIGNORS
    }

    const baseUrl = buildFtTmsUrl('/eqs/v1/company/partners')
    const params = new URLSearchParams({
      parent_fteid: companyInfo.fteid,
      filter: JSON.stringify({ partner_type: 'CNR' }),
      sort: '-updated_at',
      page: '1',
      size: '100',
      q: ''
    })

    const response = await ftTmsFetch(`${baseUrl}?${params}`)
    const result: ConsignorApiResponse = await response.json()

    if (result.success && result.data && result.data.length > 0) {
      const consignorOptions: ConsignorOption[] = [
        { value: '', label: 'All Locations' },
        ...result.data
          .filter(consignor => consignor.status === 'active' || consignor.status === 'ACTIVE')
          .map(consignor => ({
            value: consignor.fteid,
            label: consignor.name
          }))
      ]
      return consignorOptions
    } else {
      console.warn('API returned empty consignor data, using mock data')
      return MOCK_CONSIGNORS
    }
  } catch (error) {
    console.error('Error fetching consignors:', error)
    return MOCK_CONSIGNORS
  }
}
