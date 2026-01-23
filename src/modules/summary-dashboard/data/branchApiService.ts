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

export interface BranchChildApiResponse {
  success: boolean
  data: Array<{
    fteid: string
    name: string
    short_code?: string | null
    old_branch_id?: number | null
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
export const fetchBranchChildren = async (): Promise<BranchOption[]> => {
  const childUrl = buildFtTmsUrl('/api/eqs/v1/company/get_child')
  const childParams = new URLSearchParams({
    page: '1',
    size: '300',
    q: ''
  })
  const childResponse = await ftTmsFetch(`${childUrl}?${childParams}`)
  const childResult: BranchChildApiResponse = await childResponse.json()

  if (childResult.success && childResult.data && childResult.data.length > 0) {
    return [
      { value: '', label: 'All Branches' },
      ...childResult.data.map(branch => ({
        value: branch.fteid,
        label: branch.name
      }))
    ]
  }

  return []
}

export const fetchBranches = async (): Promise<BranchOption[]> => {
  try {
    // Prefer EQS child branches (desk-token) for complete branch list
    const childBranches = await fetchBranchChildren()
    if (childBranches.length > 0) {
      return childBranches
    }

    // Fallback to company_fteid branch listing
    const companyInfo = await getCompanyInfo()
    if (!companyInfo) {
      console.warn('No company info available, using mock data')
      return MOCK_BRANCHES
    }

    const baseUrl = buildFtTmsUrl('/api/eqs/v1/branch')
    const params = new URLSearchParams({
      company_fteid: companyInfo.fteid,
      sort: '-updated_at'
    })

    const response = await ftTmsFetch(`${baseUrl}?${params}`)
    const result: BranchApiResponse = await response.json()

    if (result.success && result.data && result.data.length > 0) {
      return [
        { value: '', label: 'All Branches' },
        ...result.data
          .filter(branch => branch.status === 'active' || branch.status === 'ACTIVE')
          .map(branch => ({
            value: branch.fteid,
            label: branch.name
          }))
      ]
    }

    console.warn('API returned empty branch data, using mock data')
    return MOCK_BRANCHES
  } catch (error) {
    console.error('Error fetching branches:', error)
    return MOCK_BRANCHES
  }
}
