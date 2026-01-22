import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { getCompanyInfo } from './companyApiService'

export interface BranchOption {
  value: string
  label: string
}

export interface BranchApiResponse {
  success: boolean
  data: Array<{
    fteid: string
    name: string
    branch_code: string
    status: string
    created_at: number
    updated_at: number
  }>
}

const MOCK_BRANCHES: BranchOption[] = [
  { value: '', label: 'All Branches' },
  { value: 'BRN-001', label: 'Main Branch, Mumbai' },
  { value: 'BRN-002', label: 'Delhi Branch' },
  { value: 'BRN-003', label: 'Bangalore Branch' },
  { value: 'BRN-004', label: 'Chennai Branch' },
]

/**
 * Fetch branches from the API for the current user's company
 */
export const fetchBranches = async (): Promise<BranchOption[]> => {
  try {
    // Get current user's company info
    const companyInfo = await getCompanyInfo()

    if (!companyInfo) {
      console.warn('No company info available, using mock data')
      return MOCK_BRANCHES
    }

    const baseUrl = buildFtTmsUrl('/eqs/v1/branch')
    const params = new URLSearchParams({
      company_fteid: companyInfo.fteid,
      sort: '-updated_at'
    })

    const response = await ftTmsFetch(`${baseUrl}?${params}`)
    const result: BranchApiResponse = await response.json()

    if (result.success && result.data && result.data.length > 0) {
      const branchOptions: BranchOption[] = [
        { value: '', label: 'All Branches' },
        ...result.data
          .filter(branch => branch.status === 'active' || branch.status === 'ACTIVE')
          .map(branch => ({
            value: branch.fteid,
            label: branch.name
          }))
      ]
      return branchOptions
    } else {
      console.warn('API returned empty branch data, using mock data')
      return MOCK_BRANCHES
    }
  } catch (error) {
    console.error('Error fetching branches:', error)
    return MOCK_BRANCHES
  }
}
