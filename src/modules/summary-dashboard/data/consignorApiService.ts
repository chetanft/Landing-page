import { buildFtTmsUrl, ftTmsFetch } from './ftTmsClient'
import { fetchBranchChildren } from './branchApiService'
import { getCompanyInfo } from './companyApiService'

export interface ConsignorOption {
  value: string
  label: string
}

export const fetchConsignors = async (): Promise<ConsignorOption[]> => {
  try {
    const companyInfo = await getCompanyInfo()
    if (!companyInfo) {
      throw new Error('No company info available for consignor fetch')
    }

    const baseUrl = buildFtTmsUrl('/api/eqs/v1/company/partners')
    const params = new URLSearchParams({
      parent_fteid: companyInfo.fteid,
      filter: JSON.stringify({ partner_type: 'CNR' }),
      sort: '-updated_at',
      page: '1',
      size: '100',
      q: ''
    })

    const response = await ftTmsFetch(`${baseUrl}?${params}`)
    const result = await response.json() as {
      success: boolean
      data: Array<{
        fteid?: string
        name?: string
        branch_fteid?: string | null
        branch_name?: string | null
      }>
    }

    if (!result.success || !result.data || result.data.length === 0) {
      const fallbackBranches = await fetchBranchChildren()
      if (fallbackBranches.length > 0) {
        return fallbackBranches.map(branch => ({
          value: branch.value,
          label: branch.label
        }))
      }
      throw new Error('API returned empty consignor data')
    }

    const branches = new Map<string, string>()
    result.data.forEach((consignor) => {
      const value = consignor.branch_fteid || consignor.fteid
      if (!value) return
      const label = consignor.branch_name || consignor.name || value
      branches.set(value, label)
    })

    const consignorOptions = Array.from(branches.entries()).map(([value, label]) => ({
      value,
      label
    }))

    if (consignorOptions.length === 0) {
      const fallbackBranches = await fetchBranchChildren()
      if (fallbackBranches.length > 0) {
        return fallbackBranches.map(branch => ({
          value: branch.value,
          label: branch.label
        }))
      }
      throw new Error('No branches returned from consignor partners')
    }

    return consignorOptions
  } catch (error) {
    console.error('Error fetching consignors:', error)
    throw error
  }
}
